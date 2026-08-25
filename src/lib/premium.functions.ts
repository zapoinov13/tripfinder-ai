import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Premium activation via service role: users cannot change role directly in profiles.
 *
 * ВНИМАНИЕ: реального платёжного провайдера ещё нет, поэтому активация
 * закрыта фичефлагом. Пока PREMIUM_MOCK_CHECKOUT=true, любой авторизованный
 * получает Premium бесплатно (mock-оплата): это режим стенда. Перед запуском
 * платежей флаг убрать, а активацию вызывать только из вебхука провайдера
 * после подтверждённой оплаты.
 */
export const activatePremiumSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (process.env["PREMIUM_MOCK_CHECKOUT"] !== "true") {
      throw new Error("Оплата Premium ещё не подключена. Активация возможна только после оплаты.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin;
    const userId = context.userId;
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);

    const { data: configRow } = await admin
      .from("platform_config")
      .select("premium_monthly_price, premium_currency")
      .eq("id", 1)
      .maybeSingle();

    const amount = Number(configRow?.premium_monthly_price ?? 4990);
    const currency = String(configRow?.premium_currency ?? "KZT");

    const { error: roleError } = await admin
      .from("profiles")
      .update({ role: "PREMIUM_TOURIST" })
      .eq("id", userId)
      .in("role", ["TOURIST"]);

    if (roleError) throw new Error(roleError.message);

    await admin.from("subscriptions").delete().eq("user_id", userId);
    const { error: subError } = await admin.from("subscriptions").insert({
      user_id: userId,
      plan_id: "premium-monthly",
      status: "active",
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      auto_renew: true,
    });
    if (subError) throw new Error(subError.message);

    await admin.from("payments").insert({
      user_id: userId,
      amount,
      currency,
      type: "premium_subscription",
      provider: "mock",
      provider_payment_id: crypto.randomUUID(),
      status: "paid",
    });

    return { ok: true as const };
  });
