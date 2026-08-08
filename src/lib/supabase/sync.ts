import { observeMutations } from "@/lib/platform/store";
import type {
  AnalyticsEvent,
  AuditLog,
  Booking,
  Favorite,
  Organization,
  Payment,
  PlatformNotification,
  PlatformState,
  PlatformTour,
  PlatformUser,
  PriceAlert,
  PromotionOrder,
  Subscription,
} from "@/lib/platform/types";
import { getSupabase } from "./client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string | undefined | null): value is string =>
  typeof value === "string" && UUID_RE.test(value);

let authedUserId: string | null = null;
let started = false;

/** Пишем в БД только то, что принадлежит текущему пользователю (RLS всё равно отклонит чужое). */
const isOwn = (userId: string | undefined) => Boolean(userId) && userId === authedUserId;

function report(table: string, error: { message: string } | null) {
  if (error) console.warn(`[sync] ${table}: ${error.message}`);
}

type Op = () => Promise<void>;

function run(ops: Op[]) {
  if (!ops.length) return;
  void (async () => {
    for (const op of ops) {
      try {
        await op();
      } catch (e) {
        console.warn("[sync] операция не выполнена", e);
      }
    }
  })();
}

function indexById<T extends { id: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) map.set(row.id, row);
  return map;
}

type Diff<T> = { added: T[]; updated: T[]; removed: T[] };

function diff<T extends { id: string }>(prev: T[], next: T[], equal: (a: T, b: T) => boolean): Diff<T> {
  const before = indexById(prev);
  const after = indexById(next);
  const added: T[] = [];
  const updated: T[] = [];
  const removed: T[] = [];
  for (const row of next) {
    const old = before.get(row.id);
    if (!old) added.push(row);
    else if (!equal(old, row)) updated.push(row);
  }
  for (const row of prev) if (!after.has(row.id)) removed.push(row);
  return { added, updated, removed };
}

const bookingRow = (b: Booking) => ({
  id: b.id,
  user_id: b.userId,
  operator_id: b.operatorId,
  organization_id: isUuid(b.organizationId) ? b.organizationId : null,
  tour_offer_id: b.tourOfferId,
  external_booking_id: b.externalBookingId ?? null,
  status: b.status,
  passengers: b.passengers,
  price: b.price,
  currency: b.currency,
  payment_status: b.paymentStatus,
  created_at: b.createdAt,
  updated_at: b.updatedAt,
});

const paymentRow = (p: Payment) => ({
  id: p.id,
  user_id: p.userId,
  organization_id: isUuid(p.organizationId) ? p.organizationId : null,
  amount: p.amount,
  currency: p.currency,
  type: p.type,
  provider: p.provider,
  provider_payment_id: p.providerPaymentId,
  status: p.status,
  metadata: p.metadata ?? {},
  created_at: p.createdAt,
});

const notificationRow = (n: PlatformNotification) => ({
  id: n.id,
  user_id: n.userId,
  type: n.type,
  title: n.title,
  body: n.body,
  read: n.read,
  payload: n.payload ?? {},
  created_at: n.createdAt,
});

const alertRow = (a: PriceAlert) => ({
  id: a.id,
  user_id: a.userId,
  tour_id: a.tourId,
  target_price: a.targetPrice,
  current_price: a.currentPrice,
  currency: a.currency,
  status: a.status,
  created_at: a.createdAt,
});

const promotionRow = (p: PromotionOrder) => ({
  id: p.id,
  organization_id: p.organizationId,
  tour_offer_id: p.tourOfferId,
  type: p.type,
  duration_days: p.durationDays,
  price: p.price,
  currency: p.currency,
  status: p.status,
  started_at: p.startedAt,
  expires_at: p.expiresAt,
});

const subscriptionRow = (s: Subscription) => ({
  id: s.id,
  user_id: isUuid(s.userId) ? s.userId : null,
  organization_id: isUuid(s.organizationId) ? s.organizationId : null,
  plan_id: s.planId,
  status: s.status,
  started_at: s.startedAt,
  expires_at: s.expiresAt,
  auto_renew: s.autoRenew,
  provider_subscription_id: s.providerSubscriptionId ?? null,
});

const organizationRow = (o: Organization) => ({
  id: o.id,
  name: o.name,
  legal_name: o.legalName,
  registration_number: o.registrationNumber,
  country: o.country,
  city: o.city,
  address: o.address,
  phone: o.phone,
  email: o.email,
  website: o.website,
  contact_person: o.contactPerson,
  status: o.status,
  plan_code: o.planCode,
  additional_tour_limit: o.additionalTourLimit,
  advertising_balance: o.advertisingBalance,
  promotion_balance: o.promotionBalance,
});

