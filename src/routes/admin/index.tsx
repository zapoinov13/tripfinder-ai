import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  buildCategoryStats,
  fetchAdminOverviewStats,
  statsFromLocalStore,
  type AdminOverviewStats,
} from "@/lib/supabase/admin-stats";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Админ · TourGo" }] }),
  component: AdminDashboard,
});

const revenueLabel: Record<string, string> = {
  premium_subscription: "Premium-подписки",
  operator_subscription: "Подписки компаний",
  promotion: "Продвижение",
  advertising: "Реклама",
  tour_package: "Турпакеты",
  booking: "Бронирования",
};

type LoadState =
  | { status: "loading" }
  | { status: "live"; stats: AdminOverviewStats }
  | { status: "fallback"; reason: string };

function AdminDashboard() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  const refresh = useCallback(() => {
    setLoad({ status: "loading" });
    fetchAdminOverviewStats()
      .then((res) => {
        if (res.ok) setLoad({ status: "live", stats: res.stats });
        else setLoad({ status: "fallback", reason: res.reason });
      })
      .catch((e: unknown) => {
        setLoad({ status: "fallback", reason: e instanceof Error ? e.message : String(e) });
      });
  }, []);

  useEffect(() => {
    if (allowed) refresh();
  }, [allowed, refresh]);

  if (!allowed) return null;

  const stats = load.status === "live" ? load.stats : statsFromLocalStore(state);
  const categories = buildCategoryStats(stats.organizations);
  const topCompanies = [...stats.organizations]
    .sort(
      (a, b) =>
        b.leads + b.bookingsCount - (a.leads + a.bookingsCount) || b.bookingsSum - a.bookingsSum,
    )
    .slice(0, 8);
  const revenueEntries = Object.entries(stats.revenue).sort((a, b) => b[1] - a[1]);
  const revenueTotal = revenueEntries.reduce((s, [, v]) => s + v, 0);

  const pendingOps = state.organizations.filter((o) => o.status === "PENDING_APPROVAL");
  const failedPayments = state.payments.filter((p) => p.status === "failed");
  const apiErrors = state.syncLogs.filter((l) => l.status === "error");
  const connErrors = state.apiConnections.filter((c) => c.status === "error");

  const attention: Array<{ title: string; detail: string; to: string }> = [
    ...pendingOps.map((o) => ({
      title: "Компания ждёт одобрения",
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
      title="Обзор платформы"
      subtitle="Живая статистика из базы: пользователи, компании, лиды и бронирования"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {load.status === "loading"
            ? "Загружаем статистику из базы…"
            : load.status === "live"
              ? `Данные из базы на ${new Date(stats.generatedAt).toLocaleString("ru-RU")}`
              : "Показаны локальные данные"}
        </p>
        <Button size="sm" variant="outline" onClick={refresh} disabled={load.status === "loading"}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Обновить
        </Button>
      </div>

      {load.status === "fallback" ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Не удалось получить статистику из базы</p>
            <p className="mt-1 text-muted-foreground">
              Причина: {load.reason}. Показаны данные локального хранилища — они могут быть
              неполными.
              {load.reason.toLowerCase().includes("admin_overview_stats")
                ? " Примените миграцию supabase/migrations/20260826090000_admin_overview_stats.sql в SQL Editor."
                : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiLinkCard
          label="Зарегистрировано пользователей"
          value={formatNumber(stats.users.total)}
          to="/admin/users"
          hint={`+${formatNumber(stats.users.new7d)} за 7 дней · туристов ${formatNumber(stats.users.tourists)}`}
        />
        <KpiLinkCard
          label="Скачивания приложения"
          value={formatNumber(stats.installs.total)}
          to="/admin/push"
          hint={`iOS ${formatNumber(stats.installs.ios)} · Android ${formatNumber(stats.installs.android)} · Web ${formatNumber(stats.installs.web)}`}
        />
        <KpiLinkCard
          label="Бизнесы на платформе"
          value={formatNumber(stats.companies.total)}
          to="/admin/operators"
          hint={
            stats.companies.pending
              ? `${formatNumber(stats.companies.approved)} одобрено · ${formatNumber(stats.companies.pending)} на проверке`
              : `${formatNumber(stats.companies.approved)} одобрено`
          }
          tone={stats.companies.pending ? "warning" : "default"}
        />
        <KpiLinkCard
          label="Заявки туристов (лиды)"
          value={formatNumber(stats.requests.total)}
          to="/admin/bookings"
          hint={`${formatNumber(stats.requests.open)} открыто · предложений ${formatNumber(stats.offers.total)}`}
        />
        <KpiLinkCard
          label="Бронирования"
          value={formatNumber(stats.bookings.total)}
          to="/admin/bookings"
          hint={`${formatNumber(stats.bookings.paid)} оплачено · +${formatNumber(stats.bookings.new30d)} за 30 дней`}
        />
        <KpiLinkCard
          label="Сумма бронирований (GMV)"
          value={formatPrice(stats.bookings.gmv)}
          to="/admin/bookings"
          hint={`Оплачено ${formatPrice(stats.bookings.paidSum)}`}
        />
        <KpiLinkCard
          label="Активные туры"
          value={formatNumber(stats.tours.active)}
          to="/admin/tours"
          hint={`Всего в каталоге ${formatNumber(stats.tours.total)}`}
        />
        <KpiLinkCard
          label="Доход платформы"
          value={formatPrice(revenueTotal)}
          to="/admin/payments"
          hint={
            revenueEntries.length
              ? revenueEntries
                  .slice(0, 2)
                  .map(([t, v]) => `${revenueLabel[t] ?? t}: ${formatPrice(v)}`)
                  .join(" · ")
              : "Оплаченных платежей пока нет"
          }
        />
      </div>

      <div className="surface-card mt-8 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-6">
          <h2 className="font-display text-lg font-semibold">Категории бизнесов</h2>
          <p className="text-xs text-muted-foreground">
            Лид — заявка, дошедшая до компании (предложение или переписка)
          </p>
        </div>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Категория</TableHead>
              <TableHead className="text-right">Компаний</TableHead>
              <TableHead className="text-right">Лидов</TableHead>
              <TableHead className="text-right">Предложений</TableHead>
              <TableHead className="text-right">Броней</TableHead>
              <TableHead className="text-right">Сумма броней</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.label}</TableCell>
                <TableCell className="text-right">{formatNumber(c.companies)}</TableCell>
                <TableCell className="text-right">{formatNumber(c.leads)}</TableCell>
                <TableCell className="text-right">{formatNumber(c.offers)}</TableCell>
                <TableCell className="text-right">{formatNumber(c.bookingsCount)}</TableCell>
                <TableCell className="text-right">{formatPrice(c.bookingsSum)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="surface-card mt-6 overflow-x-auto">
        <div className="px-6 pt-6">
          <h2 className="font-display text-lg font-semibold">Топ компаний по активности</h2>
        </div>
        {topCompanies.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Компаний пока нет — статистика появится после первых регистраций.
          </p>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Компания</TableHead>
                <TableHead className="text-right">Лидов</TableHead>
                <TableHead className="text-right">Броней</TableHead>
                <TableHead className="text-right">Сумма броней</TableHead>
                <TableHead className="text-right">Рейтинг</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCompanies.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.city || "город не указан"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(o.leads)}</TableCell>
                  <TableCell className="text-right">{formatNumber(o.bookingsCount)}</TableCell>
                  <TableCell className="text-right">{formatPrice(o.bookingsSum)}</TableCell>
                  <TableCell className="text-right">
                    {o.reviews ? `${o.rating} (${formatNumber(o.reviews)})` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/operators">Компании</Link>
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
