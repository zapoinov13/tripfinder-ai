import { destinations } from "@/data/demo";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

/**
 * Карта сайта: список всего, что имеет смысл показывать в поиске.
 *
 * Статику можно было бы положить файлом, но компании и предложения появляются
 * каждый день, и вручную такой список никто обновлять не будет. Поэтому карта
 * собирается на лету из тех же публичных представлений, что читает сайт, и
 * держится в памяти час — краулер приходит редко, а лишний запрос к базе на
 * каждое обращение не нужен.
 */

const CACHE_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;
/** Больше 50 000 адресов в одном файле не допускает сам стандарт. */
const MAX_ROWS = 5000;

type Entry = { path: string; changefreq: string; priority: string; lastmod?: string };

const STATIC_PAGES: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/search", changefreq: "daily", priority: "0.9" },
  { path: "/destinations", changefreq: "weekly", priority: "0.8" },
  { path: "/excursions", changefreq: "daily", priority: "0.8" },
  { path: "/stays", changefreq: "daily", priority: "0.8" },
  { path: "/cars", changefreq: "daily", priority: "0.8" },
  { path: "/sport", changefreq: "daily", priority: "0.8" },
  { path: "/assistance", changefreq: "weekly", priority: "0.7" },
  { path: "/ai-search", changefreq: "weekly", priority: "0.6" },
  { path: "/premium", changefreq: "monthly", priority: "0.6" },
  { path: "/for-companies", changefreq: "monthly", priority: "0.7" },
  { path: "/company-signup", changefreq: "monthly", priority: "0.6" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/support", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (char) =>
    char === "<"
      ? "&lt;"
      : char === ">"
        ? "&gt;"
        : char === "&"
          ? "&amp;"
          : char === "'"
            ? "&apos;"
            : "&quot;",
  );

async function selectRows(table: string, query: string): Promise<Record<string, unknown>[]> {
  const { url, publishableKey } = resolveSupabaseConfig();
  if (!url || !publishableKey) return [];
  try {
    const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { apikey: publishableKey, authorization: `Bearer ${publishableKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    return (await response.json()) as Record<string, unknown>[];
  } catch {
    // База недоступна — отдаём хотя бы статические страницы, а не пустой файл.
    return [];
  }
}

async function collect(origin: string): Promise<string> {
  const entries: Entry[] = [
    ...STATIC_PAGES,
    ...destinations.map((d) => ({
      path: `/destination/${d.id}`,
      changefreq: "weekly",
      priority: "0.7",
    })),
  ];

  const [companies, tours] = await Promise.all([
    selectRows("organizations_public", `select=id,created_at&limit=${MAX_ROWS}`),
    selectRows("tour_offers", `select=id,last_synced_at&status=eq.active&limit=${MAX_ROWS}`),
  ]);

  for (const row of companies) {
    if (typeof row["id"] !== "string") continue;
    entries.push({
      path: `/company/${row["id"]}`,
      changefreq: "weekly",
      priority: "0.8",
      ...(typeof row["created_at"] === "string" ? { lastmod: row["created_at"].slice(0, 10) } : {}),
    });
  }
  for (const row of tours) {
    if (typeof row["id"] !== "string") continue;
    entries.push({
      path: `/tour/${row["id"]}`,
      changefreq: "daily",
      priority: "0.7",
      ...(typeof row["last_synced_at"] === "string"
        ? { lastmod: row["last_synced_at"].slice(0, 10) }
        : {}),
    });
  }

  const body = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(origin + entry.path)}</loc>\n` +
        (entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>\n` : "") +
        `    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

let cache: { at: number; origin: string; xml: string } | null = null;

/** XML карты сайта для указанного домена. */
export async function buildSitemap(origin: string): Promise<string> {
  if (cache && cache.origin === origin && Date.now() - cache.at < CACHE_MS) return cache.xml;
  const xml = await collect(origin);
  cache = { at: Date.now(), origin, xml };
  return xml;
}

/**
 * robots.txt отдаём тоже с сервера.
 *
 * Строка Sitemap требует абсолютного адреса, а домен у деплоя может быть любым
 * (превью, боевой, свой купленный). Берём его из самого запроса — тогда файл
 * верен всегда и не надо ничего править при переезде.
 */
export function buildRobots(origin: string): string {
  return [
    "# TourGo — маркетплейс поездок.",
    "# Витрины и карточки открыты, личные кабинеты закрыты: краулинговый бюджет",
    "# должен уходить на страницы, которые кто-то может найти в поиске.",
    "",
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /operator",
    "Disallow: /profile",
    "Disallow: /request",
    "Disallow: /notifications",
    "Disallow: /favorites",
    "Disallow: /compare",
    "Disallow: /login",
    "Disallow: /registration",
    "Disallow: /_serverFn",
    "",
    "# Сортировки плодят одинаковые страницы: canonical ведёт на чистый адрес,",
    "# но краулеру туда ходить незачем.",
    "Disallow: /*?sort=",
    "Disallow: /*?page=",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}
