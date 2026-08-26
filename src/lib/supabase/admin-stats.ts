import {
  categoriesOfServices,
  companyCategories,
  type CompanyCategoryId,
} from "@/lib/platform/company-categories";
import type { PlatformState } from "@/lib/platform/types";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Статистика главной страницы админки. Источник правды — RPC
 * `admin_overview_stats` (точные count/sum по всей базе, без демо-данных);
 * локальный стор используется только как фолбэк, когда база недоступна.
 */

export type AdminOrgStat = {
  id: string;
  name: string;
  status: string;
  city: string;
  services: string[];
  createdAt: string;
  /** Уникальные заявки, дошедшие до компании: предложение или переписка. */
  leads: number;
  offers: number;
  bookingsCount: number;
  bookingsSum: number;
  reviews: number;
  rating: number;
};

export type AdminOverviewStats = {
  generatedAt: string;
  users: {
    total: number;
    tourists: number;
    premium: number;
    companyUsers: number;
    admins: number;
    suspended: number;
    new7d: number;
    new30d: number;
  };
  installs: { total: number; ios: number; android: number; web: number; new30d: number };
  companies: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    suspended: number;
    new30d: number;
  };
  tours: { total: number; active: number };
  bookings: {
    total: number;
    active: number;
    paid: number;
    gmv: number;
    paidSum: number;
    new30d: number;
  };
  requests: { total: number; open: number; tour: number; assistance: number; new30d: number };
  offers: { total: number };
  reviews: { total: number; avgRating: number };
  /** Оплаченные платежи по типам: premium_subscription, promotion и т. д. */
  revenue: Record<string, number>;
  organizations: AdminOrgStat[];
};

export type CategoryStat = {
  id: CompanyCategoryId | "uncategorized";
  label: string;
  companies: number;
  leads: number;
  offers: number;
  bookingsCount: number;
  bookingsSum: number;
};

type Row = Record<string, unknown>;

const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const strList = (v: unknown) =>
  Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : [];

function mapOrg(r: Row): AdminOrgStat {
  return {
    id: str(r["id"]),
    name: str(r["name"]),
    status: str(r["status"]),
    city: str(r["city"]),
    services: strList(r["services"]),
    createdAt: str(r["created_at"]),
    leads: num(r["leads"]),
    offers: num(r["offers"]),
    bookingsCount: num(r["bookings_count"]),
    bookingsSum: num(r["bookings_sum"]),
    reviews: num(r["reviews"]),
    rating: num(r["rating"]),
  };
}

export type AdminStatsResult =
  { ok: true; stats: AdminOverviewStats } | { ok: false; reason: string };

export async function fetchAdminOverviewStats(): Promise<AdminStatsResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "not_configured" };

  const { data, error } = await sb.rpc("admin_overview_stats");
  if (error) return { ok: false, reason: error.message };
  if (!data || typeof data !== "object") return { ok: false, reason: "empty_response" };

  const d = data as Row;
  const users = (d["users"] ?? {}) as Row;
  const installs = (d["installs"] ?? {}) as Row;
  const companies = (d["companies"] ?? {}) as Row;
  const tours = (d["tours"] ?? {}) as Row;
  const bookings = (d["bookings"] ?? {}) as Row;
  const requests = (d["requests"] ?? {}) as Row;
  const offers = (d["offers"] ?? {}) as Row;
  const reviews = (d["reviews"] ?? {}) as Row;
  const revenueRaw = (d["revenue"] ?? {}) as Row;

  return {
    ok: true,
    stats: {
      generatedAt: str(d["generated_at"]),
      users: {
        total: num(users["total"]),
        tourists: num(users["tourists"]),
        premium: num(users["premium"]),
        companyUsers: num(users["company_users"]),
        admins: num(users["admins"]),
        suspended: num(users["suspended"]),
        new7d: num(users["new_7d"]),
        new30d: num(users["new_30d"]),
      },
      installs: {
        total: num(installs["total"]),
        ios: num(installs["ios"]),
        android: num(installs["android"]),
        web: num(installs["web"]),
        new30d: num(installs["new_30d"]),
      },
      companies: {
        total: num(companies["total"]),
        approved: num(companies["approved"]),
        pending: num(companies["pending"]),
        rejected: num(companies["rejected"]),
        suspended: num(companies["suspended"]),
        new30d: num(companies["new_30d"]),
      },
      tours: { total: num(tours["total"]), active: num(tours["active"]) },
      bookings: {
        total: num(bookings["total"]),
        active: num(bookings["active"]),
        paid: num(bookings["paid"]),
        gmv: num(bookings["gmv"]),
        paidSum: num(bookings["paid_sum"]),
        new30d: num(bookings["new_30d"]),
      },
      requests: {
        total: num(requests["total"]),
        open: num(requests["open"]),
        tour: num(requests["tour"]),
        assistance: num(requests["assistance"]),
        new30d: num(requests["new_30d"]),
      },
      offers: { total: num(offers["total"]) },
      reviews: { total: num(reviews["total"]), avgRating: num(reviews["avg_rating"]) },
      revenue: Object.fromEntries(Object.entries(revenueRaw).map(([k, v]) => [k, num(v)])),
      organizations: Array.isArray(d["organizations"])
        ? (d["organizations"] as Row[]).map(mapOrg)
        : [],
    },
  };
}

/**
 * Разбивка компаний по категориям деятельности. Компания с услугами из
 * нескольких категорий учитывается в каждой; без услуг — в «Без категории».
 */