const sameBooking = (a: Booking, b: Booking) =>
  a.status === b.status &&
  a.paymentStatus === b.paymentStatus &&
  a.price === b.price &&
  a.externalBookingId === b.externalBookingId;

const sameUser = (a: PlatformUser, b: PlatformUser) =>
  a.role === b.role && a.status === b.status && a.organizationId === b.organizationId;

const sameOrg = (a: Organization, b: Organization) =>
  a.status === b.status &&
  a.planCode === b.planCode &&
  a.advertisingBalance === b.advertisingBalance &&
  a.promotionBalance === b.promotionBalance &&
  a.additionalTourLimit === b.additionalTourLimit;

const sameTour = (a: PlatformTour, b: PlatformTour) =>
  a.status === b.status &&
  a.price === b.price &&
  a.premiumPrice === b.premiumPrice &&
  a.availability === b.availability;

const sameNotification = (a: PlatformNotification, b: PlatformNotification) => a.read === b.read;

const sameAlert = (a: PriceAlert, b: PriceAlert) =>
  a.targetPrice === b.targetPrice && a.currentPrice === b.currentPrice && a.status === b.status;

const samePromotion = (a: PromotionOrder, b: PromotionOrder) =>
  a.status === b.status && a.expiresAt === b.expiresAt;

