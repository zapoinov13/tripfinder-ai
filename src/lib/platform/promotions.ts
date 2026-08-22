import { appendAudit, trackEvent } from "./catalog";
import { mockPaymentProvider } from "./adapters";
import { getState, nowIso, setState, uid } from "./store";
import type { Organization, PromotionOrder, PromotionType } from "./types";

const DEFAULT_PRICES: Record<PromotionType, number> = {
  BOOST: 15000,
  FEATURED: 35000,
  SPONSORED: 55000,
  PREMIUM_PLACEMENT: 45000,
  HOME_FEATURE: 75000,
};

export const promotionCatalogMeta: Record<
  PromotionType,
  { badge: string; title: string }
> = {
  BOOST: { badge: "Хит", title: "Поднять в поиске" },
  FEATURED: { badge: "Выгодная цена", title: "В топе поиска" },
  PREMIUM_PLACEMENT: { badge: "Выгодная цена", title: "Приоритет в фильтрах" },
  SPONSORED: { badge: "Рекомендуем", title: "Рекомендуем" },
  HOME_FEATURE: { badge: "Рекомендуем", title: "На главной" },
};

export function getPromotionPrices(): Record<PromotionType, number> {
  return { ...DEFAULT_PRICES, ...getState().config.promotionPrices };
}

export function calcPromotionPrice(type: PromotionType, days: number) {
  const weekly = getPromotionPrices()[type] ?? DEFAULT_PRICES[type];
  return Math.round((weekly * (days / 7)) / 1000) * 1000;
}

