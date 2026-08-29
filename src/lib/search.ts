import { destinations, getOperator, tours, type OfferCategory, type Tour } from "@/data/demo";
import { getHotel } from "@/lib/platform/catalog";
import {
  matchesQuery,
  normalizeSearchText,
  relevanceScore,
} from "@/lib/search-text";

/** Старые id из AI/seed → актуальные id каталога. */
const LEGACY_DESTINATION_IDS: Record<string, string> = {
  "dubai-beach": "uae",
  "dubai-city": "uae",
};

export function resolveDestinationId(id: string) {
  return LEGACY_DESTINATION_IDS[id] ?? id;
}

export function buildTourSearchHaystack(tour: Tour, hotel = getHotel(tour.hotelId)) {
  const operator = getOperator(tour.operatorId);
  const destination = destinations.find((d) => d.id === hotel.destinationId);
  return normalizeSearchText(
    [
      tour.title,
      tour.description,
      tour.meal,
      tour.from,
      "roomType" in tour ? tour.roomType : "",
      tour.offerCategory,
      hotel.name,
      hotel.city,
      hotel.country,
      hotel.district,
      destination?.country,
      destination?.city,
      operator?.name,
      tour.tags.join(" "),
      tour.includes?.join(" "),
      tour.transfer ? "трансфер transfer" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function matchesTextQuery(haystack: string, query: string) {
  return matchesQuery(haystack, query);
}

/** 0–100: насколько тур подходит текстовому запросу. */
export function textRelevanceScore(haystack: string, query: string) {
  return relevanceScore(haystack, query);
}

function matchesCityFilter(
  hotel: ReturnType<typeof getHotel>,
  city: string,
  destinationId: string,
) {
  if (!city) return true;
  const needle = normalizeSearchText(city);
  const fields = [
    hotel.city,
    hotel.district,
    hotel.name,
    hotel.country,
    destinations.find((d) => d.id === destinationId)?.city,
    destinations.find((d) => d.id === destinationId)?.country,
  ]
    .filter(Boolean)
    .map((v) => normalizeSearchText(String(v)));
  return fields.some((field) => field.includes(needle) || needle.includes(field));
}

export const originCities = [
  "Алматы",
  "Астана",
  "Ташкент",
  "Бишкек",
  "Москва",
  "Санкт-Петербург",
  "Шымкент",
  "Актау",
];

export type SortKey =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "match"
  | "rating"
  | "popular"
  | "new"
  | "premium"
  | "hot";

export type SearchParams = {
  from: string;
  destination: string; // destination id or ""
  city: string; // resort/city name or ""
  dateStart: string; // ISO or ""
  dateEnd: string;
  flexibleDates?: boolean;
  adults: number;
  children: number;
  childAges: number[];
  priceMin: number;
  priceMax: number;
  meals: string[];
  nights: string[]; // "1-3" | "4-7" | "8-14" | "14+"
  stars: number[];
  amenities: string[];
  rating: number; // 0 | 8 | 9
  offers: string[]; // hot | premium | sponsored
  sort: SortKey;
  q: string;
  category: "" | OfferCategory;
};

export const PRICE_MIN = 300000;
export const PRICE_MAX = 5000000;

const toArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v.length > 0) return v.split(",").filter(Boolean);
  return [];
};
const toNum = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const validateSearchParams = (search: Record<string, unknown>): SearchParams => ({
  from: typeof search["from"] === "string" ? search["from"] : "",
  destination: typeof search["destination"] === "string" ? search["destination"] : "",
  city: typeof search["city"] === "string" ? search["city"] : "",
  dateStart: typeof search["dateStart"] === "string" ? search["dateStart"] : "",
  dateEnd: typeof search["dateEnd"] === "string" ? search["dateEnd"] : "",
  flexibleDates:
    search["flexibleDates"] === false || search["flexibleDates"] === "false" ? false : true,
  adults: Math.max(1, Math.min(9, toNum(search["adults"], 2))),
  children: Math.max(0, Math.min(6, toNum(search["children"], 0))),
  childAges: toArray(search["childAges"]).map((a) => toNum(a, 7)),
  priceMin: toNum(search["priceMin"], PRICE_MIN),
  priceMax: toNum(search["priceMax"], PRICE_MAX),
  meals: toArray(search["meals"]),
  nights: toArray(search["nights"]),
  stars: toArray(search["stars"])
    .map((s) => toNum(s, 0))
    .filter(Boolean),
  amenities: toArray(search["amenities"]),
  rating: toNum(search["rating"], 0),
  offers: toArray(search["offers"]),
  sort: (typeof search["sort"] === "string" ? search["sort"] : "recommended") as SortKey,
  q: typeof search["q"] === "string" ? search["q"] : "",
  category: isOfferCategory(search["category"]) ? search["category"] : "",
});

function isOfferCategory(v: unknown): v is OfferCategory {
  return v === "tour" || v === "hotel" || v === "excursion" || v === "transfer";
}

const nightsInBucket = (n: number, bucket: string) => {
  if (bucket === "1-3") return n <= 3;
  if (bucket === "4-7") return n >= 4 && n <= 7;
  if (bucket === "8-14") return n >= 8 && n <= 14;
  if (bucket === "14+") return n > 14;
  return true;
};

export function filterTours(params: SearchParams, source: Tour[] = tours): Tour[] {
  const destinationId = params.destination ? resolveDestinationId(params.destination) : "";

  return source.filter((tour) => {
    const hotel = getHotel(tour.hotelId);
    if (params.from && tour.from !== params.from) return false;
    if (destinationId && hotel.destinationId !== destinationId) return false;
    if (!matchesCityFilter(hotel, params.city, hotel.destinationId)) return false;
    if (params.category) {
      if (tour.offerCategory !== params.category) return false;
    } else if (tour.offerCategory !== "tour") {
      return false;
    }
    if (
      params.q.trim() &&
      !matchesTextQuery(buildTourSearchHaystack(tour, hotel), params.q.trim())
    ) {
      return false;
    }
    if (params.adults > 0 && tour.adults > 0 && tour.adults < params.adults) return false;
    if (params.children > 0 && tour.children >= 0 && tour.children < params.children) return false;
    if (tour.price < params.priceMin || tour.price > params.priceMax) return false;
    if (params.meals.length && !params.meals.includes(tour.mealCode)) return false;
    if (params.nights.length && !params.nights.some((b) => nightsInBucket(tour.nights, b)))
      return false;
    if (params.stars.length && !params.stars.includes(hotel.stars)) return false;
    if (
      params.amenities.length &&
      !params.amenities.every((a) => {
        if (a === "Transfer") return tour.transfer || hotel.amenities.includes(a);
        return hotel.amenities.includes(a);
      })
    ) {
      return false;
    }
    if (params.rating && hotel.rating < params.rating) return false;
    if (params.offers.length && !params.offers.some((o) => tour.tags.includes(o as never)))
      return false;
    // ±7 дней гибкости по датам вылета (если flexibleDates; иначе почти точные ±1)
    const flex = (params as SearchParams & { flexibleDates?: boolean }).flexibleDates !== false;
    const window = flex ? 7 : 1;
    if (params.dateStart && tour.departure < shiftDays(params.dateStart, -window)) return false;
    if (params.dateEnd && tour.departure > shiftDays(params.dateEnd, window)) return false;
    return true;
  });
}

function shiftDays(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function sortTours(list: Tour[], sort: SortKey, weights?: Partial<RankingWeights>): Tour[] {
  const out = [...list];
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "rating":
      return out.sort((a, b) => getHotel(b.hotelId).rating - getHotel(a.hotelId).rating);
    case "popular":
      return out.sort((a, b) => b.bookings - a.bookings);
    case "new":
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "premium":
      return out.sort(
        (a, b) => Number(b.tags.includes("premium")) - Number(a.tags.includes("premium")),
      );
    case "hot":
      return out.sort((a, b) => Number(b.tags.includes("hot")) - Number(a.tags.includes("hot")));
    case "match":
      return out.sort((a, b) => rankingScore(b, weights) - rankingScore(a, weights));
    default:
      return out.sort((a, b) => rankingScore(b, weights) - rankingScore(a, weights));
  }
}

/** Из чего складывается место тура в выдаче. */
export type RankingWeights = {
  relevance: number;
  price: number;
  quality: number;
  rating: number;
  availability: number;
  conversion: number;
  freshness: number;
  sponsored: number;
  premium: number;
};

/**
 * Вес каждого слагаемого настраивается в админке.
 *
 * Раньше веса из конфига сводились к одному среднему множителю на весь балл —
 * то есть не меняли порядок вообще, сколько их ни крути. Теперь вес умножает
 * своё слагаемое: поднять «цену» действительно значит показывать дешёвое выше.
 */
export function rankingScore(t: Tour, weights?: Partial<RankingWeights>) {
  const hotel = getHotel(t.hotelId);
  const w = (key: keyof RankingWeights) => weights?.[key] ?? 1;

  const relevanceScore = (t.tags.includes("best") ? 24 : 12) * w("relevance");
  const priceScore = Math.max(0, 22 - t.price / 180000) * w("price");
  const qualityScore = hotel.stars * 3 * w("quality");
  const ratingScore = hotel.rating * 3 * w("rating");
  const availabilityScore = (t.transfer ? 6 : 3) * w("availability");
  const conversionScore = Math.min(10, t.bookings / 4) * w("conversion");
  const freshnessScore =
    Math.max(0, 8 - (Date.now() - new Date(t.createdAt).getTime()) / 86400000 / 45) *
    w("freshness");
  const sponsoredScore = (t.tags.includes("sponsored") ? 4 : 0) * w("sponsored");
  const premiumScore = (t.tags.includes("premium") ? 5 : 0) * w("premium");

  return (
    relevanceScore +
    priceScore +
    qualityScore +
    ratingScore +
    availabilityScore +
    conversionScore +
    freshnessScore +
    sponsoredScore +
    premiumScore
  );
}

export const destinationLabel = (id: string) => {
  const d = destinations.find((x) => x.id === id);
  return d ? d.country : "";
};

export const formatSearchDates = (start: string, end: string) => {
  if (!start) return "Любые даты";
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const s = new Date(start);
  if (!end) return fmt.format(s);
  const e = new Date(end);
  return `${fmt.format(s).replace(/\s\S+$/, "")}–${fmt.format(e)}`;
};

const adultsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "взрослый" : "взрослых");
const childrenWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ребёнок";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "ребёнка";
  return "детей";
};

export const guestsSummary = (adults: number, children: number) =>
  children > 0
    ? `${adults} ${adultsWord(adults)} + ${children} ${childrenWord(children)}`
    : `${adults} ${adultsWord(adults)}`;

/** Search params that should be forwarded from home page search to /search */
export const toSearchLink = (p: Partial<SearchParams>) => {
  const out: Record<string, string> = {};
  Object.entries(p).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      if (v.length) out[k] = v.join(",");
      return;
    }
    out[k] = String(v);
  });
  return out;
};
