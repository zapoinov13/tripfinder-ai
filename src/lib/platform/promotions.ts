import { appendAudit, trackEvent } from "./catalog";
import { purchasePromotion as purchasePromotionOnServer } from "./promotion.functions";
import { getState, nowIso, setState, uid } from "./store";
import type { Organization, PromotionOrder, PromotionType } from "./types";

const DEFAULT_PRICES: Record<PromotionType, number> = {
  BOOST: 15000,
  FEATURED: 35000,
  SPONSORED: 55000,
  PREMIUM_PLACEMENT: 45000,
  HOME_FEATURE: 75000,
};

export const promotionCatalogMeta: Record<PromotionType, { badge: string; title: string }> = {
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
    state.promotions.filter((p) => expiredIds.includes(p.id)).map((p) => p.tourOfferId),
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
      p.tourOfferId === tourId && p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > now,
  );
  const promoTags = new Set<"sponsored" | "premium" | "best">();
  for (const promo of active) {
    for (const tag of tagsForPromo(promo.type)) promoTags.add(tag);
  }
  const managed: string[] = ["sponsored", "premium", "best"];
  setState((s) => ({
    ...s,
    tours: s.tours.map((t) =>
      t.id === tourId
        ? {
            ...t,
            // Промо управляет только своими тегами: «hot» и прочие остаются.
            tags: [
              ...t.tags.filter((tag) => !managed.includes(tag)),
              ...Array.from(promoTags),
            ] as typeof t.tags,
          }
        : t,
    ),
  }));
}

/**
 * Продвижение бизнеса без туров (спортзал, прокат, жильё): целью кампании
 * выступает не тур, а страница компании и все её объявления в витринах.
 * Такие кампании хранятся с tourOfferId = "company:<orgId>".
 */
const COMPANY_TARGET_PREFIX = "company:";

export function companyPromoTarget(orgId: string) {
  return `${COMPANY_TARGET_PREFIX}${orgId}`;
}

export function isCompanyPromotion(p: PromotionOrder) {
  return p.tourOfferId.startsWith(COMPANY_TARGET_PREFIX);
}

/** Компании с активным продвижением: их объявления поднимаются в витринах. */
export function promotedCompanyIds(): Map<string, Set<PromotionType>> {
  const now = Date.now();
  const out = new Map<string, Set<PromotionType>>();
  for (const p of getState().promotions) {
    if (p.status !== "ACTIVE" || new Date(p.expiresAt).getTime() <= now) continue;
    if (!p.tourOfferId.startsWith(COMPANY_TARGET_PREFIX)) continue;
    const orgId = p.tourOfferId.slice(COMPANY_TARGET_PREFIX.length);
    const set = out.get(orgId) ?? new Set<PromotionType>();
    set.add(p.type);
    out.set(orgId, set);
  }
  return out;
}

/** Какую отметку показывать на карточках продвигаемой компании в витрине. */
export function companyPromoBadge(
  types: Set<PromotionType> | undefined,
): { label: string; featured: boolean } | null {
  if (!types || types.size === 0) return null;
  if (types.has("FEATURED")) return { label: "Выбор TourGo", featured: true };
  if (types.has("SPONSORED")) return { label: "Рекомендуем", featured: false };
  return { label: "Хит", featured: false };
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
  { ok: true; promotion: PromotionOrder; paidFromBalance: boolean } | { ok: false; reason: string };

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

  return executePromotionPurchase(input, org);
}

/** Продвижение страницы компании и всех её объявлений (бизнес без туров). */
export async function purchaseCompanyPromotion(input: {
  organizationId: string;
  userId: string;
  type: PromotionType;
  days: number;
  payFromBalance?: boolean;
}): Promise<PurchasePromotionResult> {
  expireStalePromotions();

  const org = getState().organizations.find((o) => o.id === input.organizationId);
  if (!org) return { ok: false, reason: "Компания не найдена" };

  return executePromotionPurchase(
    { ...input, tourId: companyPromoTarget(input.organizationId) },
    org,
  );
}

