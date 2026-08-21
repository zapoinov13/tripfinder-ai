import { hotels, mealLabel, type MealCode } from "@/data/demo";

import { appendAudit } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";
import type { Currency, PlatformTour } from "./types";

export type TourDraft = {
  destinationId: string;
  hotelId: string;
  fromCity: string;
  dateStart: string;
  dateEnd: string;
  nights: number;
  mealCode: MealCode;
  price: number;
  currency: Currency;
  availability: number;
  transfer: boolean;
  adults: number;
  children: number;
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

export function emptyDraft(destinationId = "uae"): TourDraft {
  const hotel = hotels.find((h) => h.destinationId === destinationId) ?? hotels[0]!;
  const start = new Date(Date.now() + 21 * 86400000);
  const end = new Date(start.getTime() + 7 * 86400000);
  return {
    destinationId,
    hotelId: hotel.id,
    fromCity: "Алматы",
    dateStart: start.toISOString().slice(0, 10),
    dateEnd: end.toISOString().slice(0, 10),
    nights: 7,
    mealCode: "AI",
    price: 1200000,
    currency: "KZT",
    availability: 10,
    transfer: true,
    adults: 2,
    children: 0,
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

export function publishTour(orgId: string, operatorId: string, draft: TourDraft) {
  const tour: PlatformTour = {
    id: uid(),
    hotelId: draft.hotelId,
    operatorId,
    from: draft.fromCity,
    nights: draft.nights,
    dateStart: humanDay(draft.dateStart),
    dateEnd: humanDay(draft.dateEnd),
    departure: draft.dateStart,
    mealCode: draft.mealCode,
    meal: mealLabel(draft.mealCode),
    price: draft.price,
    tags: [],
    adults: draft.adults,
    children: draft.children,
    transfer: draft.transfer,
    views: 0,
    bookings: 0,
    createdAt: nowIso(),
    externalId: draft.sourceUrl ?? "",
    roomType: "Standard",
    currency: draft.currency,
    availability: draft.availability,
    status: "active",
    lastSyncedAt: nowIso(),
    operatorOrgId: orgId,
  };

  setState((s) => ({ ...s, tours: [tour, ...s.tours] }));
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