export function getOrgPromotions(orgId: string) {
  expireStalePromotions();
  return getState()
    .promotions.filter((p) => p.organizationId === orgId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getActiveOrgPromotions(orgId: string) {
  const now = Date.now();
  return getOrgPromotions(orgId).filter(
    (p) => p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > now,
  );
}

/** Помечает истёкшие кампании и снимает отметки с туров. */
export function expireStalePromotions() {
  const now = Date.now();
  const state = getState();
  const expiredIds = state.promotions
    .filter((p) => p.status === "ACTIVE" && new Date(p.expiresAt).getTime() <= now)
    .map((p) => p.id);
  if (expiredIds.length === 0) return;

  const tourIds = new Set(
    state.promotions
      .filter((p) => expiredIds.includes(p.id))
      .map((p) => p.tourOfferId),
  );

  setState((s) => ({
    ...s,
    promotions: s.promotions.map((p) =>
      expiredIds.includes(p.id) ? { ...p, status: "EXPIRED" as const } : p,
    ),
  }));

  for (const tourId of tourIds) syncTourPromotionTags(tourId);
}

function tagsForPromo(type: PromotionType) {
  const tags: Array<"sponsored" | "premium" | "best"> = [];
  if (type === "SPONSORED" || type === "HOME_FEATURE") tags.push("sponsored");
  if (type === "PREMIUM_PLACEMENT" || type === "FEATURED") tags.push("premium");
  if (type === "BOOST") tags.push("best");
  return tags;
}

export function syncTourPromotionTags(tourId: string) {
  const now = Date.now();
  const active = getState().promotions.filter(
    (p) =>
      p.tourOfferId === tourId &&
      p.status === "ACTIVE" &&
      new Date(p.expiresAt).getTime() > now,
  );
  const tags = new Set<"sponsored" | "premium" | "best">();
  for (const promo of active) {
    for (const tag of tagsForPromo(promo.type)) tags.add(tag);
  }
  setState((s) => ({
    ...s,
    tours: s.tours.map((t) =>
      t.id === tourId ? { ...t, tags: Array.from(tags) as typeof t.tags } : t,
    ),
  }));
}

export type PurchasePromotionInput = {
  organizationId: string;
  userId: string;
  tourId: string;
  type: PromotionType;
  days: number;
  payFromBalance?: boolean;
};

export type PurchasePromotionResult =
  | { ok: true; promotion: PromotionOrder; paidFromBalance: boolean }
  | { ok: false; reason: string };

export async function purchasePromotion(
  input: PurchasePromotionInput,
): Promise<PurchasePromotionResult> {
  expireStalePromotions();

  const org = getState().organizations.find((o) => o.id === input.organizationId);
  if (!org) return { ok: false, reason: "Компания не найдена" };

  const tour = getState().tours.find(
    (t) => t.id === input.tourId && t.operatorOrgId === input.organizationId,
  );
  if (!tour || tour.status !== "active") {
    return { ok: false, reason: "Выберите активный тур вашей компании" };
  }

  const days = Math.max(1, Math.min(90, Math.round(input.days)));
  const price = calcPromotionPrice(input.type, days);
  if (price <= 0) return { ok: false, reason: "Некорректная цена" };

  const payFromBalance = input.payFromBalance !== false;
  let paidFromBalance = false;

  if (payFromBalance) {
    if (org.promotionBalance < price) {
      return {
        ok: false,
        reason: `На балансе ${org.promotionBalance.toLocaleString("ru-RU")} ₸, нужно ${price.toLocaleString("ru-RU")} ₸`,
      };
    }
    paidFromBalance = true;
  } else {
    await mockPaymentProvider.createPayment({
      amount: price,
      currency: "KZT",
      type: "promotion",
      metadata: { tourId: input.tourId, type: input.type, days },
    });
  }

  const started = nowIso();
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  const promotion: PromotionOrder = {
    id: uid(),
    organizationId: input.organizationId,
    tourOfferId: input.tourId,
    type: input.type,
    durationDays: days,
    price,
    currency: "KZT",
    status: "ACTIVE",
    startedAt: started,
    expiresAt: expires,
  };

  setState((s) => ({
    ...s,
    promotions: [promotion, ...s.promotions],
    organizations: paidFromBalance
      ? s.organizations.map((o) =>
          o.id === input.organizationId
            ? { ...o, promotionBalance: o.promotionBalance - price }
            : o,
        )
      : s.organizations,
    payments: [
      {
        id: uid(),
        userId: input.userId,
        organizationId: input.organizationId,
        amount: price,
        currency: "KZT",
        type: "promotion",
        provider: paidFromBalance ? "balance" : "mock",
        providerPaymentId: paidFromBalance ? `balance-${promotion.id}` : uid(),
        status: "paid",
        createdAt: nowIso(),
        metadata: { tourId: input.tourId, type: input.type, days, promotionId: promotion.id },
      },
      ...s.payments,
    ],
  }));

  syncTourPromotionTags(input.tourId);

  appendAudit({
    actorId: input.userId,
    action: "promotion_purchased",
    entityType: "promotion",
    entityId: promotion.id,
    meta: { type: input.type, days, paidFromBalance },
  });
  trackEvent("PROMOTION_PURCHASED", input.userId, {
    type: input.type,
    tourId: input.tourId,
    paidFromBalance,
  });

  return { ok: true, promotion, paidFromBalance };
}

export function cancelPromotion(input: {
  promotionId: string;
  organizationId: string;
  actorId: string;
}) {
  const promo = getState().promotions.find((p) => p.id === input.promotionId);
  if (!promo || promo.organizationId !== input.organizationId) return false;
  if (promo.status !== "ACTIVE") return false;

  setState((s) => ({
    ...s,
    promotions: s.promotions.map((p) =>
      p.id === input.promotionId ? { ...p, status: "CANCELLED" as const } : p,
    ),
  }));

  syncTourPromotionTags(promo.tourOfferId);
  appendAudit({
    actorId: input.actorId,
    action: "promotion_deactivate",
    entityType: "promotion",
    entityId: promo.id,
  });
  return true;
}

export function topUpPromotionBalance(orgId: string, amount: number) {
  if (amount <= 0) return;
  setState((s) => ({
    ...s,
    organizations: s.organizations.map((o) =>
      o.id === orgId ? { ...o, promotionBalance: o.promotionBalance + amount } : o,
    ),
  }));
}

export function orgPromotionStats(org: Organization) {
  const active = getActiveOrgPromotions(org.id);
  const spent = getState()
    .payments.filter(
      (p) =>
        p.organizationId === org.id && p.type === "promotion" && p.status === "paid",
    )
    .reduce((sum, p) => sum + p.amount, 0);
  return { activeCount: active.length, spent, balance: org.promotionBalance };
}