export function buildCategoryStats(orgs: AdminOrgStat[]): CategoryStat[] {
  const byId = new Map<CategoryStat["id"], CategoryStat>(
    companyCategories.map((c) => [
      c.id,
      {
        id: c.id,
        label: c.label,
        companies: 0,
        leads: 0,
        offers: 0,
        bookingsCount: 0,
        bookingsSum: 0,
      },
    ]),
  );
  const uncategorized: CategoryStat = {
    id: "uncategorized",
    label: "Без категории",
    companies: 0,
    leads: 0,
    offers: 0,
    bookingsCount: 0,
    bookingsSum: 0,
  };

  for (const org of orgs) {
    const cats = categoriesOfServices(org.services);
    const targets: CategoryStat[] = cats.size
      ? [...cats].map((id) => byId.get(id)!)
      : [uncategorized];
    for (const target of targets) {
      target.companies += 1;
      target.leads += org.leads;
      target.offers += org.offers;
      target.bookingsCount += org.bookingsCount;
      target.bookingsSum += org.bookingsSum;
    }
  }

  const rows = [...byId.values()];
  if (uncategorized.companies > 0) rows.push(uncategorized);
  return rows;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const withinDays = (iso: string, days: number) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) && Date.now() - t <= days * DAY_MS;
};

/** Фолбэк, когда база недоступна: те же метрики из локального стора. */
export function statsFromLocalStore(state: PlatformState): AdminOverviewStats {
  const activeBookings = state.bookings.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "FAILED",
  );
  const paidBookings = state.bookings.filter((b) => b.paymentStatus === "paid");

  const orgLeads = new Map<string, Set<string>>();
  for (const o of state.requestOffers) {
    if (!orgLeads.has(o.organizationId)) orgLeads.set(o.organizationId, new Set());
    orgLeads.get(o.organizationId)!.add(o.requestId);
  }
  for (const m of state.requestMessages) {
    if (!orgLeads.has(m.organizationId)) orgLeads.set(m.organizationId, new Set());
    orgLeads.get(m.organizationId)!.add(m.requestId);
  }

  const revenue: Record<string, number> = {};
  for (const p of state.payments) {
    if (p.status !== "paid") continue;
    revenue[p.type] = (revenue[p.type] ?? 0) + p.amount;
  }

  return {
    generatedAt: new Date().toISOString(),
    users: {
      total: state.users.length,
      tourists: state.users.filter((u) => u.role === "TOURIST" || u.role === "PREMIUM_TOURIST")
        .length,
      premium: state.users.filter((u) => u.role === "PREMIUM_TOURIST").length,
      companyUsers: state.users.filter(
        (u) => u.role === "OPERATOR_ADMIN" || u.role === "OPERATOR_MANAGER",
      ).length,
      admins: state.users.filter(
        (u) => u.role === "PLATFORM_ADMIN" || u.role === "PLATFORM_MANAGER",
      ).length,
      suspended: state.users.filter((u) => u.status === "suspended").length,
      new7d: state.users.filter((u) => withinDays(u.createdAt, 7)).length,
      new30d: state.users.filter((u) => withinDays(u.createdAt, 30)).length,
    },
    // Установки приложения живут только в базе (device_tokens).
    installs: { total: 0, ios: 0, android: 0, web: 0, new30d: 0 },
    companies: {
      total: state.organizations.length,
      approved: state.organizations.filter((o) => o.status === "APPROVED").length,
      pending: state.organizations.filter((o) => o.status === "PENDING_APPROVAL").length,
      rejected: state.organizations.filter((o) => o.status === "REJECTED").length,
      suspended: state.organizations.filter((o) => o.status === "SUSPENDED").length,
      new30d: state.organizations.filter((o) => withinDays(o.createdAt, 30)).length,
    },
    tours: {
      total: state.tours.length,
      active: state.tours.filter((t) => t.status === "active").length,
    },
    bookings: {
      total: state.bookings.length,
      active: activeBookings.length,
      paid: paidBookings.length,
      gmv: activeBookings.reduce((s, b) => s + b.price, 0),
      paidSum: paidBookings.reduce((s, b) => s + b.price, 0),
      new30d: state.bookings.filter((b) => withinDays(b.createdAt, 30)).length,
    },
    requests: {
      total: state.tripRequests.length,
      open: state.tripRequests.filter(
        (r) => r.status === "NEW" || r.status === "IN_REVIEW" || r.status === "OFFERS_RECEIVED",
      ).length,
      tour: state.tripRequests.filter((r) => r.kind === "tour").length,
      assistance: state.tripRequests.filter((r) => r.kind === "assistance").length,
      new30d: state.tripRequests.filter((r) => withinDays(r.createdAt, 30)).length,
    },
    offers: { total: state.requestOffers.length },
    reviews: {
      total: state.companyReviews.length,
      avgRating: state.companyReviews.length
        ? Math.round(
            (state.companyReviews.reduce((s, r) => s + r.rating, 0) / state.companyReviews.length) *
              100,
          ) / 100
        : 0,
    },
    revenue,
    organizations: state.organizations.map((o) => {
      const orgBookings = activeBookings.filter((b) => b.organizationId === o.id);
      const orgReviews = state.companyReviews.filter((r) => r.organizationId === o.id);
      return {
        id: o.id,
        name: o.name,
        status: o.status,
        city: o.city,
        services: o.services ?? [],
        createdAt: o.createdAt,
        leads: orgLeads.get(o.id)?.size ?? 0,
        offers: state.requestOffers.filter((x) => x.organizationId === o.id).length,
        bookingsCount: orgBookings.length,
        bookingsSum: orgBookings.reduce((s, b) => s + b.price, 0),
        reviews: orgReviews.length,
        rating: orgReviews.length
          ? Math.round((orgReviews.reduce((s, r) => s + r.rating, 0) / orgReviews.length) * 10) / 10
          : 0,
      };
    }),
  };
}