async function executePromotionPurchase(
  input: PurchasePromotionInput,
  org: Organization,
): Promise<PurchasePromotionResult> {
  const days = Math.max(1, Math.min(90, Math.round(input.days)));
  const payFromBalance = input.payFromBalance !== false;

  // Кампанию создаёт сервер: цену считает он, баланс списывает он же, а
  // таблицы promotions и payments закрыты для записи из браузера. Локальный
  // стор обновляем строкой, которую вернул сервер, чтобы кабинет не ждал
  // следующей гидрации.
  const res = await purchasePromotionOnServer({
    data: {
      organizationId: input.organizationId,
      tourOfferId: input.tourId,
      type: input.type,
      days,
      payFromBalance,
    },
  });
  if (!res.ok) return { ok: false, reason: res.reason };

  const promotion: PromotionOrder = {
    id: res.promotion.id,
    organizationId: res.promotion.organizationId,
    tourOfferId: res.promotion.tourOfferId,
    type: res.promotion.type as PromotionType,
    durationDays: res.promotion.durationDays,
    price: res.promotion.price,
    currency: "KZT",
    status: "ACTIVE",
    startedAt: res.promotion.startedAt,
    expiresAt: res.promotion.expiresAt,
  };

  setState((s) => ({
    ...s,
    promotions: [promotion, ...s.promotions],
    organizations: s.organizations.map((o) =>
      o.id === input.organizationId ? { ...o, promotionBalance: res.balance } : o,
    ),
  }));

  syncTourPromotionTags(input.tourId);

  appendAudit({
    actorId: input.userId,
    action: "promotion_purchased",
    entityType: "promotion",
    entityId: promotion.id,
    meta: { type: input.type, days, paidFromBalance: payFromBalance },
  });
  trackEvent("PROMOTION_PURCHASED", input.userId, {
    type: input.type,
    tourId: input.tourId,
    paidFromBalance: payFromBalance,
  });

  return { ok: true, promotion, paidFromBalance: payFromBalance };
}

/**
 * Внутренний таргетинг: админ платформы включает продвижение компании сам —
 * бесплатно (подарок, цена 0) или со списанием с её баланса. Цель — страница
 * компании и все объявления (company:<orgId>).
 */
export function adminGrantPromotion(input: {
  organizationId: string;
  actorId: string;
  type: PromotionType;
  days: number;
  chargeBalance?: boolean;
}): { ok: true; promotion: PromotionOrder } | { ok: false; reason: string } {
  expireStalePromotions();
  const org = getState().organizations.find((o) => o.id === input.organizationId);
  if (!org) return { ok: false, reason: "Компания не найдена" };

  const days = Math.max(1, Math.min(90, Math.round(input.days)));
  const price = input.chargeBalance ? calcPromotionPrice(input.type, days) : 0;
  if (input.chargeBalance && org.promotionBalance < price) {
    return {
      ok: false,
      reason: `На балансе компании ${org.promotionBalance.toLocaleString("ru-RU")} ₸, нужно ${price.toLocaleString("ru-RU")} ₸`,
    };
  }

  const promotion: PromotionOrder = {
    id: uid(),
    organizationId: input.organizationId,
    tourOfferId: companyPromoTarget(input.organizationId),
    type: input.type,
    durationDays: days,
    price,
    currency: "KZT",
    status: "ACTIVE",
    startedAt: nowIso(),
    expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
  };

  setState((s) => ({
    ...s,
    promotions: [promotion, ...s.promotions],
    organizations:
      price > 0
        ? s.organizations.map((o) =>
            o.id === input.organizationId
              ? { ...o, promotionBalance: o.promotionBalance - price }
              : o,
          )
        : s.organizations,
    payments:
      price > 0
        ? [
            {
              id: uid(),
              userId: input.actorId,
              organizationId: input.organizationId,
              amount: price,
              currency: "KZT" as const,
              type: "promotion" as const,
              provider: "balance" as const,
              providerPaymentId: `balance-${promotion.id}`,
              status: "paid" as const,
              createdAt: nowIso(),
              metadata: { type: input.type, days, promotionId: promotion.id, byAdmin: true },
            },
            ...s.payments,
          ]
        : s.payments,
  }));

  appendAudit({
    actorId: input.actorId,
    action: "promotion_granted_by_admin",
    entityType: "promotion",
    entityId: promotion.id,
    meta: { organizationId: input.organizationId, type: input.type, days, price },
  });
  return { ok: true, promotion };
}

/** Начисление баланса продвижения из админки (оплата вне платформы, бонус). */
export function adminTopUpBalance(orgId: string, amount: number, actorId: string) {
  if (amount <= 0) return false;
  const org = getState().organizations.find((o) => o.id === orgId);
  if (!org) return false;
  topUpPromotionBalance(orgId, amount);
  appendAudit({
    actorId,
    action: "promotion_balance_topup_admin",
    entityType: "organization",
    entityId: orgId,
    meta: { amount },
  });
  return true;
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
      (p) => p.organizationId === org.id && p.type === "promotion" && p.status === "paid",
    )
    .reduce((sum, p) => sum + p.amount, 0);
  return { activeCount: active.length, spent, balance: org.promotionBalance };
}