function collectOps(prev: PlatformState, next: PlatformState): Op[] {
  const sb = getSupabase();
  if (!sb || !authedUserId) return [];
  const ops: Op[] = [];

  const bookings = diff(prev.bookings, next.bookings, sameBooking);
  for (const b of bookings.added) {
    if (!isUuid(b.id) || !isUuid(b.userId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("bookings").insert(bookingRow(b));
      report("bookings.insert", error);
    });
  }
  for (const b of bookings.updated) {
    if (!isUuid(b.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("bookings")
        .update({
          status: b.status,
          payment_status: b.paymentStatus,
          price: b.price,
          external_booking_id: b.externalBookingId ?? null,
          updated_at: b.updatedAt,
        })
        .eq("id", b.id);
      report("bookings.update", error);
    });
  }

  const payments = diff(prev.payments, next.payments, () => true);
  for (const p of payments.added) {
    if (!isUuid(p.id) || !isOwn(p.userId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("payments").insert(paymentRow(p));
      report("payments.insert", error);
    });
  }

  const subs = diff(prev.subscriptions, next.subscriptions, () => true);
  for (const s of subs.added) {
    if (!isUuid(s.id)) continue;
    ops.push(async () => {
      const { error } = await sb.from("subscriptions").insert(subscriptionRow(s));
      report("subscriptions.insert", error);
    });
  }

  const favorites = diff<Favorite>(prev.favorites, next.favorites, () => true);
  for (const f of favorites.added) {
    if (!isUuid(f.id) || !isOwn(f.userId)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("favorites")
        .upsert(
          { id: f.id, user_id: f.userId, tour_id: f.tourId, created_at: f.createdAt },
          { onConflict: "user_id,tour_id" },
        );
      report("favorites.insert", error);
    });
  }
  for (const f of favorites.removed) {
    if (!isOwn(f.userId)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("favorites")
        .delete()
        .eq("user_id", f.userId)
        .eq("tour_id", f.tourId);
      report("favorites.delete", error);
    });
  }

  const prevCompare = prev.comparisons.find((c) => c.userId === authedUserId);
  const nextCompare = next.comparisons.find((c) => c.userId === authedUserId);
  if (nextCompare && prevCompare?.tourIds.join(",") !== nextCompare.tourIds.join(",")) {
    ops.push(async () => {
      const { error } = await sb
        .from("comparisons")
        .upsert({ user_id: nextCompare.userId, tour_ids: nextCompare.tourIds });
      report("comparisons.upsert", error);
    });
  }

  const alerts = diff(prev.priceAlerts, next.priceAlerts, sameAlert);
  for (const a of [...alerts.added, ...alerts.updated]) {
    if (!isUuid(a.id) || !isOwn(a.userId)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("price_alerts")
        .upsert(alertRow(a), { onConflict: "user_id,tour_id" });
      report("price_alerts.upsert", error);
    });
  }
  for (const a of alerts.removed) {
    if (!isOwn(a.userId)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("price_alerts")
        .delete()
        .eq("user_id", a.userId)
        .eq("tour_id", a.tourId);
      report("price_alerts.delete", error);
    });
  }

  const notifications = diff(prev.notifications, next.notifications, sameNotification);
  for (const n of notifications.added) {
    if (!isUuid(n.id) || !isOwn(n.userId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("notifications").insert(notificationRow(n));
      report("notifications.insert", error);
    });
  }
  for (const n of notifications.updated) {
    if (!isUuid(n.id) || !isOwn(n.userId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("notifications").update({ read: n.read }).eq("id", n.id);
      report("notifications.update", error);
    });
  }

  const aiSearches = diff(prev.aiSearches, next.aiSearches, () => true);
  for (const a of aiSearches.added) {
    if (!isUuid(a.id) || !isOwn(a.userId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("ai_searches").insert({
        id: a.id,
        user_id: a.userId,
        original_query: a.originalQuery,
        parsed: a.parsed,
        search_params: a.searchParams,
        results_count: a.resultsCount,
        created_at: a.createdAt,
      });
      report("ai_searches.insert", error);
    });
  }

  const audits = diff(prev.auditLogs, next.auditLogs, () => true);
  for (const a of audits.added) {
    if (!isUuid(a.id)) continue;
    ops.push(async () => {
      const { error } = await sb.from("audit_logs").insert({
        id: a.id,
        actor_id: isUuid(a.actorId) ? a.actorId : null,
        action: a.action,
        entity_type: a.entityType,
        entity_id: a.entityId ?? null,
        meta: a.meta ?? {},
        created_at: a.createdAt,
      });
      report("audit_logs.insert", error);
    });
  }

  const events = diff(prev.analyticsEvents, next.analyticsEvents, () => true);
  for (const e of events.added) {
    if (!isUuid(e.id)) continue;
    ops.push(async () => {
      const { error } = await sb.from("analytics_events").insert({
        id: e.id,
        type: e.type,
        user_id: isUuid(e.userId) ? e.userId : null,
        payload: e.payload ?? {},
        created_at: e.createdAt,
      });
      report("analytics_events.insert", error);
    });
  }

  const users = diff(prev.users, next.users, sameUser);
  for (const u of users.updated) {
    if (!isUuid(u.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("profiles")
        .update({
          role: u.role,
          status: u.status,
          organization_id: isUuid(u.organizationId) ? u.organizationId : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id);
      report("profiles.update", error);
    });
  }

  const orgs = diff(prev.organizations, next.organizations, sameOrg);
  for (const o of orgs.added) {
    if (!isUuid(o.id)) continue;
    ops.push(async () => {
      const { error } = await sb.from("organizations").insert(organizationRow(o));
      report("organizations.insert", error);
    });
  }
  for (const o of orgs.updated) {
    if (!isUuid(o.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("organizations")
        .update({
          status: o.status,
          plan_code: o.planCode,
          additional_tour_limit: o.additionalTourLimit,
          advertising_balance: o.advertisingBalance,
          promotion_balance: o.promotionBalance,
        })
        .eq("id", o.id);
      report("organizations.update", error);
    });
  }

  const tours = diff(prev.tours, next.tours, sameTour);
  for (const t of tours.updated) {
    ops.push(async () => {
      const { error } = await sb
        .from("tour_offers")
        .update({
          status: t.status,
          price: t.price,
          premium_price: t.premiumPrice ?? null,
          availability: t.availability,
          updated_at: new Date().toISOString(),
        })
        .eq("id", t.id);
      report("tour_offers.update", error);
    });
  }

  const promos = diff(prev.promotions, next.promotions, samePromotion);
  for (const p of [...promos.added, ...promos.updated]) {
    if (!isUuid(p.id) || !isUuid(p.organizationId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("promotions").upsert(promotionRow(p));
      report("promotions.upsert", error);
    });
  }

  return ops;
}

/** Подписывает локальный стор на запись в Supabase. Вызывать один раз при старте. */
export function startPlatformSync() {
  const sb = getSupabase();
  if (!sb || started) return;
  started = true;

  void sb.auth.getSession().then(({ data }) => {
    authedUserId = data.session?.user.id ?? null;
  });
  sb.auth.onAuthStateChange((_event, session) => {
    authedUserId = session?.user.id ?? null;
  });

  observeMutations((prev, next) => run(collectOps(prev, next)));
}

export function syncSessionUserId() {
  return authedUserId;
}
