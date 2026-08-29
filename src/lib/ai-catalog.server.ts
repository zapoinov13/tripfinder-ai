/**
 * Что на платформе есть на самом деле — сводка для консультанта.
 *
 * Без неё модель отвечает «вообще»: советует Мальдивы, которых никто не
 * продаёт, и называет несуществующие компании. Человек идёт по совету, ничего
 * не находит и уходит — хуже, чем если бы консультанта не было. Поэтому в
 * промпт кладётся выжимка настоящего каталога, а модели прямо запрещено
 * выходить за её пределы.
 *
 * Сводка одна на всех и меняется редко, поэтому держим её в памяти сервера
 * несколько минут: иначе каждое сообщение в чате било бы в базу четырьмя
 * запросами.
 */
import { VERTICAL_SEO, type Vertical } from "@/lib/seo-keywords";

export type CatalogSummary = {
  /** Разделы, где реально есть что показать. */
  verticals: Array<{ vertical: Vertical; count: number }>;
  /** Куда летают: направления активных туров. */
  destinations: string[];
  /** Откуда вылет. */
  fromCities: string[];
  /** Города, где работают компании платформы. */
  cities: string[];
  /** Вилка цен на туры. */
  priceFrom: number | null;
  priceTo: number | null;
  currency: string;
  companies: number;
};

const EMPTY: CatalogSummary = {
  verticals: [],
  destinations: [],
  fromCities: [],
  cities: [],
  priceFrom: null,
  priceTo: null,
  currency: "KZT",
  companies: 0,
};

const CACHE_MS = 5 * 60_000;
let cache: { at: number; value: CatalogSummary } | null = null;

/** Уникальные непустые значения, сверху самые частые. */
function topValues(values: Array<string | null | undefined>, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

/**
 * @param fresh Пропустить кэш. Нужно проверке из админки: админ заводит
 * компанию и тут же жмёт «Проверить» — показать ему пятиминутной давности
 * ответ значит соврать.
 */
export async function readCatalogSummary(fresh = false): Promise<CatalogSummary> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin.server");
    const supabaseAdmin = getSupabaseAdmin();
    // `vertical_listings` и часть колонок вью появились после генерации типов
    // Database, поэтому к ним ходим через нетипизированный доступ — как это
    // уже сделано в platform/vertical-listings.ts.
    // Именно bind: без него `from` теряет свой объект и падает на `.rest`.
    const loose = supabaseAdmin.from.bind(supabaseAdmin) as unknown as (table: string) => {
      select(cols: string): {
        eq(col: string, value: string): PromiseLike<{ data: unknown }>;
      };
    };

    const [toursRes, listingsRes, orgsRes] = await Promise.all([
      supabaseAdmin
        .from("tour_offers")
        .select("price, currency, from_city, hotels(city, country)")
        .eq("status", "active")
        .limit(500),
      loose("vertical_listings").select("vertical").eq("status", "published"),
      loose("organizations_public").select("city, services").eq("status", "APPROVED"),
    ]);

    type TourRow = {
      price: number | null;
      currency: string | null;
      from_city: string | null;
      hotels: { city: string | null; country: string | null } | null;
    };
    const tours = (toursRes.data ?? []) as unknown as TourRow[];
    const prices = tours.map((t) => Number(t.price)).filter((p) => Number.isFinite(p) && p > 0);

    const verticals: CatalogSummary["verticals"] = [];
    if (tours.length) verticals.push({ vertical: "tours", count: tours.length });

    const listingRows = (listingsRes.data ?? []) as Array<{ vertical: string }>;
    const byVertical = new Map<string, number>();
    for (const row of listingRows)
      byVertical.set(row.vertical, (byVertical.get(row.vertical) ?? 0) + 1);
    // Названия разделов в базе и на сайте расходятся: «stay» — это «жильё».
    const LISTING_TO_VERTICAL: Record<string, Vertical> = {
      stay: "stays",
      car: "cars",
      sport: "sport",
    };
    for (const [key, count] of byVertical) {
      const vertical = LISTING_TO_VERTICAL[key];
      if (vertical) verticals.push({ vertical, count });
    }

    const orgs = (orgsRes.data ?? []) as Array<{ city: string | null; services: unknown }>;

    const value: CatalogSummary = {
      verticals,
      destinations: topValues(
        tours.map((t) => t.hotels?.city ?? t.hotels?.country ?? null),
        8,
      ),
      fromCities: topValues(
        tours.map((t) => t.from_city),
        5,
      ),
      cities: topValues(
        orgs.map((o) => o.city),
        8,
      ),
      priceFrom: prices.length ? Math.min(...prices) : null,
      priceTo: prices.length ? Math.max(...prices) : null,
      currency: tours.find((t) => t.currency)?.currency ?? "KZT",
      companies: orgs.length,
    };

    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    // Молчащая база не повод отключать консультанта: он просто будет
    // осторожнее и не станет называть конкретику.
    console.warn("[ai-catalog] сводка недоступна", err);
    return EMPTY;
  }
}

/** Сводка словами — её и читает модель. */
export function describeCatalog(summary: CatalogSummary): string {
  if (summary.verticals.length === 0 && summary.companies === 0) {
    return [
      "СОСТОЯНИЕ ПЛОЩАДКИ: каталог пока пуст — компании ещё не разместили предложения.",
      "Не называй конкретные туры, компании, цены и даты: их нет.",
      "Помоги человеку сформулировать, что он хочет, и предложи оставить заявку —",
      "её увидят все подходящие компании и ответят сами.",
    ].join(" ");
  }

  const lines: string[] = ["ЧТО ЕСТЬ НА ПЛОЩАДКЕ СЕЙЧАС (других предложений у нас нет):"];

  if (summary.verticals.length) {
    lines.push(
      `Разделы: ${summary.verticals
        .map((v) => `${VERTICAL_SEO[v.vertical].noun} — ${v.count}`)
        .join("; ")}.`,
    );
  }
  if (summary.destinations.length)
    lines.push(`Направления туров: ${summary.destinations.join(", ")}.`);
  if (summary.fromCities.length) lines.push(`Вылеты из городов: ${summary.fromCities.join(", ")}.`);
  if (summary.cities.length)
    lines.push(`Компании работают в городах: ${summary.cities.join(", ")}.`);
  if (summary.priceFrom !== null && summary.priceTo !== null) {
    lines.push(
      `Цены туров: от ${Math.round(summary.priceFrom)} до ${Math.round(summary.priceTo)} ${summary.currency}.`,
    );
  }
  if (summary.companies) lines.push(`Проверенных компаний: ${summary.companies}.`);

  return lines.join("\n");
}

/** Правила разговора. Отдельно от сводки: они не меняются от каталога. */
export const CONSULTANT_RULES = [
  "Ты консультант маркетплейса TourGo. Отвечай по-русски, коротко и по делу: 2–4 предложения.",
  "Опирайся только на список выше. Не выдумывай туры, компании, цены, отели и даты — если чего-то нет, так и скажи.",
  "Если данных о поездке не хватает, задай ОДИН уточняющий вопрос, а не список.",
  "Когда понял запрос — назови подходящий раздел площадки словами («посмотрите экскурсии») и коротко объясни, на что смотреть.",
  "Если подходящего нет, честно скажи об этом и предложи оставить заявку: её увидят компании и ответят сами.",
  "Не обещай бронирование, оплату, скидки и сроки — площадка соединяет с компаниями, договаривается человек с компанией.",
  "Не спрашивай телефон, почту и паспортные данные.",
].join("\n");
