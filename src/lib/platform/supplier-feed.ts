import { destinations, mealLabel, type MealCode, type TourTag } from "@/data/demo";
import { normalizeMealType } from "@/lib/platform-contracts";

import { appendAudit } from "./catalog";
import { operatorIdForOrg } from "./tour-editor";
import { getState, nowIso, setState, uid } from "./store";
import type { Currency, PlatformTour } from "./types";

/** TourGo Supplier Feed v1. companies export this from their system. */
export type SupplierFeedItem = {
  external_id: string;
  title: string;
  hotel_name: string;
  price: number;
  currency?: Currency;
  destination?: string;
  country?: string;
  city?: string;
  from_city?: string;
  nights?: number;
  meal?: string;
  room_type?: string;
  date_start?: string;
  date_end?: string;
  availability?: number;
  status?: "active" | "archived" | "draft";
  old_price?: number;
  description?: string;
  photos?: string[];
  videos?: string[];
  includes?: string[];
  excludes?: string[];
  flight?: boolean;
  transfer?: boolean;
  insurance?: boolean;
  visa?: boolean;
  hot_deal?: boolean;
};

export type SupplierFeedDocument = {
  version: 1;
  currency?: Currency;
  updated_at?: string;
  tours: SupplierFeedItem[];
};

export type FeedApplyResult = {
  imported: number;
  updated: number;
  archived: number;
  skipped: number;
  errors: string[];
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

function humanDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
}

function resolveDestinationId(item: SupplierFeedItem): string {
  const hay = `${item.destination ?? ""} ${item.country ?? ""} ${item.city ?? ""} ${item.title}`.toLowerCase();
  const hit = destinations.find(
    (d) =>
      hay.includes(d.id) ||
      hay.includes(d.country.toLowerCase()) ||
      hay.includes(d.city.toLowerCase()),
  );
  return hit?.id ?? "uae";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return out.length ? out : undefined;
}

function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function normalizeItem(raw: unknown, fallbackCurrency: Currency): SupplierFeedItem | null {
  if (!isRecord(raw)) return null;
  const external_id = asString(raw.external_id) ?? asString(raw.externalId) ?? asString(raw.id);
  const title = asString(raw.title) ?? asString(raw.name);
  const hotel_name =
    asString(raw.hotel_name) ?? asString(raw.hotelName) ?? asString(raw.hotel) ?? title;
  const price = asNumber(raw.price);
  if (!external_id || !title || !hotel_name || price === undefined || price <= 0) return null;

  const currencyRaw = (asString(raw.currency) ?? fallbackCurrency).toUpperCase();
  const currency: Currency =
    currencyRaw === "USD" || currencyRaw === "EUR" || currencyRaw === "KZT"
      ? currencyRaw
      : fallbackCurrency;

  const statusRaw = (asString(raw.status) ?? "active").toLowerCase();
  const status: SupplierFeedItem["status"] =
    statusRaw === "archived" || statusRaw === "draft" || statusRaw === "active"
      ? statusRaw
      : "active";

  return {
    external_id,
    title,
    hotel_name,
    price,
    currency,
    destination: asString(raw.destination),
    country: asString(raw.country),
    city: asString(raw.city),
    from_city: asString(raw.from_city) ?? asString(raw.fromCity) ?? asString(raw.from),
    nights: asNumber(raw.nights),
    meal: asString(raw.meal) ?? asString(raw.meal_code) ?? asString(raw.mealCode),
    room_type: asString(raw.room_type) ?? asString(raw.roomType),
    date_start: asString(raw.date_start) ?? asString(raw.dateStart) ?? asString(raw.departure),
    date_end: asString(raw.date_end) ?? asString(raw.dateEnd),
    availability: asNumber(raw.availability) ?? asNumber(raw.seats),
    status,
    old_price: asNumber(raw.old_price) ?? asNumber(raw.oldPrice),
    description: asString(raw.description),
    photos: asStringArray(raw.photos) ?? asStringArray(raw.images),
    videos: asStringArray(raw.videos),
    includes: asStringArray(raw.includes),
    excludes: asStringArray(raw.excludes),
    flight: asBool(raw.flight) ?? asBool(raw.flight_included),
    transfer: asBool(raw.transfer),
    insurance: asBool(raw.insurance),
    visa: asBool(raw.visa),
    hot_deal: asBool(raw.hot_deal) ?? asBool(raw.hotDeal),
  };
}

