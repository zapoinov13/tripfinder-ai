import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Покупка продвижения на сервере.
 *
 * Раньше кампания, списание баланса и запись о платеже создавались в браузере
 * и уезжали в базу синком. Партнёр с обычным токеном мог вписать себе кампанию
 * напрямую, минуя оплату. Теперь цену считает сервер по platform_config,
 * баланс списывает он же, а таблицы promotions и payments закрыты для записи
 * из браузера — туда пишет только эта функция под service role.
 */

// Держим в одном списке с PromotionType и DEFAULT_PRICES в promotions.ts.
const promotionTypes = [
  "BOOST",
  "FEATURED",
  "SPONSORED",
  "PREMIUM_PLACEMENT",
  "HOME_FEATURE",
] as const;
type PromotionType = (typeof promotionTypes)[number];

const DEFAULT_PRICES: Record<PromotionType, number> = {
  BOOST: 15000,
  FEATURED: 35000,
  SPONSORED: 55000,
  PREMIUM_PLACEMENT: 45000,
  HOME_FEATURE: 75000,
};

const schema = z.object({
  organizationId: z.string().uuid(),
  tourOfferId: z.string().min(1).max(200),
  type: z.enum(promotionTypes),
  days: z.number().int().min(1).max(90),
  payFromBalance: z.boolean().default(true),
});

export type PurchasePromotionServerResult =
  | {
      ok: true;
      promotion: {
        id: string;
        organizationId: string;
        tourOfferId: string;
        type: PromotionType;
        durationDays: number;
        price: number;
        currency: "KZT";
        status: "ACTIVE";
        startedAt: string;
        expiresAt: string;
      };
      balance: number;
    }
  | { ok: false; reason: string };

export const purchasePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }): Promise<PurchasePromotionServerResult> => {
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin.server");
    const supabaseAdmin = getSupabaseAdmin();
    const admin = supabaseAdmin;

    // Кампанию покупает только сотрудник этой компании (или админ платформы).
    const { data: profile } = await admin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", context.userId)
      .maybeSingle();

    const isAdmin = profile?.role === "PLATFORM_ADMIN" || profile?.role === "PLATFORM_MANAGER";
    if (!isAdmin && profile?.organization_id !== data.organizationId) {
      return { ok: false, reason: "Нет доступа к этой компании" };
    }

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .select("id, promotion_balance")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (orgError || !org) return { ok: false, reason: "Компания не найдена" };

    // Цену берём из настроек платформы, а не из тела запроса.
    const { data: config } = await admin
      .from("platform_config")
      .select("promotion_prices")
      .eq("id", 1)
      .maybeSingle();
    const configured = (config?.promotion_prices ?? {}) as Partial<Record<PromotionType, number>>;
    const weekly = Number(configured[data.type] ?? DEFAULT_PRICES[data.type]);
    const price = Math.round((weekly * (data.days / 7)) / 1000) * 1000;
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, reason: "Некорректная цена продвижения" };
    }

    const balance = Number(org.promotion_balance ?? 0);
    if (data.payFromBalance && balance < price) {
      return {
        ok: false,
        reason: `На балансе ${balance.toLocaleString("ru-RU")} ₸, нужно ${price.toLocaleString("ru-RU")} ₸`,
      };
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + data.days * 86400000);
    const promotionId = crypto.randomUUID();

    const { error: insertError } = await admin.from("promotions").insert({
      id: promotionId,
      organization_id: data.organizationId,
      tour_offer_id: data.tourOfferId,
      type: data.type,
      duration_days: data.days,
      price,
      currency: "KZT",
      status: "ACTIVE",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
    if (insertError) return { ok: false, reason: insertError.message };

    let nextBalance = balance;
    if (data.payFromBalance) {
      nextBalance = balance - price;
      const { error: balanceError } = await admin
        .from("organizations")
        .update({ promotion_balance: nextBalance })
        .eq("id", data.organizationId);
      if (balanceError) {
        await admin.from("promotions").delete().eq("id", promotionId);
        return { ok: false, reason: balanceError.message };
      }
    }

    await admin.from("payments").insert({
      user_id: context.userId,
      organization_id: data.organizationId,
      amount: price,
      currency: "KZT",
      type: "promotion",
      provider: data.payFromBalance ? "balance" : "mock",
      provider_payment_id: data.payFromBalance ? `balance-${promotionId}` : crypto.randomUUID(),
      status: "paid",
      metadata: {
        tourId: data.tourOfferId,
        type: data.type,
        days: data.days,
        promotionId,
      },
    });

    return {
      ok: true,
      promotion: {
        id: promotionId,
        organizationId: data.organizationId,
        tourOfferId: data.tourOfferId,
        type: data.type,
        durationDays: data.days,
        price,
        currency: "KZT",
        status: "ACTIVE",
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      balance: nextBalance,
    };
  });
