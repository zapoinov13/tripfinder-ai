import { createFileRoute } from "@tanstack/react-router";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { adminNav } from "@/components/dash/nav-items";
import { formatNumber, formatPrice } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Админ — Voyago" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const state = usePlatformStore();
  if (!allowed) return null;

  const tourists = state.users.filter((u) =>
    u.role === "TOURIST" || u.role === "PREMIUM_TOURIST",
  ).length;
  const premium = state.users.filter((u) => u.role === "PREMIUM_TOURIST").length;
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
  const apiErrors = state.syncLogs.filter((l) => l.status === "error").length;

  return (
    <DashShell
      brand="Voyago Админ"
      items={adminNav}
      title="Обзор"
      subtitle="Ключевые показатели платформы"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Туристы" value={formatNumber(tourists)} />
        <KpiCard label="Premium-пользователи" value={formatNumber(premium)} />
        <KpiCard label="Активные операторы" value={formatNumber(operators)} />
        <KpiCard label="Активные туры" value={formatNumber(tours)} />
        <KpiCard label="Бронирования" value={formatNumber(bookings)} />
        <KpiCard label="Оборот (GMV)" value={formatPrice(gmv)} />
        <KpiCard label="Доход с подписок" value={formatPrice(subRev)} />
        <KpiCard label="Доход с рекламы / промо" value={formatPrice(adRev)} />
        <KpiCard label="Ошибки API" value={formatNumber(apiErrors)} />
      </div>
    </DashShell>
  );
}
