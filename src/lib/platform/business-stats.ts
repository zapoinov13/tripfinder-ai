import { getState } from "./store";
import type { PromotionOrder, ServiceRequest } from "./types";
import { listOrgVertical } from "./vertical-listings";

export type BusinessMoney = {
  /** Записи, созданные за период. */
  requests: number;
  /** Из них подтверждённые или выполненные. */
  won: number;
  /** Отменённые клиентом или отклонённые компанией. */
  lost: number;
  /** Деньги по состоявшимся записям (подтверждена + выполнена). */
  earned: number;
  /** Деньги по всем записям периода, включая ожидающие ответа. */
  potential: number;
  /** Записи, пришедшие во время активной кампании продвижения. */
  fromPromo: number;
  promoEarned: number;
  /** Остальные записи — органика. */
  organic: number;
  organicEarned: number;
  /** Средний чек состоявшейся записи. */
  averageCheck: number;
};

/** «1 запись», «2 записи», «5 записей» */
export function recordsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "запись";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "записи";
  return "записей";
}

const WON = new Set(["CONFIRMED", "DONE"]);
const LOST = new Set(["DECLINED", "CANCELLED"]);

/** Цена записи: цена привязанного объявления × число человек. */
export function requestValue(organizationId: string, request: ServiceRequest): number {
  if (!request.listingId) return 0;
  const listing = listOrgVertical(organizationId).find((l) => l.id === request.listingId);
  return (listing?.price ?? 0) * Math.max(1, request.people);
}

/** Была ли запись создана, пока шла кампания продвижения. */
function createdDuringPromo(promos: PromotionOrder[], createdAt: string) {
  const t = new Date(createdAt).getTime();
  return promos.some(
    (p) => t >= new Date(p.startedAt).getTime() && t <= new Date(p.expiresAt).getTime(),
  );
}

/**
 * Деньги бизнеса за период. Платежи проходят мимо платформы, поэтому
 * считаем по записям и ценам услуг — это ожидаемый доход, не факт оплаты.
 */
export function businessMoney(organizationId: string, days: number): BusinessMoney {
  const state = getState();
  const since = days === 0 ? 0 : Date.now() - days * 24 * 60 * 60 * 1000;
  const promos = state.promotions.filter((p) => p.organizationId === organizationId);

  const requests = state.serviceRequests.filter(
    (r) =>
      r.organizationId === organizationId &&
      (since === 0 || new Date(r.createdAt).getTime() >= since),
  );

  let earned = 0;
  let potential = 0;
  let won = 0;
  let lost = 0;
  let fromPromo = 0;
  let promoEarned = 0;
  let organic = 0;
  let organicEarned = 0;

  for (const r of requests) {
    const value = requestValue(organizationId, r);
    potential += value;
    const isWon = WON.has(r.status);
    if (isWon) {
      won += 1;
      earned += value;
    }
    if (LOST.has(r.status)) lost += 1;

    if (createdDuringPromo(promos, r.createdAt)) {
      fromPromo += 1;
      if (isWon) promoEarned += value;
    } else {
      organic += 1;
      if (isWon) organicEarned += value;
    }
  }

  return {
    requests: requests.length,
    won,
    lost,
    earned,
    potential,
    fromPromo,
    promoEarned,
    organic,
    organicEarned,
    averageCheck: won > 0 ? Math.round(earned / won) : 0,
  };
}

/** Отдача объявлений: сколько записей и денег принесло каждое. */
export function listingPerformance(organizationId: string, days: number) {
  const state = getState();
  const since = days === 0 ? 0 : Date.now() - days * 24 * 60 * 60 * 1000;
  const requests = state.serviceRequests.filter(
    (r) =>
      r.organizationId === organizationId &&
      (since === 0 || new Date(r.createdAt).getTime() >= since),
  );

  return listOrgVertical(organizationId)
    .map((listing) => {
      const mine = requests.filter((r) => r.listingId === listing.id);
      const wonRequests = mine.filter((r) => WON.has(r.status));
      return {
        listing,
        requests: mine.length,
        won: wonRequests.length,
        earned: wonRequests.reduce((sum, r) => sum + listing.price * Math.max(1, r.people), 0),
      };
    })
    .sort((a, b) => b.earned - a.earned || b.requests - a.requests);
}
