import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";

import {
  KpiLinkCard,
  auditActionLabel,
  eventLabel,
  formatRelativeRu,
  orgName,
} from "@/components/admin";
import { useAdminNav } from "@/components/dash/nav-items";
import { DashShell } from "@/components/dash/dash-shell";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Админ · TourGo" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  if (!allowed) return null;

  const tourists = state.users.filter(
    (u) => u.role === "TOURIST" || u.role === "PREMIUM_TOURIST",
  ).length;
  const premium = state.users.filter((u) => u.role === "PREMIUM_TOURIST").length;
  const pendingOps = state.organizations.filter((o) => o.status === "PENDING_APPROVAL");
  const operators = state.organizations.filter((o) => o.status === "APPROVED").length;
  const tours = state.tours.filter((t) => t.status === "active").length;
  const bookings = state.bookings.length;
  const gmv = state.bookings.reduce((s, b) => s + b.price, 0);
  const subRev = state.payments
    .filter((p) => p.type.includes("subscription") && p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const adRev = state.payments
    .filter((p) => (p.type === "promotion" || p.type === "advertising") && p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const failedPayments = state.payments.filter((p) => p.status === "failed");
  const apiErrors = state.syncLogs.filter((l) => l.status === "error");
  const connErrors = state.apiConnections.filter((c) => c.status === "error");

  const attention: Array<{ title: string; detail: string; to: string }> = [
    ...pendingOps.map((o) => ({
      title: "Оператор ждёт одобрения",
      detail: o.name,
      to: "/admin/operators",
    })),
    ...connErrors.map((c) => ({
      title: "Ошибка API-подключения",
      detail: orgName(c.organizationId),
      to: "/admin/api-monitoring",
    })),
    ...apiErrors.slice(0, 3).map((l) => ({
      title: "Ошибка синхронизации",
      detail: l.message,
      to: "/admin/api-monitoring",
    })),
    ...failedPayments.slice(0, 3).map((p) => ({
      title: "Неудачный платёж",
      detail: formatPrice(p.amount),
      to: "/admin/payments",
    })),
  ];

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Обзор"
      subtitle="Ключевые показатели и задачи"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiLinkCard
          label="Туристы"
          value={formatNumber(tourists)}
          to="/admin/users"
          hint="Все роли туристов"
        />
        <KpiLinkCard
          label="Premium"
          value={formatNumber(premium)}
          to="/admin/premium"
          hint="Активные Premium"
        />
        <KpiLinkCard
          label="Операторы"
          value={formatNumber(operators)}
          to="/admin/operators"
          hint={pendingOps.length ? `${pendingOps.length} на проверке` : "Одобренные"}
          tone={pendingOps.length ? "warning" : "default"}
        />
        <KpiLinkCard label="Активные туры" value={formatNumber(tours)} to="/admin/tours" />
        <KpiLinkCard label="Бронирования" value={formatNumber(bookings)} to="/admin/bookings" />
        <KpiLinkCard label="Оборот (GMV)" value={formatPrice(gmv)} to="/admin/bookings" />
        <KpiLinkCard label="Доход с подписок" value={formatPrice(subRev)} to="/admin/payments" />
        <KpiLinkCard label="Реклама / промо" value={formatPrice(adRev)} to="/admin/promotions" />
        <KpiLinkCard
          label="Ошибки API"
          value={formatNumber(apiErrors.length + connErrors.length)}
          to="/admin/api-monitoring"
          tone={apiErrors.length || connErrors.length ? "danger" : "default"}
          hint="Синхронизации и подключения"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <h2 className="font-display text-lg font-semibold">Требует внимания</h2>
          </div>
          {attention.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Сейчас всё спокойно, срочных задач нет.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {attention.slice(0, 8).map((item, i) => (
                <li key={`${item.to}-${i}`}>
                  <Link
                    to={item.to}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/70 px-3 py-2.5 text-sm hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{item.title}</span>
                      <span className="block truncate text-muted-foreground">{item.detail}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/operators">Операторы</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/api-monitoring">API</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/audit-logs">Аудит</Link>
            </Button>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Последние действия</h2>
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
            {state.auditLogs.slice(0, 12).map((log) => (
              <li key={log.id} className="rounded-xl bg-secondary/50 px-3 py-2">
                <span className="font-medium">{auditActionLabel[log.action] ?? log.action}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatRelativeRu(log.createdAt)}
                </span>
              </li>
            ))}
            {state.auditLogs.length === 0 ? (
              <li className="text-muted-foreground">Записей аудита пока нет</li>
            ) : null}
          </ul>
          <h2 className="mt-6 font-display text-lg font-semibold">События</h2>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
            {state.analyticsEvents.slice(0, 8).map((e) => (
              <li key={e.id}>
                {eventLabel[e.type] ?? e.type} · {formatRelativeRu(e.createdAt)}
              </li>
            ))}
            {state.analyticsEvents.length === 0 ? <li>Событий пока нет</li> : null}
          </ul>
        </div>
      </div>
    </DashShell>
  );
}
