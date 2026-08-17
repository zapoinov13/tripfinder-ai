import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/demo";
import { mockPaymentProvider } from "@/lib/platform/adapters";
import { appendAudit, pushNotification } from "@/lib/platform/catalog";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { nowIso, setState, uid } from "@/lib/platform/store";
import type { OperatorPlanCode } from "@/lib/platform/types";

export const Route = createFileRoute("/operator/billing")({
  head: () => ({ meta: [{ title: "Тариф поставщика — TourGo" }] }),
  component: OperatorBillingPage,
});

function OperatorBillingPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !organization || !user) {
    return (
      <DashShell
        brand="Поставщик"
        items={operatorNav}
        title="Тариф"
        subtitle="Доступно администратору поставщика"
      >
        <p className="text-sm text-muted-foreground">Недостаточно прав или нет организации.</p>
      </DashShell>
    );
  }

  const selectPlan = async (code: OperatorPlanCode) => {
    const plan = state.config.operatorPlans.find((p) => p.code === code)!;
    const payment = await mockPaymentProvider.createPayment({
      amount: plan.price,
      currency: plan.currency,
      type: "operator_subscription",
      metadata: { plan: code },
    });
    setState((s) => ({
      ...s,
      organizations: s.organizations.map((o) =>
        o.id === organization.id ? { ...o, planCode: code } : o,
      ),
      payments: [
        {
          id: uid(),
          userId: user.id,
          organizationId: organization.id,
          amount: plan.price,
          currency: plan.currency,
          type: "operator_subscription",
          provider: "mock",
          providerPaymentId: payment.providerPaymentId,
          status: "paid",
          createdAt: nowIso(),
          metadata: { plan: code },
        },
        ...s.payments,
      ],
      subscriptions: [
        {
          id: uid(),
          organizationId: organization.id,
          planId: code,
          status: "active",
          startedAt: nowIso(),
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          autoRenew: true,
          providerSubscriptionId: payment.providerPaymentId,
        },
        ...s.subscriptions.filter((sub) => sub.organizationId !== organization.id),
      ],
    }));
    appendAudit({
      actorId: user.id,
      action: "operator_plan_change",
      entityType: "organization",
      entityId: organization.id,
      meta: { plan: code },
    });
    pushNotification(
      user.id,
      "subscription_expiry",
      `Тариф ${code}`,
      `Активирован план ${plan.name}`,
    );
    toast.success(`Тариф ${code} активен`);
  };

  return (
    <DashShell
      brand={organization.name}
      items={operatorNav}
      title="Тариф"
      subtitle={`Текущий: ${organization.planCode}`}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {state.config.operatorPlans.map((plan) => (
          <div key={plan.code} className="surface-card p-6">
            <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 font-display text-2xl">{formatPrice(plan.price)}</p>
            <p className="mt-1 text-sm text-muted-foreground">до {plan.tourLimit} предложений</p>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={organization.planCode === plan.code ? "secondary" : "default"}
              disabled={organization.planCode === plan.code}
              onClick={() => selectPlan(plan.code)}
            >
              {organization.planCode === plan.code ? "Текущий" : "Выбрать"}
            </Button>
          </div>
        ))}
      </div>
    </DashShell>
  );
}
