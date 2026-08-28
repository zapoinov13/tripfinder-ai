/**
 * SEO: единый способ описать страницу для поиска и мессенджеров.
 *
 * Раньше каждый маршрут собирал мета-теги вручную: где-то был только title,
 * где-то забыли описание, canonical не было нигде, а og:url всегда указывал на
 * главную. Для поисковика это значит «одна и та же страница по десяти адресам»
 * — дубли, размытый вес и случайный сниппет в выдаче.
 *
 * Здесь одна функция собирает полный набор: title, описание, canonical, Open
 * Graph и Twitter. Страницы личного кабинета помечаются noindex — им в выдаче
 * делать нечего, а краулинговый бюджет они съедают.
 */

/**
 * Домен сайта из переменной окружения VITE_SITE_URL.
 *
 * Угадывать домен нельзя: canonical на чужой адрес — это просьба к поисковику
 * склеить наши страницы с чужим сайтом. Поэтому пока переменная не задана,
 * адреса остаются относительными: «/about» краулер разрешает относительно того
 * домена, с которого страницу и получил, — всегда верно, на любом окружении.
 * Задайте VITE_SITE_URL в Vercel, и все адреса станут абсолютными.
 */
export const SITE_URL = ((import.meta.env["VITE_SITE_URL"] as string | undefined) ?? "").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "TourGo";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.png`;

/** Адрес страницы: абсолютный, если домен известен, иначе относительный. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Описание в сниппете обрезается около 160 символов — режем по словам. */
export function clampDescription(text: string, limit = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : limit).trimEnd()}…`;
}

export type SeoInput = {
  title: string;
  description: string;
  /** Путь страницы: «/company/abc». Обязателен — из него canonical и og:url. */
  path: string;
  image?: string;
  /** website для витрин, article для текстов, product для предложения. */
  type?: "website" | "article" | "product";
  /** Кабинеты, корзины и служебные экраны в индекс не пускаем. */
  noindex?: boolean;
};

type MetaTag = Record<string, string>;
type LinkTag = Record<string, string>;

/** Полный набор мета-тегов и canonical для страницы. */
export function seo(input: SeoInput): { meta: MetaTag[]; links: LinkTag[] } {
  const title = input.title.includes(SITE_NAME) ? input.title : `${input.title} · ${SITE_NAME}`;
  const description = clampDescription(input.description);
  const url = absoluteUrl(input.path);
  const image = input.image ?? DEFAULT_OG_IMAGE;

  const meta: MetaTag[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:image", content: image },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];

  if (input.noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  } else {
    // max-image-preview:large включает крупную картинку в выдаче Google.
    meta.push({ name: "robots", content: "index, follow, max-image-preview:large" });
  }

  return { meta, links: [{ rel: "canonical", href: url }] };
}

/** Мета для приватной страницы: заголовок есть, индексации нет. */
export function privatePage(title: string): { meta: MetaTag[] } {
  return {
    meta: [
      { title: title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  };
}

/** Скрипт с JSON-LD для head(): Google читает разметку прямо из HTML. */
export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    type: "application/ld+json",
    // Закрывающий тег внутри строки разорвал бы <script> — экранируем.
    children: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export type Crumb = { name: string; path: string };

/** Хлебные крошки для поисковика: путь до страницы прямо в выдаче. */
export function breadcrumbLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}
