import { getHotel } from "@/data/demo";
import type { TourTag } from "@/data/demo";
import { getSupabase } from "@/lib/supabase/client";
import { setState } from "@/lib/platform/store";
import type { PlatformConfig, PlatformTour } from "@/lib/platform/types";

/** Pull public catalog + config from Supabase into local store (keeps UI reactive). */
export async function hydrateCatalogFromSupabase() {
  const sb = getSupabase();
  if (!sb) return { ok: false as const, reason: "not_configured" };

  const [configRes, toursRes, orgsRes] = await Promise.all([
    sb.from("platform_config").select("*").eq("id", 1).maybeSingle(),
    sb.from("tour_offers").select("*").eq("status", "active").limit(500),
    sb.from("organizations").select("*"),
  ]);

  if (configRes.error && toursRes.error) {
    return { ok: false as const, reason: configRes.error.message || toursRes.error.message };
  }

  setState((s) => {
    let next = { ...s };

    if (configRes.data) {
      const c = configRes.data;
      next = {
        ...next,
        config: {
          ...next.config,
          premiumMonthlyPrice: Number(c.premium_monthly_price),
          premiumCurrency: c.premium_currency,
          operatorPlans: (c.operator_plans as PlatformConfig["operatorPlans"]) ?? next.config.operatorPlans,
          promotionPrices:
            (c.promotion_prices as PlatformConfig["promotionPrices"]) ?? next.config.promotionPrices,
          rankingWeights:
            (c.ranking_weights as PlatformConfig["rankingWeights"]) ?? next.config.rankingWeights,
        },
      };
    }

    if (orgsRes.data?.length) {
      next = {
        ...next,
        organizations: orgsRes.data.map((o) => ({
          id: o.id,
          name: o.name,
          legalName: o.legal_name,
          registrationNumber: o.registration_number,
          country: o.country,
          city: o.city,
          address: o.address,
          phone: o.phone,
          email: o.email,
          website: o.website,
          contactPerson: o.contact_person,
          status: o.status,
          planCode: o.plan_code,
          additionalTourLimit: o.additional_tour_limit,
          advertisingBalance: Number(o.advertising_balance),
          promotionBalance: Number(o.promotion_balance),
          createdAt: o.created_at,
        })),
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
  });

  return {
    ok: true as const,
    tours: toursRes.data?.length ?? 0,
    hasConfig: Boolean(configRes.data),
  };
}
