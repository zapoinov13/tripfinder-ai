import { toast } from "sonner";

import { getHotel, mealLabel } from "@/data/demo";

import { appendAudit, pushNotification, trackEvent } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";
import type { Currency, RequestOffer, TripRequest, TripRequestKind } from "./types";

export const requestStatusLabel: Record<TripRequest["status"], string> = {
  NEW: "Заявка получена",
  IN_REVIEW: "Турфирмы рассматривают",
  OFFERS_RECEIVED: "Получены предложения",
  CHOSEN: "Вы выбрали предложение",
  CLOSED: "Заявка закрыта",
};

export const mealPlainLabel = (code: string) => {
  const map: Record<string, string> = {
    AI: "Всё включено",
    UAI: "Всё включено премиум",
    BB: "Завтраки",
    HB: "Завтраки и ужины",
    FB: "Трёхразовое питание",
    RO: "Без питания",
  };
  return map[code] ?? mealLabel(code as never) ?? code;
};

export function getUserRequests(userId: string) {
  return getState()
    .tripRequests.filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRequest(id: string) {
  return getState().tripRequests.find((r) => r.id === id);
}

export function getOffersForRequest(requestId: string) {
  return getState()
    .requestOffers.filter((o) => o.requestId === requestId)
    .sort((a, b) => a.price - b.price);
}

/** Заявки, которые турфирма ещё не отклонила и на которые ещё не ответила. */
export function getOpenRequestsForOrg(orgId: string) {
  const state = getState();
  return state.tripRequests
    .filter((r) => r.status !== "CHOSEN" && r.status !== "CLOSED")
    .filter((r) => !r.declinedByOrgIds.includes(orgId))
    .filter(
      (r) => !state.requestOffers.some((o) => o.requestId === r.id && o.organizationId === orgId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrgOffers(orgId: string) {
  return getState()
    .requestOffers.filter((o) => o.organizationId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createTripRequest(input: {
  userId: string;
  kind: TripRequestKind;
  fromCity: string;
  destinationId: string;
  destinationLabel: string;
  dateStart: string;
  dateEnd: string;
  adults: number;
  children: number;
  budget: number;
  currency?: Currency;
  wishes: string;
  contactName: string;
  contactPhone: string;
}) {
  const request: TripRequest = {
    id: uid(),
    userId: input.userId,
    kind: input.kind,
    fromCity: input.fromCity,
    destinationId: input.destinationId,
    destinationLabel: input.destinationLabel,
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
    adults: input.adults,
    children: input.children,
    budget: input.budget,
    currency: input.currency ?? "KZT",
    wishes: input.wishes,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    status: "NEW",
    declinedByOrgIds: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  setState((s) => ({ ...s, tripRequests: [request, ...s.tripRequests] }));

  const companies = approvedCompanies();
  companies.forEach((org) => {
    getState()
      .users.filter((u) => u.organizationId === org.id)
      .forEach((u) =>
        pushNotification(
          u.id,
          "new_request",
          "Новая заявка туриста",
          `${request.fromCity} → ${request.destinationLabel}, ${peopleLabel(request)}`,
          { requestId: request.id },
        ),
      );
  });

  appendAudit({
    actorId: input.userId,
    action: "trip_request_created",
    entityType: "trip_request",
    entityId: request.id,
    meta: { kind: request.kind, destination: request.destinationLabel },
  });
  trackEvent("REQUEST_CREATED", input.userId, { requestId: request.id, kind: request.kind });

  return request;
}

export function peopleLabel(request: Pick<TripRequest, "adults" | "children">) {
  const parts = [`${request.adults} взрослых`];
  if (request.children > 0) parts.push(`${request.children} ${childWord(request.children)}`);
  return parts.join(" + ");
}

function childWord(n: number) {
  if (n === 1) return "ребёнок";
  return "детей";
}

function approvedCompanies() {
  return getState().organizations.filter((o) => o.status === "APPROVED");
}

export function sendOffer(input: {
  requestId: string;
  organizationId: string;
  tourId?: string;
  hotelName: string;
  nights: number;
  meal: string;
  flightIncluded: boolean;
  transferIncluded: boolean;
  insuranceIncluded: boolean;
  price: number;
  currency?: Currency;
  includes: string;
  comment: string;
  actorId?: string;
}) {
  const offer: RequestOffer = {
    id: uid(),
    requestId: input.requestId,
    organizationId: input.organizationId,
    ...(input.tourId ? { tourId: input.tourId } : {}),
    hotelName: input.hotelName,
    nights: input.nights,
    meal: input.meal,
    flightIncluded: input.flightIncluded,
    transferIncluded: input.transferIncluded,
    insuranceIncluded: input.insuranceIncluded,
    price: input.price,
    currency: input.currency ?? "KZT",
    includes: input.includes,
    comment: input.comment,
    status: "SENT",
    createdAt: nowIso(),
  };

  setState((s) => ({
    ...s,
    requestOffers: [offer, ...s.requestOffers],
    tripRequests: s.tripRequests.map((r) =>
      r.id === input.requestId
        ? { ...r, status: "OFFERS_RECEIVED" as const, updatedAt: nowIso() }
        : r,
    ),
  }));

  const request = getRequest(input.requestId);
  const orgName =
    getState().organizations.find((o) => o.id === input.organizationId)?.name ?? "Турфирма";
  if (request) {
    pushNotification(
      request.userId,
      "new_offer",
      "Новое предложение по вашей заявке",
      `${orgName}: ${offer.hotelName}, ${offer.price.toLocaleString("ru-RU")} ${offer.currency}`,
      { requestId: request.id, offerId: offer.id },
    );
  }

  appendAudit({
    ...(input.actorId ? { actorId: input.actorId } : {}),
    action: "offer_sent",
    entityType: "request_offer",
    entityId: offer.id,
    meta: { requestId: input.requestId },
  });
  trackEvent("OFFER_SENT", input.actorId, { offerId: offer.id });

  return offer;
}

export function declineRequest(requestId: string, orgId: string) {
  setState((s) => ({
    ...s,
    tripRequests: s.tripRequests.map((r) =>
      r.id === requestId
        ? { ...r, declinedByOrgIds: [...r.declinedByOrgIds, orgId], updatedAt: nowIso() }
        : r,
    ),
  }));
  toast("Заявка скрыта из списка");
}

export function chooseOffer(requestId: string, offerId: string) {
  setState((s) => ({
    ...s,
    tripRequests: s.tripRequests.map((r) =>
      r.id === requestId
        ? { ...r, status: "CHOSEN" as const, chosenOfferId: offerId, updatedAt: nowIso() }
        : r,
    ),
    requestOffers: s.requestOffers.map((o) =>
      o.requestId === requestId
        ? { ...o, status: o.id === offerId ? ("CHOSEN" as const) : ("DECLINED" as const) }
        : o,
    ),
  }));

  const offer = getState().requestOffers.find((o) => o.id === offerId);
  if (offer) {
    getState()
      .users.filter((u) => u.organizationId === offer.organizationId)
      .forEach((u) =>
        pushNotification(u.id, "offer_chosen", "Турист выбрал ваше предложение", offer.hotelName, {
          requestId,
          offerId,
        }),
      );
  }
  appendAudit({
    action: "offer_chosen",
    entityType: "request_offer",
    entityId: offerId,
    meta: { requestId },
  });
  toast.success("Предложение выбрано, турфирма получила уведомление");
}

/**
 * Пока в TourGo нет живых турфирм: собираем предложения из реальных туров
 * проверенных компаний, чтобы турист увидел работающий сценарий целиком.
 */
export function collectOffersFromCatalog(requestId: string) {
  const request = getRequest(requestId);
  if (!request) return 0;

  const state = getState();
  const nights = Math.max(
    3,
    Math.round(
      (new Date(request.dateEnd).getTime() - new Date(request.dateStart).getTime()) / 86400000,
    ) || 7,
  );

  const approvedIds = new Set(approvedCompanies().map((o) => o.id));
  const pool = state.tours
    .filter((t) => t.status === "active")
    .filter((t) => approvedIds.has(t.operatorOrgId))
    .sort((a, b) => Math.abs(a.nights - nights) - Math.abs(b.nights - nights) || a.price - b.price);

  const inDestination = pool.filter((t) => {
    const hotel = state.hotels.find((h) => h.id === t.hotelId);
    return hotel?.destinationId === request.destinationId;
  });
  const inBudget = inDestination.filter((t) => t.price <= request.budget * 1.08);

  /** Турист должен получить минимум два предложения, иначе сравнивать нечего. */
  const oneTourPerCompany = (tours: typeof pool) => {
    const seen = new Set<string>();
    return tours.filter((t) => {
      if (seen.has(t.operatorOrgId)) return false;
      seen.add(t.operatorOrgId);
      return true;
    });
  };

  let picked = oneTourPerCompany(inBudget);
  if (picked.length < 2) picked = oneTourPerCompany(inDestination);
  if (picked.length < 2) picked = oneTourPerCompany(pool);

  const already = new Set(
    state.requestOffers.filter((o) => o.requestId === requestId).map((o) => o.organizationId),
  );

  // Оставляем хотя бы одну компанию без автоответа: ей турист достанется «вживую».
  // Без автоответа остаётся компания с самым большим каталогом: у неё точно есть
  // что предложить руками, и её кабинет не будет пустым.
  const catalogSize = (orgId: string) =>
    state.tours.filter((t) => t.status === "active" && t.operatorOrgId === orgId).length;
  picked = [...picked].sort((a, b) => catalogSize(a.operatorOrgId) - catalogSize(b.operatorOrgId));
  const limit = Math.min(3, Math.max(1, approvedIds.size - 1));

  let created = 0;
  picked.slice(0, limit).forEach((tour, i) => {
    if (already.has(tour.operatorOrgId)) return;
    const hotel = getHotel(tour.hotelId);
    sendOffer({
      requestId,
      organizationId: tour.operatorOrgId,
      tourId: tour.id,
      hotelName: hotel?.name ?? "Отель",
      nights: tour.nights,
      meal: mealPlainLabel(tour.mealCode),
      flightIncluded: true,
      transferIncluded: i !== 2,
      insuranceIncluded: true,
      price: tour.price,
      currency: tour.currency,
      includes: "Перелёт, проживание, питание по программе, страховка",
      comment:
        i === 0
          ? "Готовы забронировать сегодня, есть места на ваши даты."
          : "Можем подобрать другой отель в этом же бюджете.",
    });
    created += 1;
  });

  return created;
}
