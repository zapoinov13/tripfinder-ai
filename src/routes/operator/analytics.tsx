import { createFileRoute } from "@tanstack/react-router";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { SalesChart } from "@/components/dash/sales-chart";
import { formatNumber, formatPrice } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/operator/analytics")({
  head: () => ({ meta: [{ title: "Аналитика оператора — TourGo" }] }),
  component: OperatorAnalyticsPage,
});

function OperatorAnalyticsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !organization) return null;

  const tours = state.tours.filter((t) => t.operatorOrgId === organization.id);
  const bookings = state.bookings.filter((b) => b.organizationId === organization.id);
  const views = tours.reduce((s, t) => s + t.views, 0);
  const clicks = Math.round(views * 0.18);
  const favorites = state.favorites.filter((f) =>
    tours.some((t) => t.id === f.tourId),
  ).length;
  const revenue = bookings
    .filter((b) => ["PAID", "CONFIRMED", "COMPLETED"].includes(b.status))
    .reduce((s, b) => s + b.price, 0);

  return (
    <DashShell brand={organization.name} items={operatorNav} title="Аналитика" subtitle="Org metrics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Impressions / Views" value={formatNumber(views)} />
        <KpiCard label="Clicks" value={formatNumber(clicks)} />
        <KpiCard label="Favorites" value={formatNumber(favorites)} />
        <KpiCard label="Revenue" value={formatPrice(revenue)} />
      </div>
      <div className="surface-card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Динамика</h2>
        <div className="mt-6 h-72">
          <SalesChart />
        </div>
      </div>
    </DashShell>
  );
}
