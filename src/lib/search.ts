import {
  destinations,
  getHotel,
  tours,
  type Tour,
} from "@/data/demo";

export const originCities = ["Алматы", "Астана", "Шымкент", "Актау", "Атырау", "Караганда"];

export type SortKey = "recommended" | "price-asc" | "price-desc" | "rating" | "popular" | "new";

export type SearchParams = {
  from: string;
  destination: string; // destination id or ""
  city: string; // resort/city name or ""
  dateStart: string; // ISO or ""
  dateEnd: string;
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
  adults: Math.max(1, Math.min(9, toNum(search["adults"], 2))),
  children: Math.max(0, Math.min(6, toNum(search["children"], 0))),
  childAges: toArray(search["childAges"]).map((a) => toNum(a, 7)),
  priceMin: toNum(search["priceMin"], PRICE_MIN),
  priceMax: toNum(search["priceMax"], PRICE_MAX),
  meals: toArray(search["meals"]),
  nights: toArray(search["nights"]),
  stars: toArray(search["stars"]).map((s) => toNum(s, 0)).filter(Boolean),
  amenities: toArray(search["amenities"]),
  rating: toNum(search["rating"], 0),
  offers: toArray(search["offers"]),
  sort: (typeof search["sort"] === "string" ? search["sort"] : "recommended") as SortKey,
});

const nightsInBucket = (n: number, bucket: string) => {
  if (bucket === "1-3") return n <= 3;
  if (bucket === "4-7") return n >= 4 && n <= 7;
  if (bucket === "8-14") return n >= 8 && n <= 14;
  if (bucket === "14+") return n > 14;
  return true;
};

export function filterTours(params: SearchParams, source: Tour[] = tours): Tour[] {
  return source.filter((tour) => {
    const hotel = getHotel(tour.hotelId);
    if (params.from && tour.from !== params.from) return false;
    if (params.destination && hotel.destinationId !== params.destination) return false;
    if (params.city && hotel.city !== params.city) return false;
    if (tour.price < params.priceMin || tour.price > params.priceMax) return false;
    if (params.meals.length && !params.meals.includes(tour.mealCode)) return false;
    if (params.nights.length && !params.nights.some((b) => nightsInBucket(tour.nights, b)))
      return false;
    if (params.stars.length && !params.stars.includes(hotel.stars)) return false;
    if (params.amenities.length && !params.amenities.every((a) => hotel.amenities.includes(a)))
      return false;
    if (params.rating && hotel.rating < params.rating) return false;
    if (params.offers.length && !params.offers.some((o) => tour.tags.includes(o as never)))
      return false;
    // ±7 дней гибкости по датам вылета
    if (params.dateStart && tour.departure < shiftDays(params.dateStart, -7)) return false;
    if (params.dateEnd && tour.departure > shiftDays(params.dateEnd, 7)) return false;
    return true;
  });
}

function shiftDays(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function sortTours(list: Tour[], sort: SortKey): Tour[] {
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
    default:
      return out.sort((a, b) => {
        const score = (t: Tour) =>
          (t.tags.includes("sponsored") ? 3 : 0) +
          (t.tags.includes("best") ? 2 : 0) +
          getHotel(t.hotelId).rating / 10;
        return score(b) - score(a);
      });
  }
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

export const guestsSummary = (adults: number, children: number) =>
  children > 0
    ? `${adults} взрослых + ${children} ${children === 1 ? "ребёнок" : "детей"}`
    : `${adults} взрослых`;

/** Search params that should be forwarded from home page search to /search */
export const toSearchLink = (p: Partial<SearchParams>) => {
  const out: Record<string, string> = {};
  Object.entries(p).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" ) return;
    if (Array.isArray(v)) {
      if (v.length) out[k] = v.join(",");
      return;
    }
    out[k] = String(v);
  });
  return out;
};