/** Parse JSON feed (object with tours[] or bare array). */
export function parseSupplierFeed(input: unknown): {
  doc: SupplierFeedDocument;
  errors: string[];
} {
  const errors: string[] = [];
  let toursRaw: unknown[] = [];
  let currency: Currency = "KZT";
  let updated_at: string | undefined;

  if (Array.isArray(input)) {
    toursRaw = input;
  } else if (isRecord(input)) {
    const cur = asString(input.currency)?.toUpperCase();
    if (cur === "USD" || cur === "EUR" || cur === "KZT") currency = cur;
    updated_at = asString(input.updated_at) ?? asString(input.updatedAt);
    if (Array.isArray(input.tours)) toursRaw = input.tours;
    else if (Array.isArray(input.items)) toursRaw = input.items;
    else if (Array.isArray(input.data)) toursRaw = input.data;
    else errors.push("В JSON нет массива tours / items / data");
  } else {
    errors.push("Ожидался JSON-объект или массив туров");
  }

  const tours: SupplierFeedItem[] = [];
  toursRaw.forEach((row, i) => {
    const item = normalizeItem(row, currency);
    if (!item) {
      errors.push(`Строка ${i + 1}: нужны external_id, title, hotel_name и price > 0`);
      return;
    }
    tours.push(item);
  });

  return {
    doc: { version: 1, currency, ..(updated_at ? { updated_at } : {}), tours },
    errors,
  };
}

export function parseSupplierFeedJson(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { doc: { version: 1 as const, tours: [] }, errors: ["Некорректный JSON"] };
  }
  return parseSupplierFeed(parsed);
}

function toPlatformTour(
  orgId: string,
  operatorId: string,
  item: SupplierFeedItem,
  existing?: PlatformTour,
): PlatformTour {
  const destinationId = resolveDestinationId(item);
  const dest = destinations.find((d) => d.id === destinationId) ?? destinations[0]!;
  const mealCode = normalizeMealType(item.meal ?? "AI") as MealCode;
  const nights = item.nights && item.nights > 0 ? item.nights : existing?.nights ?? 7;
  const start =
    item.date_start ??
    existing?.departure ??
    new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  const end =
    item.date_end ??
    new Date(new Date(start).getTime() + nights * 86400000).toISOString().slice(0, 10);
  const tags: TourTag[] = item.hot_deal ? ["hot"] : existing?.tags.filter((t) => t !== "hot") ?? [];
  if (item.hot_deal && !tags.includes("hot")) tags.push("hot");

  const hotelId = existing?.hotelId ?? `hotel-feed-${uid()}`;
  const status =
    item.status === "archived" || item.status === "draft" ? "inactive" : "active";

  return {
    id: existing?.id ?? uid(),
    hotelId,
    operatorId,
    offerCategory: existing?.offerCategory ?? "tour",
    from: item.from_city ?? existing?.from ?? "Алматы",
    nights,
    dateStart: humanDay(start),
    dateEnd: humanDay(end),
    departure: start.slice(0, 10),
    mealCode,
    meal: mealLabel(mealCode),
    price: item.price,
    ..(item.old_price && item.old_price > item.price
      ? { oldPrice: item.old_price }
      : existing?.oldPrice
        ? { oldPrice: existing.oldPrice }
        : {}),
    tags,
    adults: existing?.adults ?? 2,
    children: existing?.children ?? 0,
    transfer: item.transfer ?? existing?.transfer ?? true,
    views: existing?.views ?? 0,
    bookings: existing?.bookings ?? 0,
    createdAt: existing?.createdAt ?? nowIso(),
    externalId: item.external_id,
    roomType: item.room_type ?? existing?.roomType ?? "Standard",
    currency: item.currency ?? existing?.currency ?? "KZT",
    availability: item.availability ?? existing?.availability ?? 10,
    status,
    lastSyncedAt: nowIso(),
    operatorOrgId: orgId,
    title: item.title,
    description: item.description ?? existing?.description ?? "",
    photos: item.photos?.length ? item.photos : existing?.photos ?? (dest.image ? [dest.image] : []),
    videos: item.videos ?? existing?.videos ?? [],
    includes: item.includes ?? existing?.includes ?? [],
    excludes: item.excludes ?? existing?.excludes ?? [],
    flightIncluded: item.flight ?? existing?.flightIncluded ?? true,
    insuranceIncluded: item.insurance ?? existing?.insuranceIncluded ?? false,
    visaIncluded: item.visa ?? existing?.visaIncluded ?? false,
  };
}

