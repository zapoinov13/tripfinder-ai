import { resolveSupabaseConfig } from "@/lib/supabase/config";
import type { PlatformTour } from "@/lib/platform/types";

/**
 * Данные для мета-тегов на сервере.
 *
 * Каталог живёт в браузерном сторе: на сервере есть только демо-набор из seed.
 * Значит для настоящей компании из базы SSR отдавал бы заголовок
 * «Туристическая компания · TourGo» — один и тот же для всех, и в выдаче такие
 * страницы неотличимы. Здесь страница на сервере забирает свою строку прямо из
 * публичных представлений Supabase: ключ публичный, данные и так открыты
 * анонимному посетителю.
 */

const REQUEST_TIMEOUT_MS = 2500;

async function selectOne<T>(table: string, id: string, columns: string): Promise<T | null> {
  const { url, publishableKey } = resolveSupabaseConfig();
  if (!url || !publishableKey) return null;

  const query = `${url}/rest/v1/${table}?select=${encodeURIComponent(columns)}&id=eq.${encodeURIComponent(id)}&limit=1`;
  try {
    // Мета-теги не стоят подвисшего ответа: лучше отдать общий заголовок.
    const response = await fetch(query, {
      headers: { apikey: publishableKey, authorization: `Bearer ${publishableKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as T[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export type PublicCompany = {
  id: string;
  name: string;
  city: string;
  country: string;
  about: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  services: string[] | null;
  languages: string[] | null;
};

export function fetchPublicCompany(id: string) {
  return selectOne<PublicCompany>(
    "organizations_public",
    id,
    "id,name,city,country,about,logo_url,cover_url,website,services,languages",
  );
}

/**
 * Предложение из базы в том же виде, в каком его держит стор.
 *
 * Без этого ссылка на реальный тур открывалась как «предложение не найдено»:
 * сервер знает только демо-каталог, а страница рендерится на сервере.
 */
export async function fetchPublicTour(id: string): Promise<PlatformTour | null> {
  const row = await selectOne<Record<string, unknown>>("tour_offers", id, "*");
  if (!row) return null;
  const str = (key: string, fallback = "") =>
    typeof row[key] === "string" ? (row[key] as string) : fallback;
  const num = (key: string, fallback = 0) =>
    typeof row[key] === "number" ? (row[key] as number) : Number(row[key] ?? fallback) || fallback;

  return {
    id: str("id"),
    hotelId: str("hotel_id"),
    operatorId: str("operator_id"),
    operatorOrgId: str("operator_org_id", `org-${str("operator_id")}`),
    offerCategory: "tour",
    from: str("from_city"),
    nights: num("nights"),
    dateStart: str("date_start"),
    dateEnd: str("date_end"),
    departure: str("departure", str("date_start")),
    mealCode: str("meal_code") as PlatformTour["mealCode"],
    meal: str("meal") as PlatformTour["meal"],
    price: num("price"),
    ...(row["old_price"] != null ? { oldPrice: num("old_price") } : {}),
    ...(row["premium_price"] != null ? { premiumPrice: num("premium_price") } : {}),
    tags: (Array.isArray(row["tags"]) ? row["tags"] : []) as PlatformTour["tags"],
    adults: num("adults", 2),
    children: num("children"),
    transfer: row["transfer"] === true,
    views: num("views"),
    bookings: num("bookings"),
    createdAt: str("created_at").slice(0, 10),
    externalId: str("external_id"),
    roomType: str("room_type"),
    currency: str("currency", "KZT") as PlatformTour["currency"],
    availability: num("availability"),
    status: str("status", "active") as PlatformTour["status"],
    lastSyncedAt: str("last_synced_at"),
  };
}
