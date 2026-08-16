import { getHotel } from "@/data/demo";
import type { TourTag } from "@/data/demo";
import { getSupabase } from "@/lib/supabase/client";
import { setState } from "@/lib/platform/store";
import type { PlatformConfig, PlatformState, PlatformTour } from "@/lib/platform/types";

/** Pull public catalog + config from Supabase into local store (keeps UI reactive). */
export async function hydrateCatalogFromSupabase() {
  const sb = getSupabase();
  if (!sb) return { ok: false as const, reason: "not_configured" };

  const [configRes, toursRes, orgsRes] = await Promise.all([
    sb.from("platform_config_public").select("*").eq("id", 1).maybeSingle(),
    sb.from("tour_offers").select("*").eq("status", "active").limit(500),
    sb.from("organizations_public").select("*"),
  ]);

  if (configRes.error && toursRes.error) {
    return { ok: false as const, reason: configRes.error.message || toursRes.error.message };
  }

  // silent: приезжающие из БД данные не должны улетать обратно как изменения
  setState(
    (s) => {
      let next = { ...s };

      if (configRes.data) {
        const c = configRes.data as Record<string, unknown>;
        next = {
          ...next,
          config: {
            ...next.config,
            premiumMonthlyPrice: Number(c["premium_monthly_price"]),
            premiumCurrency: String(c["premium_currency"] ?? next.config.premiumCurrency),
            operatorPlans:
              (c["operator_plans"] as PlatformConfig["operatorPlans"]) ?? next.config.operatorPlans,
            promotionPrices: next.config.promotionPrices,
            rankingWeights: next.config.rankingWeights,
          },
        };
      }

      if (orgsRes.data?.length) {
        next = {
          ...next,
          organizations: (orgsRes.data as Record<string, unknown>[]).map((o) => {
            const prev = s.organizations.find((x) => x.id === String(o["id"]));
            return {
              ...(prev ?? ({} as (typeof s.organizations)[number])),
              id: String(o["id"]),
              name: String(o["name"] ?? ""),
              legalName: prev?.legalName ?? "",
              registrationNumber: prev?.registrationNumber ?? "",
              country: String(o["country"] ?? ""),
              city: String(o["city"] ?? ""),
              address: prev?.address ?? "",
              phone: prev?.phone ?? "",
              email: prev?.email ?? "",
              website: String(o["website"] ?? ""),
              contactPerson: prev?.contactPerson ?? "",
              status: String(o["status"] ?? "") as (typeof s.organizations)[number]["status"],
              planCode: String(o["plan_code"] ?? "") as (typeof s.organizations)[number]["planCode"],
              additionalTourLimit: prev?.additionalTourLimit ?? 0,
              advertisingBalance: prev?.advertisingBalance ?? 0,
              promotionBalance: prev?.promotionBalance ?? 0,
              createdAt: String(o["created_at"] ?? ""),
            };
          }),
        };
      }

      if (toursRes.data?.length) {
        const mapped: PlatformTour[] = toursRes.data.map((t) => {
          // ensure hotel exists locally for images
          try {
            getHotel(t.hotel_id);
          } catch {
            /* ignore */
          }
          return {
            id: t.id,
            hotelId: t.hotel_id,
            operatorId: t.operator_id,
            operatorOrgId: t.operator_org_id ?? `org-${t.operator_id}`,
            from: t.from_city,
            nights: t.nights,
            dateStart: t.date_start,
            dateEnd: t.date_end,
            departure: t.departure,
            mealCode: t.meal_code,
            meal: t.meal,
            price: Number(t.price),
            ...(t.old_price != null ? { oldPrice: Number(t.old_price) } : {}),
            ...(t.premium_price != null ? { premiumPrice: Number(t.premium_price) } : {}),
            tags: (t.tags ?? []) as TourTag[],
            adults: t.adults,
            children: t.children,
            transfer: t.transfer,
            views: t.views,
            bookings: t.bookings,
            createdAt: t.created_at?.slice?.(0, 10) ?? t.created_at,
            externalId: t.external_id,
            roomType: t.room_type,
            currency: t.currency,
            availability: t.availability,
            status: t.status,
            lastSyncedAt: t.last_synced_at,
          };
        });
        next = { ...next, tours: mapped };
      }

      return next;
    },
    { silent: true },
  );

  return {
    ok: true as const,
    tours: toursRes.data?.length ?? 0,
    hasConfig: Boolean(configRes.data),
  };
}

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => (v == null ? fallback : Number(v));

/**
 * Данные конкретного пользователя: избранное, сравнение, алерты, уведомления, брони.
 * Платформенный админ дополнительно получает всех пользователей, все брони и аудит.
 */
type UserDataResult =
  | { ok: false; reason: string }
  | { ok: true; favorites: number; bookings: number; notifications: number; isAdmin: boolean };

let inFlight: { userId: string; at: number; promise: Promise<UserDataResult> } | null = null;

/** Supabase присылает несколько auth-событий подряд, поэтому близкие вызовы склеиваем. */
export function hydrateUserDataFromSupabase(userId: string, force = false) {
  if (!force && inFlight?.userId === userId && Date.now() - inFlight.at < 15000) {
    return inFlight.promise;
  }
  const promise = loadUserData(userId);
  inFlight = { userId, at: Date.now(), promise };
  return promise;
}

