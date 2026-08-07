import { Link, createFileRoute } from "@tanstack/react-router";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { operatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { SalesChart } from "@/components/dash/sales-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice, getHotel } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/operator/")({
  head: () => ({
    meta: [{ title: "Кабинет туроператора — Voyago" }],
  }),
  component: OperatorDashboard,
});

function OperatorDashboard() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  if (!allowed || !user || !organization) {
    return <div className="grid min-h-screen place-items-center text-sm">Нет доступа…</div>;
  }

  const orgTours = state.tours.filter((t) => t.operatorOrgId === organization.id);
  const active = orgTours.filter((t) => t.status === "active");
  const bookings = state.bookings.filter((b) => b.organizationId === organization.id);
  const views = orgTours.reduce((s, t) => s + t.views, 0);
  const revenue = bookings
    .filter((b) => ["PAID", "CONFIRMED", "COMPLETED"].includes(b.status))
    .reduce((s, b) => s + b.price, 0);
  const api = state.apiConnections.find((c) => c.organizationId === organization.id);
  const plan = state.config.operatorPlans.find((p) => p.code === organization.planCode);

  return (
    <DashShell
      brand={organization.name}
      items={operatorNav}
      title={`Добрый день, ${organization.name}`}
      subtitle={`План ${organization.planCode} · API: ${api?.status ?? "disconnected"} · ${organization.status}`}
      actions={
        <Button size="sm" asChild>
          <Link to="/operator/tours">Мои туры</Link>
        </Button>
      }
    >
      {organization.status === "PENDING_APPROVAL" ? (
        <div className="mb-6 rounded-2xl bg-premium/15 p-4 text-sm">
          Компания ожидает одобрения администратора (PENDING_APPROVAL).
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Активные туры" value={formatNumber(active.length)} hint={`лимит ${plan?.tourLimit ?? "—"}`} />
        <KpiCard label="Просмотры" value={formatNumber(views)} />
        <KpiCard label="Заявки / брони" value={formatNumber(bookings.length)} />
        <KpiCard label="Revenue" value={formatPrice(revenue)} />
        <KpiCard
          label="Conversion"
          value={`${views ? ((bookings.length / views) * 100).toFixed(2) : 0}%`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_minmax(0,1fr)]">
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Продажи</h2>
          <div className="mt-6 h-72">
            <SalesChart />
          </div>
        </div>
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Статус</h2>
          <ul className="mt-6 space-y-3 text-sm">
            <li>Тариф: {organization.planCode}</li>
            <li>API: {api?.status ?? "нет"}</li>
            <li>Последний sync: {api?.lastSyncAt ? new Date(api.lastSyncAt).toLocaleString("ru-RU") : "—"}</li>
            <li>Promo balance: {formatPrice(organization.promotionBalance)}</li>
          </ul>
        </div>
      </div>

      <div className="surface-card mt-6 overflow-hidden">
        <div className="p-6">
          <h2 className="font-display text-lg font-semibold">Лучшие туры</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тур</TableHead>
                <TableHead>Просмотры</TableHead>
                <TableHead>Брони</TableHead>
                <TableHead className="text-right">Цена</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...orgTours]
                .sort((a, b) => b.bookings - a.bookings)
                .slice(0, 6)
                .map((tour) => {
                  const hotel = getHotel(tour.hotelId);
                  return (
                    <TableRow key={tour.id}>
                      <TableCell className="font-medium">
                        {hotel.name}
                        <span className="block text-xs text-muted-foreground">
                          {hotel.city} · {tour.nights} ночей
                        </span>
                      </TableCell>
                      <TableCell>{formatNumber(tour.views)}</TableCell>
                      <TableCell>{tour.bookings}</TableCell>
                      <TableCell className="text-right">{formatPrice(tour.price)}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashShell>
  );
}