/** Upsert tours from a validated feed into the platform store. */
export function applySupplierFeed(orgId: string, doc: SupplierFeedDocument): FeedApplyResult {
  const operatorId = operatorIdForOrg(orgId);
  const state = getState();
  const byExternal = new Map(
    state.tours
      .filter((t) => t.operatorOrgId === orgId && t.externalId)
      .map((t) => [t.externalId, t] as const),
  );

  let imported = 0;
  let updated = 0;
  let archived = 0;
  const skipped = 0;
  const errors: string[] = [];
  const seen = new Set<string>();
  const nextTours = [..state.tours];
  const hotelPatches: { id: string; name: string; destinationId: string; image?: string }[] = [];

  for (const item of doc.tours) {
    if (seen.has(item.external_id)) {
      errors.push(`Дубликат external_id: ${item.external_id}`);
      continue;
    }
    seen.add(item.external_id);
    const existing = byExternal.get(item.external_id);
    const tour = toPlatformTour(orgId, operatorId, item, existing);
    if (tour.status === "inactive") archived += 1;
    if (existing) {
      const idx = nextTours.findIndex((t) => t.id === existing.id);
      if (idx >= 0) nextTours[idx] = tour;
      updated += 1;
    } else {
      nextTours.unshift(tour);
      imported += 1;
    }
    hotelPatches.push({
      id: tour.hotelId,
      name: item.hotel_name,
      destinationId: resolveDestinationId(item),
      image: tour.photos[0],
    });
  }

  setState((s) => {
    let hotels = [..s.hotels];
    for (const patch of hotelPatches) {
      const dest = destinations.find((d) => d.id === patch.destinationId) ?? destinations[0]!;
      const hi = hotels.findIndex((h) => h.id === patch.id);
      if (hi >= 0) {
        hotels[hi] = { ..hotels[hi]!, name: patch.name, image: patch.image || hotels[hi]!.image };
      } else {
        hotels = [
          {
            id: patch.id,
            name: patch.name,
            destinationId: dest.id,
            city: dest.city,
            country: dest.country,
            flag: dest.flag,
            stars: 4,
            rating: 8.2,
            reviews: 0,
            district: dest.city,
            beachLine: 2 as const,
            distanceToSea: 500,
            amenities: [],
            image: patch.image || dest.image,
          },
          ..hotels,
        ];
      }
    }
    return { ..s, tours: nextTours, hotels };
  });

  appendAudit({
    action: "supplier_feed_applied",
    entityType: "organization",
    entityId: orgId,
    meta: { imported, updated, archived, total: doc.tours.length },
  });

  return { imported, updated, archived, skipped, errors };
}

export const SUPPLIER_FEED_EXAMPLE: SupplierFeedDocument = {
  version: 1,
  currency: "KZT",
  updated_at: new Date().toISOString(),
  tours: [
    {
      external_id: "demo-dubai-ai-7",
      title: "Дубай · All Inclusive 7 ночей",
      hotel_name: "Rixos Premium Dubai",
      destination: "uae",
      country: "ОАЭ",
      city: "Дубай",
      from_city: "Алматы",
      nights: 7,
      meal: "AI",
      price: 1450000,
      old_price: 1680000,
      currency: "KZT",
      availability: 12,
      status: "active",
      transfer: true,
      flight: true,
      description: "Перелёт, трансфер и отель у моря.",
      photos: [],
    },
  ],
};
