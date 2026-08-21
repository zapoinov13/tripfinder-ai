import {
  AMENITIES,
  destinations,
  hotels,
  mealLabel,
  mealOptions,
  type Amenity,
  type Hotel,
  type MealCode,
  type TourTag,
} from "@/data/demo";

import { appendAudit } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";
import type { Currency, PlatformTour } from "./types";

export const roomTypeOptions = ["Standard", "Superior", "Deluxe", "Family", "Suite"];

export const extraIncludeOptions = [
  { key: "flight", label: "Перелёт" },
  { key: "transfer", label: "Трансфер аэропорт - отель" },
  { key: "insurance", label: "Страховка" },
  { key: "visa", label: "Виза" },
  { key: "excursions", label: "Экскурсии" },
] as const;

export type ExtraIncludeKey = (typeof extraIncludeOptions)[number]["key"];

export type TourDraft = {
  destinationId: string;
  hotelId: string;
  customHotel: boolean;
  hotelName: string;
  hotelStars: number;
  district: string;
  beachLine: 1 | 2 | 3;
  distanceToSea: number;
  amenities: Amenity[];
  fromCity: string;
  dateStart: string;
  dateEnd: string;
  nights: number;
  mealCode: MealCode;
  roomType: string;
  price: number;
  oldPrice: number;
  currency: Currency;
  availability: number;
  extras: Record<ExtraIncludeKey, boolean>;
  adults: number;
  children: number;
  title: string;
  description: string;
  excludes: string;
  photos: string[];
  videos: string[];
  hotDeal: boolean;
  sourceUrl?: string;
};

const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const humanDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
};

export function mealIncludes(code: MealCode) {
  if (code === "RO") return [];
  if (code === "BB") return ["Завтрак"];
  if (code === "HB") return ["Завтрак", "Ужин"];
  return ["Завтрак", "Обед", "Ужин"];
}

export function includesFromDraft(draft: TourDraft) {
  const meal = mealOptions.find((m) => m.code === draft.mealCode);
  const items = [meal ? `${meal.label}: ${meal.hint}` : mealLabel(draft.mealCode)];
  extraIncludeOptions.forEach((item) => {
    if (draft.extras[item.key]) items.push(item.label);
  });
  return items;
}

export function emptyDraft(destinationId = "uae"): TourDraft {
  const hotel = hotels.find((h) => h.destinationId === destinationId) ?? hotels[0]!;
  const start = new Date(Date.now() + 21 * 86400000);
  const end = new Date(start.getTime() + 7 * 86400000);
  return {
    destinationId,
    hotelId: hotel.id,
    customHotel: false,
    hotelName: hotel.name,
    hotelStars: hotel.stars,
    district: hotel.district,
    beachLine: hotel.beachLine,
    distanceToSea: hotel.distanceToSea,
    amenities: hotel.amenities.filter((a): a is Amenity =>
      (AMENITIES as readonly string[]).includes(a),
    ),
    fromCity: "Алматы",
    dateStart: start.toISOString().slice(0, 10),
    dateEnd: end.toISOString().slice(0, 10),
    nights: 7,
    mealCode: "AI",
    roomType: "Standard",
    price: 1200000,
    oldPrice: 0,
    currency: "KZT",
    availability: 10,
    extras: {
      flight: true,
      transfer: true,
      insurance: false,
      visa: false,
      excursions: false,
    },
    adults: 2,
    children: 0,
    title: "",
    description: "",
    excludes: "",
    photos: hotel.image ? [hotel.image] : [],
    videos: [],
    hotDeal: false,
  };
}

export function applyHotelToDraft(draft: TourDraft, hotel: Hotel): TourDraft {
  return {
    ...draft,
    hotelId: hotel.id,
    destinationId: hotel.destinationId,
    customHotel: false,
    hotelName: hotel.name,
    hotelStars: hotel.stars,
    district: hotel.district,
    beachLine: hotel.beachLine,
    distanceToSea: hotel.distanceToSea,
    amenities: hotel.amenities.filter((a): a is Amenity =>
      (AMENITIES as readonly string[]).includes(a),
    ),
    photos: draft.photos.length ? draft.photos : hotel.image ? [hotel.image] : [],
  };
}

/**
 * Мок разбора страницы тура: реальный парсер появится вместе с интеграцией,
 * поэтому сейчас берём отель из каталога и заполняем поля значениями по умолчанию,
 * а турфирма обязательно проверяет их перед публикацией.
 */
