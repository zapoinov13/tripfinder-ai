import { observeMutations } from "@/lib/platform/store";
import type {
  AnalyticsEvent,
  AuditLog,
  Booking,
  CompanyReview,
  Favorite,
  Organization,
  Payment,
  PlatformNotification,
  PlatformState,
  PlatformTour,
  PlatformUser,
  PriceAlert,
  PromotionOrder,
  RequestMessage,
  RequestOffer,
  ServiceMessage,
  ServiceRequest,
  Subscription,
  TripRequest,
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

/** RPC вне сгенерированных типов Database (админ-функции из миграций). */
function callRpc(
  sb: { rpc: unknown },
  fn: string,
  args: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  return (
    sb.rpc as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>
  )(fn, args);
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

function diff<T extends { id: string }>(
  prev: T[],
  next: T[],
  equal: (a: T, b: T) => boolean,
): Diff<T> {
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
  ...companyProfileRow(o),
});

const companyProfileRow = (o: Organization) => ({
  services: o.services ?? [],
  countries: o.countries ?? [],
  client_countries: o.clientCountries ?? [],
  languages: o.languages ?? [],
  about: o.about ?? "",
  working_hours: o.workingHours ?? "",
  promo_text: o.promoText ?? "",
  promo_until: o.promoUntil ?? "",
  logo_url: o.logoUrl ?? "",
  cover_url: o.coverUrl ?? "",
  photos: o.photos ?? [],
  videos: o.videos ?? [],
  whatsapp: o.whatsapp ?? "",
  instagram: o.instagram ?? "",
  telegram: o.telegram ?? "",
  documents: o.documents ?? [],
  verification_submitted_at: o.verificationSubmittedAt ?? null,
});

const sameBooking = (a: Booking, b: Booking) =>
  a.status === b.status &&
  a.paymentStatus === b.paymentStatus &&
  a.price === b.price &&
  a.externalBookingId === b.externalBookingId;

const sameUser = (a: PlatformUser, b: PlatformUser) =>
  a.role === b.role &&
  a.status === b.status &&
  a.organizationId === b.organizationId &&
  a.name === b.name &&
  a.city === b.city;

const sameOrg = (a: Organization, b: Organization) =>
  a.status === b.status &&
  a.planCode === b.planCode &&
  a.advertisingBalance === b.advertisingBalance &&
  a.promotionBalance === b.promotionBalance &&
  a.additionalTourLimit === b.additionalTourLimit &&
  JSON.stringify(companyProfileRow(a)) === JSON.stringify(companyProfileRow(b));

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

const tripRequestRow = (r: TripRequest) => ({
  id: r.id,
  user_id: r.userId,
  kind: r.kind,
  from_city: r.fromCity,
  destination_id: r.destinationId,
  destination_label: r.destinationLabel,
  date_start: r.dateStart,
  date_end: r.dateEnd,
  adults: r.adults,
  children: r.children,
  budget: r.budget,
  currency: r.currency,
  wishes: r.wishes,
  contact_name: r.contactName,
  contact_phone: r.contactPhone,
  status: r.status,
  chosen_offer_id: isUuid(r.chosenOfferId) ? r.chosenOfferId : null,
  declined_by_org_ids: r.declinedByOrgIds.filter(isUuid),
  created_at: r.createdAt,
  updated_at: r.updatedAt,
});

const offerRow = (o: RequestOffer) => ({
  id: o.id,
  request_id: o.requestId,
  organization_id: o.organizationId,
  tour_id: o.tourId ?? null,
  hotel_name: o.hotelName,
  nights: o.nights,
  meal: o.meal,
  flight_included: o.flightIncluded,
  transfer_included: o.transferIncluded,
  insurance_included: o.insuranceIncluded,
  price: o.price,
  currency: o.currency,
  includes: o.includes,
  comment: o.comment,
  status: o.status,
  created_at: o.createdAt,
});

const sameTripRequest = (a: TripRequest, b: TripRequest) =>
  a.status === b.status &&
  a.chosenOfferId === b.chosenOfferId &&
  a.declinedByOrgIds.join(",") === b.declinedByOrgIds.join(",");

const sameOffer = (a: RequestOffer, b: RequestOffer) =>
  a.status === b.status && a.price === b.price;

const messageRow = (m: RequestMessage) => ({
  id: m.id,
  request_id: m.requestId,
  organization_id: m.organizationId,
  user_id: m.userId,
  author_side: m.authorSide,
  author_name: m.authorName,
  text: m.text,
  read_by_tourist: m.readByTourist,
  read_by_company: m.readByCompany,
  created_at: m.createdAt,
});

const sameMessage = (a: RequestMessage, b: RequestMessage) =>
  a.readByTourist === b.readByTourist && a.readByCompany === b.readByCompany;

const reviewRow = (r: CompanyReview) => ({
  id: r.id,
  organization_id: r.organizationId,
  user_id: r.userId,
  author_name: r.authorName,
  request_id: isUuid(r.requestId) ? r.requestId : null,
  rating: r.rating,
  text: r.text,
  created_at: r.createdAt,
  reply: r.reply ?? null,
  reply_at: r.replyAt ?? null,
  reply_by_user_id: isUuid(r.replyByUserId) ? r.replyByUserId : null,
  reply_by_name: r.replyByName ?? null,
});

const sameReview = (a: CompanyReview, b: CompanyReview) =>
  a.rating === b.rating &&
  a.text === b.text &&
  a.reply === b.reply &&
  a.replyAt === b.replyAt &&
  a.replyByUserId === b.replyByUserId &&
  a.replyByName === b.replyByName;

const serviceRequestRow = (r: ServiceRequest) => ({
  id: r.id,
  organization_id: r.organizationId,
  user_id: isUuid(r.userId) ? r.userId : null,
  listing_id: r.listingId ?? null,
  listing_name: r.listingName,
  contact_name: r.contactName,
  contact_phone: r.contactPhone,
  date: r.date,
  time: r.time,
  people: r.people,
  comment: r.comment,
  status: r.status,
  reply_comment: r.replyComment ?? "",
  created_at: r.createdAt,
  updated_at: r.updatedAt,
});

const sameServiceRequest = (a: ServiceRequest, b: ServiceRequest) =>
  a.status === b.status && a.replyComment === b.replyComment;

const serviceMessageRow = (m: ServiceMessage) => ({
  id: m.id,
  request_id: m.requestId,
  organization_id: m.organizationId,
  user_id: m.userId,
  author_side: m.authorSide,
  author_name: m.authorName,
  text: m.text,
  read_by_client: m.readByClient,
  read_by_company: m.readByCompany,
  created_at: m.createdAt,
});

const sameServiceMessage = (a: ServiceMessage, b: ServiceMessage) =>
  a.readByClient === b.readByClient && a.readByCompany === b.readByCompany;

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

  // Конфиг платформы (тарифы, цена Premium, цены продвижения, ранжирование):
  // правки из админки уходят в platform_config, иначе жили бы только в браузере.
  if (JSON.stringify(prev.config) !== JSON.stringify(next.config)) {
    const c = next.config;
    ops.push(async () => {
      const { error } = await sb
        .from("platform_config")
        .update({
          premium_monthly_price: c.premiumMonthlyPrice,
          premium_currency: c.premiumCurrency,
          operator_plans: c.operatorPlans,
          promotion_prices: c.promotionPrices,
          ranking_weights: c.rankingWeights,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      report("platform_config.update", error);
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
          name: u.name,
          city: u.city,
          organization_id: isUuid(u.organizationId) ? u.organizationId : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id);
      report("profiles.update", error);
    });
  }
  // Удаление из админки: RPC стирает auth.users + профиль (см. миграцию
  // admin_delete_user), иначе гидрация профилей вернёт пользователя обратно.
  for (const u of users.removed) {
    if (!isUuid(u.id)) continue;
    ops.push(async () => {
      const { error } = await callRpc(sb, "admin_delete_user", { target_user: u.id });
      report("profiles.delete", error);
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
          ...companyProfileRow(o),
        })
        .eq("id", o.id);
      report("organizations.update", error);
    });
  }
  // Удаление компании из админки: RPC чистит базу (туры, участники, отвязка
  // сотрудников и финансовых записей) — иначе гидрация вернёт её обратно.
  for (const o of orgs.removed) {
    if (!isUuid(o.id)) continue;
    ops.push(async () => {
      const { error } = await callRpc(sb, "admin_delete_organization", { target_org: o.id });
      report("organizations.delete", error);
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
  // Удаление тура: тур с бронями сервер прячет вместо удаления.
  for (const t of tours.removed) {
    ops.push(async () => {
      const { error } = await callRpc(sb, "admin_delete_tour", { target_tour: t.id });
      report("tour_offers.delete", error);
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

  const requests = diff(prev.tripRequests, next.tripRequests, sameTripRequest);
  for (const r of requests.added) {
    if (!isUuid(r.id) || !isOwn(r.userId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("trip_requests").insert(tripRequestRow(r));
      report("trip_requests.insert", error);
    });
  }
  for (const r of requests.updated) {
    if (!isUuid(r.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("trip_requests")
        .update({
          status: r.status,
          chosen_offer_id: isUuid(r.chosenOfferId) ? r.chosenOfferId : null,
          declined_by_org_ids: r.declinedByOrgIds.filter(isUuid),
          updated_at: r.updatedAt,
        })
        .eq("id", r.id);
      report("trip_requests.update", error);
    });
  }

  const offers = diff(prev.requestOffers, next.requestOffers, sameOffer);
  for (const o of offers.added) {
    if (!isUuid(o.id) || !isUuid(o.requestId) || !isUuid(o.organizationId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("request_offers").insert(offerRow(o));
      report("request_offers.insert", error);
    });
  }
  for (const o of offers.updated) {
    if (!isUuid(o.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("request_offers")
        .update({ status: o.status, price: o.price })
        .eq("id", o.id);
      report("request_offers.update", error);
    });
  }

  const messages = diff(prev.requestMessages, next.requestMessages, sameMessage);
  for (const m of messages.added) {
    if (!isUuid(m.id) || !isUuid(m.requestId) || !isUuid(m.organizationId) || !isUuid(m.userId)) {
      continue;
    }
    ops.push(async () => {
      const { error } = await sb.from("request_messages").insert(messageRow(m));
      report("request_messages.insert", error);
    });
  }
  for (const m of messages.updated) {
    if (!isUuid(m.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("request_messages")
        .update({ read_by_tourist: m.readByTourist, read_by_company: m.readByCompany })
        .eq("id", m.id);
      report("request_messages.update", error);
    });
  }

  // Заявки клиентов бизнесу: создаёт клиент, статус меняет компания.
  const serviceRequests = diff(prev.serviceRequests, next.serviceRequests, sameServiceRequest);
  for (const r of serviceRequests.added) {
    if (!isUuid(r.id) || !isUuid(r.organizationId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("service_requests").insert(serviceRequestRow(r));
      report("service_requests.insert", error);
    });
  }
  for (const r of serviceRequests.updated) {
    if (!isUuid(r.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("service_requests")
        .update({
          status: r.status,
          reply_comment: r.replyComment ?? "",
          updated_at: r.updatedAt,
        })
        .eq("id", r.id);
      report("service_requests.update", error);
    });
  }

  // Переписка по заявке в компанию.
  const serviceMessages = diff(prev.serviceMessages, next.serviceMessages, sameServiceMessage);
  for (const m of serviceMessages.added) {
    if (!isUuid(m.id) || !isUuid(m.requestId) || !isUuid(m.organizationId) || !isOwn(m.userId)) {
      continue;
    }
    ops.push(async () => {
      const { error } = await sb.from("service_messages").insert(serviceMessageRow(m));
      report("service_messages.insert", error);
    });
  }
  for (const m of serviceMessages.updated) {
    if (!isUuid(m.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("service_messages")
        .update({ read_by_client: m.readByClient, read_by_company: m.readByCompany })
        .eq("id", m.id);
      report("service_messages.update", error);
    });
  }

  const reviews = diff(prev.companyReviews, next.companyReviews, sameReview);
  for (const r of reviews.added) {
    if (!isUuid(r.id) || !isUuid(r.organizationId) || !isOwn(r.userId)) continue;
    ops.push(async () => {
      const { error } = await sb.from("company_reviews").insert(reviewRow(r));
      report("company_reviews.insert", error);
    });
  }
  for (const r of reviews.updated) {
    if (!isUuid(r.id)) continue;
    ops.push(async () => {
      const { error } = await sb
        .from("company_reviews")
        .update({
          reply: r.reply ?? null,
          reply_at: r.replyAt ?? null,
          reply_by_user_id: isUuid(r.replyByUserId) ? r.replyByUserId : null,
          reply_by_name: r.replyByName ?? null,
        })
        .eq("id", r.id);
      report("company_reviews.update", error);
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