async function loadUserData(userId: string): Promise<UserDataResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false as const, reason: "not_configured" };

  const [favRes, cmpRes, alertRes, notifRes, bookRes, aiRes, profileRes] = await Promise.all([
    sb.from("favorites").select("*").eq("user_id", userId),
    sb.from("comparisons").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("price_alerts").select("*").eq("user_id", userId),
    sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(200),
    sb.from("ai_searches").select("*").order("created_at", { ascending: false }).limit(50),
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
  ]);

  const isAdmin = String((profileRes.data as Row | null)?.["role"] ?? "").startsWith("PLATFORM");

  const [allProfilesRes, auditRes] = isAdmin
    ? await Promise.all([
        sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
      ])
    : [null, null];

  setState(
    (s) => {
      let next = { ...s };

      if (favRes.data) {
        const rows = favRes.data as Row[];
        next = {
          ...next,
          favorites: [
            ...next.favorites.filter((f) => f.userId !== userId),
            ...rows.map((r) => ({
              id: str(r["id"]),
              userId,
              tourId: str(r["tour_id"]),
              createdAt: str(r["created_at"]),
            })),
          ],
        };
      }

      const cmp = cmpRes.data as Row | null;
      if (cmp) {
        const tourIds = Array.isArray(cmp["tour_ids"]) ? (cmp["tour_ids"] as string[]) : [];
        next = {
          ...next,
          comparisons: [
            ...next.comparisons.filter((c) => c.userId !== userId),
            { userId, tourIds },
          ],
        };
      }

      if (alertRes.data) {
        const rows = alertRes.data as Row[];
        next = {
          ...next,
          priceAlerts: [
            ...next.priceAlerts.filter((a) => a.userId !== userId),
            ...rows.map((r) => ({
              id: str(r["id"]),
              userId,
              tourId: str(r["tour_id"]),
              targetPrice: num(r["target_price"]),
              currentPrice: num(r["current_price"]),
              currency: str(r["currency"], "KZT") as PlatformTour["currency"],
              status: str(r["status"], "active") as "active" | "triggered",
              createdAt: str(r["created_at"]),
            })),
          ],
        };
      }

      if (notifRes.data) {
        const rows = notifRes.data as Row[];
        next = {
          ...next,
          notifications: rows.map((r) => ({
            id: str(r["id"]),
            userId: str(r["user_id"]),
            type: str(r["type"]),
            title: str(r["title"]),
            body: str(r["body"]),
            read: Boolean(r["read"]),
            createdAt: str(r["created_at"]),
            payload: (r["payload"] as Record<string, unknown>) ?? {},
          })),
        };
      }

      if (bookRes.data) {
        const rows = bookRes.data as Row[];
        next = {
          ...next,
          bookings: rows.map((r) => ({
            id: str(r["id"]),
            userId: str(r["user_id"]),
            operatorId: str(r["operator_id"]),
            organizationId: str(r["organization_id"]),
            tourOfferId: str(r["tour_offer_id"]),
            ...(r["external_booking_id"]
              ? { externalBookingId: str(r["external_booking_id"]) }
              : {}),
            status: str(r["status"], "PENDING") as PlatformState["bookings"][number]["status"],
            passengers: (r["passengers"] as PlatformState["bookings"][number]["passengers"]) ?? [],
            price: num(r["price"]),
            currency: str(r["currency"], "KZT") as PlatformTour["currency"],
            paymentStatus: str(
              r["payment_status"],
              "pending",
            ) as PlatformState["bookings"][number]["paymentStatus"],
            createdAt: str(r["created_at"]),
            updatedAt: str(r["updated_at"], str(r["created_at"])),
          })),
        };
      }

      if (aiRes.data) {
        const rows = aiRes.data as Row[];
        next = {
          ...next,
          aiSearches: rows.map((r) => ({
            id: str(r["id"]),
            userId: str(r["user_id"]),
            originalQuery: str(r["original_query"]),
            parsed: (r["parsed"] as Record<string, unknown>) ?? {},
            searchParams:
              (r["search_params"] as PlatformState["aiSearches"][number]["searchParams"]) ?? {},
            resultsCount: num(r["results_count"]),
            createdAt: str(r["created_at"]),
          })),
        };
      }

      if (allProfilesRes?.data) {
        const rows = allProfilesRes.data as Row[];
        next = {
          ...next,
          users: rows.map((r) => ({
            id: str(r["id"]),
            email: str(r["email"]),
            password: "",
            name: str(r["name"]),
            city: str(r["city"], "Алматы"),
            role: str(r["role"], "TOURIST") as PlatformState["users"][number]["role"],
            status: str(r["status"], "active") as PlatformState["users"][number]["status"],
            ...(r["organization_id"] ? { organizationId: str(r["organization_id"]) } : {}),
            createdAt: str(r["created_at"]),
          })),
        };
      }

      if (auditRes?.data) {
        const rows = auditRes.data as Row[];
        next = {
          ...next,
          auditLogs: rows.map((r) => ({
            id: str(r["id"]),
            ...(r["actor_id"] ? { actorId: str(r["actor_id"]) } : {}),
            action: str(r["action"]),
            entityType: str(r["entity_type"]),
            ...(r["entity_id"] ? { entityId: str(r["entity_id"]) } : {}),
            meta: (r["meta"] as Record<string, unknown>) ?? {},
            createdAt: str(r["created_at"]),
          })),
        };
      }

      return next;
    },
    { silent: true },
  );

  return {
    ok: true as const,
    favorites: favRes.data?.length ?? 0,
    bookings: bookRes.data?.length ?? 0,
    notifications: notifRes.data?.length ?? 0,
    isAdmin,
  };
}