export function draftFromUrl(url: string): { draft: TourDraft; fields: string[] } {
  const lower = url.toLowerCase();
  const destinationId = lower.includes("turk")
    ? "turkey"
    : lower.includes("thai")
      ? "thailand"
      : lower.includes("egypt")
        ? "egypt"
        : "uae";
  const draft = emptyDraft(destinationId);
  const nightsMatch = lower.match(/(\d{1,2})\s*(?:night|noch|ноч)/);
  const priceMatch = lower.match(/(\d{6,8})/);
  const nights = nightsMatch ? Number(nightsMatch[1]) : draft.nights;

  return {
    draft: {
      ...draft,
      nights,
      dateEnd: new Date(new Date(draft.dateStart).getTime() + nights * 86400000)
        .toISOString()
        .slice(0, 10),
      ...(priceMatch ? { price: Number(priceMatch[1]) } : {}),
      sourceUrl: url,
    },
    fields: ["название", "отель", "даты", "питание", "цена", "трансфер"],
  };
}

function resolveHotel(draft: TourDraft): Hotel {
  const dest = destinations.find((d) => d.id === draft.destinationId) ?? destinations[0]!;
  const catalog = hotels.find((h) => h.id === draft.hotelId);
  if (!draft.customHotel && catalog) {
    return {
      ...catalog,
      name: draft.hotelName.trim() || catalog.name,
      stars: draft.hotelStars,
      district: draft.district.trim() || catalog.district,
      beachLine: draft.beachLine,
      distanceToSea: draft.distanceToSea,
      amenities: draft.amenities.length ? draft.amenities : catalog.amenities,
      image: draft.photos[0] || catalog.image,
    };
  }

  return {
    id: `hotel-custom-${uid()}`,
    name: draft.hotelName.trim() || "Отель",
    destinationId: dest.id,
    city: dest.city,
    country: dest.country,
    flag: dest.flag,
    stars: draft.hotelStars,
    rating: 8.4,
    reviews: 0,
    district: draft.district.trim() || dest.city,
    beachLine: draft.beachLine,
    distanceToSea: draft.distanceToSea,
    amenities: draft.amenities,
    image: draft.photos[0] || dest.image,
  };
}

export function publishTour(orgId: string, operatorId: string, draft: TourDraft) {
  const hotel = resolveHotel(draft);
  const tags: TourTag[] = draft.hotDeal ? ["hot"] : [];
  const excludes = draft.excludes
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tour: PlatformTour = {
    id: uid(),
    hotelId: hotel.id,
    operatorId,
    offerCategory: "tour",
    from: draft.fromCity,
    nights: draft.nights,
    dateStart: humanDay(draft.dateStart),
    dateEnd: humanDay(draft.dateEnd),
    departure: draft.dateStart,
    mealCode: draft.mealCode,
    meal: mealLabel(draft.mealCode),
    price: draft.price,
    ...(draft.oldPrice > draft.price ? { oldPrice: draft.oldPrice } : {}),
    tags,
    adults: draft.adults,
    children: draft.children,
    transfer: draft.extras.transfer,
    views: 0,
    bookings: 0,
    createdAt: nowIso(),
    externalId: draft.sourceUrl ?? "",
    roomType: draft.roomType,
    currency: draft.currency,
    availability: draft.availability,
    status: "active",
    lastSyncedAt: nowIso(),
    operatorOrgId: orgId,
    title: draft.title.trim() || hotel.name,
    description: draft.description.trim(),
    photos: draft.photos,
    videos: draft.videos,
    includes: includesFromDraft(draft),
    excludes,
    flightIncluded: draft.extras.flight,
    insuranceIncluded: draft.extras.insurance,
    visaIncluded: draft.extras.visa,
  };

  setState((s) => {
    const hotelsNext = s.hotels.some((h) => h.id === hotel.id)
      ? s.hotels.map((h) => (h.id === hotel.id && draft.customHotel ? hotel : h))
      : [hotel, ...s.hotels];
    return { ...s, hotels: hotelsNext, tours: [tour, ...s.tours] };
  });
  appendAudit({
    action: "tour_published",
    entityType: "tour_offer",
    entityId: tour.id,
    meta: { orgId, source: draft.sourceUrl ? "url" : "manual" },
  });
  return tour;
}

export function operatorIdForOrg(orgId: string) {
  const state = getState();
  const existing = state.tours.find((t) => t.operatorOrgId === orgId);
  if (existing) return existing.operatorId;
  const org = state.organizations.find((o) => o.id === orgId);
  const byName = state.operators.find((o) => o.name === org?.name);
  return byName?.id ?? state.operators[0]?.id ?? "op-1";
}
