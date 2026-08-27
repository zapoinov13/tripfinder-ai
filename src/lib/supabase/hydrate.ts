import { getHotel } from "@/data/demo";
import type { TourTag } from "@/data/demo";
import { getSupabase } from "@/lib/supabase/client";
import { setState } from "@/lib/platform/store";
import type {
  BookingSchedule,
  PlatformConfig,
  PlatformState,
  PlatformTour,
} from "@/lib/platform/types";

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
            premiumCurrency: (c["premium_currency"] ??
              next.config.premiumCurrency) as PlatformConfig["premiumCurrency"],
            operatorPlans:
              (c["operator_plans"] as PlatformConfig["operatorPlans"]) ?? next.config.operatorPlans,
            // Публичное вью не отдаёт цены продвижения и веса ранжирования.
            promotionPrices: next.config.promotionPrices,
            rankingWeights: next.config.rankingWeights,
          },
        };
      }

      if (orgsRes.data?.length) {
        next = {
          ...next,
          // Вью отдаёт только то, что можно показать туристу; остальное берём из локального стора.
          organizations: (orgsRes.data as Row[]).map((o) => {
            const prev = s.organizations.find((x) => x.id === str(o["id"]));
            return {
              ...(prev ?? ({} as (typeof s.organizations)[number])),
              id: str(o["id"]),
              name: str(o["name"]),
              legalName: prev?.legalName ?? "",
              registrationNumber: prev?.registrationNumber ?? "",
              country: str(o["country"]),
              city: str(o["city"]),
              address: prev?.address ?? "",
              phone: str(o["phone"], prev?.phone ?? ""),
              email: prev?.email ?? "",
              website: str(o["website"]),
              contactPerson: prev?.contactPerson ?? "",
              status: str(o["status"]) as (typeof s.organizations)[number]["status"],
              planCode: str(o["plan_code"]) as (typeof s.organizations)[number]["planCode"],
              additionalTourLimit: prev?.additionalTourLimit ?? 0,
              advertisingBalance: prev?.advertisingBalance ?? 0,
              promotionBalance: prev?.promotionBalance ?? 0,
              createdAt: str(o["created_at"]),
              services: strList(o["services"]),
              countries: strList(o["countries"]),
              clientCountries: strList(o["client_countries"]),
              languages: strList(o["languages"]),
              about: str(o["about"], prev?.about ?? ""),
              workingHours: str(o["working_hours"], prev?.workingHours ?? ""),
              ...bookingSchedulePatch(o["booking_schedule"], prev?.bookingSchedule),
              promoText: str(o["promo_text"], prev?.promoText ?? ""),
              promoUntil: str(o["promo_until"], prev?.promoUntil ?? ""),
              logoUrl: str(o["logo_url"], prev?.logoUrl ?? ""),
              coverUrl: str(o["cover_url"], prev?.coverUrl ?? ""),
              photos: strList(o["photos"]),
              videos: strList(o["videos"]),
              whatsapp: str(o["whatsapp"], prev?.whatsapp ?? ""),
              instagram: str(o["instagram"], prev?.instagram ?? ""),
              telegram: str(o["telegram"], prev?.telegram ?? ""),
              listedByPlatform: o["listed_by_platform"] === true,
            };
          }),
        };
      }

      if (toursRes.data?.length) {
        const mapped: PlatformTour[] = toursRes.data.flatMap((t) => {
          // Пропускаем строки на отели, которых нет в локальном каталоге: без них нет картинок.
          try {
            getHotel(t.hotel_id);
          } catch {
            return [];
          }
          return [
            {
              id: t.id,
              hotelId: t.hotel_id,
              operatorId: t.operator_id,
              operatorOrgId: t.operator_org_id ?? `org-${t.operator_id}`,
              offerCategory: "tour",
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
            },
          ];
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

/** Расписание записи: из БД, иначе из локального стора; пустое поле не пишем. */
function bookingSchedulePatch(raw: unknown, prev: BookingSchedule | undefined) {
  const fromDb =
    raw && typeof raw === "object" && "enabled" in (raw as Record<string, unknown>)
      ? (raw as BookingSchedule)
      : undefined;
  const value = fromDb ?? prev;
  return value ? { bookingSchedule: value } : {};
}

/** Настройки уведомлений: пустой объект из БД не перетирает «получать всё». */
function notifyPrefsPatch(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  if (!("requests" in value)) return {};
  return {
    notifyPrefs: {
      requests: value["requests"] !== false,
      messages: value["messages"] !== false,
      reviews: value["reviews"] !== false,
    },
  };
}

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => (v == null ? fallback : Number(v));
const strList = (v: unknown) =>
  Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : [];

/**
 * Данные конкретного пользователя: избранное, сравнение, алерты, уведомления, брони.
 * Платформенный админ дополнительно получает всех пользователей, все брони и аудит.
 */
type UserDataResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      favorites: number;
      bookings: number;
      notifications: number;
      requests: number;
      isAdmin: boolean;
    };

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

  const [
    favRes,
    cmpRes,
    alertRes,
    notifRes,
    bookRes,
    aiRes,
    profileRes,
    reqRes,
    offerRes,
    msgRes,
    reviewRes,
    svcReqRes,
    svcMsgRes,
  ] = await Promise.all([
    sb.from("favorites").select("*").eq("user_id", userId),
    sb.from("comparisons").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("price_alerts").select("*").eq("user_id", userId),
    sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(200),
    sb.from("ai_searches").select("*").order("created_at", { ascending: false }).limit(50),
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb.from("trip_requests").select("*").order("created_at", { ascending: false }).limit(200),
    sb.from("request_offers").select("*").order("created_at", { ascending: false }).limit(500),
    sb.from("request_messages").select("*").order("created_at", { ascending: true }).limit(1000),
    sb.from("company_reviews").select("*").order("created_at", { ascending: false }).limit(500),
    // RLS отдаёт свои заявки клиенту и заявки компании — её сотрудникам.
    sb.from("service_requests").select("*").order("created_at", { ascending: false }).limit(500),
    sb.from("service_messages").select("*").order("created_at", { ascending: true }).limit(1000),
  ]);

  const profileRow = profileRes.data as Row | null;
  const isAdmin = String(profileRow?.["role"] ?? "").startsWith("PLATFORM");
  const isOperator =
    String(profileRow?.["role"] ?? "").startsWith("OPERATOR") &&
    Boolean(profileRow?.["organization_id"]);

  // Бизнес видит события своей компании (просмотры страницы, контакты, визиты):
  // RLS отдаёт участнику организации только строки с payload.companyId его компании.
  const orgEventsRes =
    !isAdmin && isOperator
      ? await sb
          .from("analytics_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000)
      : null;

  const [allProfilesRes, auditRes, paymentsRes, promoRes, eventsRes] = isAdmin
    ? await Promise.all([
        sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
        // Раздел «Платежи» в админке: без этого он показывал только демо-данные.
        sb.from("payments").select("*").order("created_at", { ascending: false }).limit(300),
        // Раздел «Продвижение»: админ видит кампании всех компаний.
        sb.from("promotions").select("*").order("started_at", { ascending: false }).limit(300),
        // Раздел «Аналитика»: события всей платформы.
        sb
          .from("analytics_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000),
      ])
    : [null, null, null, null, null];

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

      if (reqRes.data) {
        const rows = reqRes.data as Row[];
        next = {
          ...next,
          tripRequests: rows.map((r) => ({
            id: str(r["id"]),
            userId: str(r["user_id"]),
            kind: str(r["kind"], "tour") as PlatformState["tripRequests"][number]["kind"],
            fromCity: str(r["from_city"]),
            destinationId: str(r["destination_id"]),
            destinationLabel: str(r["destination_label"]),
            dateStart: str(r["date_start"]),
            dateEnd: str(r["date_end"]),
            adults: num(r["adults"], 2),
            children: num(r["children"]),
            budget: num(r["budget"]),
            currency: str(r["currency"], "KZT") as PlatformTour["currency"],
            wishes: str(r["wishes"]),
            contactName: str(r["contact_name"]),
            contactPhone: str(r["contact_phone"]),
            status: str(r["status"], "NEW") as PlatformState["tripRequests"][number]["status"],
            ...(r["chosen_offer_id"] ? { chosenOfferId: str(r["chosen_offer_id"]) } : {}),
            declinedByOrgIds: Array.isArray(r["declined_by_org_ids"])
              ? (r["declined_by_org_ids"] as string[])
              : [],
            createdAt: str(r["created_at"]),
            updatedAt: str(r["updated_at"], str(r["created_at"])),
          })),
        };
      }

      if (offerRes.data) {
        const rows = offerRes.data as Row[];
        next = {
          ...next,
          requestOffers: rows.map((r) => ({
            id: str(r["id"]),
            requestId: str(r["request_id"]),
            organizationId: str(r["organization_id"]),
            ...(r["tour_id"] ? { tourId: str(r["tour_id"]) } : {}),
            hotelName: str(r["hotel_name"]),
            nights: num(r["nights"], 7),
            meal: str(r["meal"]),
            flightIncluded: Boolean(r["flight_included"]),
            transferIncluded: Boolean(r["transfer_included"]),
            insuranceIncluded: Boolean(r["insurance_included"]),
            price: num(r["price"]),
            currency: str(r["currency"], "KZT") as PlatformTour["currency"],
            includes: str(r["includes"]),
            comment: str(r["comment"]),
            status: str(r["status"], "SENT") as PlatformState["requestOffers"][number]["status"],
            createdAt: str(r["created_at"]),
          })),
        };
      }

      if (msgRes.data) {
        const rows = msgRes.data as Row[];
        next = {
          ...next,
          requestMessages: rows.map((r) => ({
            id: str(r["id"]),
            requestId: str(r["request_id"]),
            organizationId: str(r["organization_id"]),
            userId: str(r["user_id"]),
            authorSide: str(
              r["author_side"],
              "TOURIST",
            ) as PlatformState["requestMessages"][number]["authorSide"],
            authorName: str(r["author_name"]),
            text: str(r["text"]),
            readByTourist: Boolean(r["read_by_tourist"]),
            readByCompany: Boolean(r["read_by_company"]),
            createdAt: str(r["created_at"]),
          })),
        };
      }

      if (reviewRes.data) {
        const rows = reviewRes.data as Row[];
        next = {
          ...next,
          companyReviews: rows.map((r) => ({
            id: str(r["id"]),
            organizationId: str(r["organization_id"]),
            userId: str(r["user_id"]),
            authorName: str(r["author_name"]),
            ...(r["request_id"] ? { requestId: str(r["request_id"]) } : {}),
            rating: num(r["rating"], 5),
            text: str(r["text"]),
            createdAt: str(r["created_at"]),
            ...(r["reply"] ? { reply: str(r["reply"]) } : {}),
            ...(r["reply_at"] ? { replyAt: str(r["reply_at"]) } : {}),
            ...(r["reply_by_user_id"] ? { replyByUserId: str(r["reply_by_user_id"]) } : {}),
            ...(r["reply_by_name"] ? { replyByName: str(r["reply_by_name"]) } : {}),
          })),
        };
      }

      if (svcReqRes.data) {
        const rows = svcReqRes.data as Row[];
        next = {
          ...next,
          serviceRequests: rows.map((r) => ({
            id: str(r["id"]),
            organizationId: str(r["organization_id"]),
            ...(r["user_id"] ? { userId: str(r["user_id"]) } : {}),
            ...(r["listing_id"] ? { listingId: str(r["listing_id"]) } : {}),
            listingName: str(r["listing_name"]),
            contactName: str(r["contact_name"]),
            contactPhone: str(r["contact_phone"]),
            date: str(r["date"]),
            time: str(r["time"]),
            people: num(r["people"], 1),
            comment: str(r["comment"]),
            status: str(r["status"], "NEW") as PlatformState["serviceRequests"][number]["status"],
            replyComment: str(r["reply_comment"]),
            createdAt: str(r["created_at"]),
            updatedAt: str(r["updated_at"], str(r["created_at"])),
          })),
        };
      }

      if (svcMsgRes.data) {
        const rows = svcMsgRes.data as Row[];
        next = {
          ...next,
          serviceMessages: rows.map((r) => ({
            id: str(r["id"]),
            requestId: str(r["request_id"]),
            organizationId: str(r["organization_id"]),
            userId: str(r["user_id"]),
            authorSide: str(
              r["author_side"],
              "CLIENT",
            ) as PlatformState["serviceMessages"][number]["authorSide"],
            authorName: str(r["author_name"]),
            text: str(r["text"]),
            readByClient: Boolean(r["read_by_client"]),
            readByCompany: Boolean(r["read_by_company"]),
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
            ...notifyPrefsPatch(r["notify_prefs"]),
            createdAt: str(r["created_at"]),
          })),
        };
      }

      if (paymentsRes?.data) {
        const rows = paymentsRes.data as Row[];
        next = {
          ...next,
          payments: rows.map((r) => ({
            id: str(r["id"]),
            userId: str(r["user_id"]),
            ...(r["organization_id"] ? { organizationId: str(r["organization_id"]) } : {}),
            amount: num(r["amount"]),
            currency: str(r["currency"], "KZT") as PlatformState["payments"][number]["currency"],
            type: str(r["type"], "booking") as PlatformState["payments"][number]["type"],
            provider: (r["provider"] === "balance"
              ? "balance"
              : "mock") as PlatformState["payments"][number]["provider"],
            providerPaymentId: str(r["provider_payment_id"], str(r["id"])),
            status: str(r["status"], "pending") as PlatformState["payments"][number]["status"],
            ...(r["metadata"] ? { metadata: r["metadata"] as Record<string, unknown> } : {}),
            createdAt: str(r["created_at"]),
          })),
        };
      }

      if (promoRes?.data) {
        const rows = promoRes.data as Row[];
        next = {
          ...next,
          promotions: rows.map((r) => ({
            id: str(r["id"]),
            organizationId: str(r["organization_id"]),
            tourOfferId: str(r["tour_offer_id"]),
            type: str(r["type"], "BOOST") as PlatformState["promotions"][number]["type"],
            durationDays: num(r["duration_days"], 7),
            price: num(r["price"]),
            currency: str(r["currency"], "KZT") as PlatformState["promotions"][number]["currency"],
            status: str(r["status"], "ACTIVE") as PlatformState["promotions"][number]["status"],
            startedAt: str(r["started_at"]),
            expiresAt: str(r["expires_at"]),
          })),
        };
      }

      if (eventsRes?.data) {
        const rows = eventsRes.data as Row[];
        next = {
          ...next,
          analyticsEvents: rows.map((r) => ({
            id: str(r["id"]),
            type: str(r["type"]),
            ...(r["user_id"] ? { userId: str(r["user_id"]) } : {}),
            payload: (r["payload"] as Record<string, unknown>) ?? {},
            createdAt: str(r["created_at"]),
          })),
        };
      }

      if (orgEventsRes?.data) {
        // Union по id: серверные события компании поверх локально записанных.
        const rows = orgEventsRes.data as Row[];
        const server = rows.map((r) => ({
          id: str(r["id"]),
          type: str(r["type"]),
          ...(r["user_id"] ? { userId: str(r["user_id"]) } : {}),
          payload: (r["payload"] as Record<string, unknown>) ?? {},
          createdAt: str(r["created_at"]),
        }));
        const serverIds = new Set(server.map((e) => e.id));
        next = {
          ...next,
          analyticsEvents: [...server, ...next.analyticsEvents.filter((e) => !serverIds.has(e.id))],
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
    requests: reqRes.data?.length ?? 0,
    isAdmin,
  };
}
