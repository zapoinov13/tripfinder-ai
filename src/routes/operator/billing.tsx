import { createFileRoute } from "@tanstack/react-router";

import { DashShell } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/operator/billing")({
  head: () => ({
    meta: [
      { title: "Тариф и оплата — кабинет туроператора | Voyago" },
      { name: "description", content: "Текущий тариф, лимиты активных туров и другие планы." },
      { property: "og:title", content: "Тариф и оплата — Voyago" },
      { property: "og:description", content: "Управляйте подпиской вашей компании." },
    ],
  }),
  component: BillingPage,
});

const plans = [
  { name: "START", limit: "100 активных туров", price: "39 000 ₸ / месяц" },
  { name: "GROWTH", limit: "400 активных туров", price: "89 000 ₸ / месяц" },
  { name: "ENTERPRISE", limit: "Без лимита", price: "по запросу" },
];

function BillingPage() {
  return (
    <DashShell brand="Travel Company" items={operatorNav} title="Тариф и оплата">
      <div className="surface-card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              BUSINESS
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold">1 000 активных туров</h2>
            <p className="mt-1 text-muted-foreground">149 000 ₸ / месяц</p>
          </div>
          <Button>Увеличить лимит</Button>
        </div>
        <div className="mt-8">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Использовано</span>
            <span className="font-medium">728 / 1 000</span>
          </div>
          <Progress value={72.8} className="mt-3" />
        </div>
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold">Другие тарифы</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="surface-card p-6">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">{plan.name}</p>
            <p className="mt-3 font-display text-lg font-semibold">{plan.limit}</p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.price}</p>
            <Button variant="outline" className="mt-5 w-full">
              Выбрать
            </Button>
          </div>
        ))}
      </div>
    </DashShell>
  );
}