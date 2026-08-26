import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Inbox,
  Luggage,
  Megaphone,
  RefreshCw,
  Smartphone,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";

import { auditActionLabel, formatRelativeRu, orgName, userName } from "@/components/admin";
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

/** Человеческая строка «что именно и кто» для записи аудита. */
function auditDetail(log: {
  actorId?: string;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): string {
  const parts: string[] = [];
  const meta = log.meta ?? {};
  const pick = (key: string) => {
    const v = meta[key];
    return typeof v === "string" && v ? v : null;
  };
  const target = pick("email") ?? pick("name");
  if (target) parts.push(target);
  else if (log.entityType === "organization" && log.entityId) parts.push(orgName(log.entityId));
  else if (log.entityType === "user" && log.entityId) parts.push(userName(log.entityId));
  if (typeof meta["amount"] === "number") parts.push(formatPrice(meta["amount"]));
  if (pick("plan")) parts.push(`тариф ${pick("plan")}`);
  if (pick("status")) parts.push(String(pick("status")));
  if (log.actorId) parts.push(`— ${userName(log.actorId)}`);
  return parts.join(" · ");
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
  emphasis,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  to: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        emphasis
          ? "surface-card block border-primary/30 bg-primary/[0.04] p-4 ring-1 ring-primary/15 transition-colors hover:border-primary/40"
          : "surface-card block p-4 transition-colors hover:border-primary/30"
      }
    >
      <span
        className={
          emphasis
            ? "grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
            : "grid size-8 place-items-center rounded-lg bg-secondary text-foreground"
        }
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-2.5 truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
    </Link>
  );
}

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
  // Показываем только свежие ошибки синхронизации (24 часа): error-логи
  // никогда не чистятся, и вся история держала бы KPI красным вечно.
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const apiErrors = state.syncLogs.filter(
    (l) => l.status === "error" && new Date(l.createdAt).getTime() > dayAgo,
  );
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={
              load.status === "live"
                ? "size-2 rounded-full bg-success"
                : load.status === "loading"
                  ? "size-2 animate-pulse rounded-full bg-premium"
                  : "size-2 rounded-full bg-destructive"
            }
          />
          {load.status === "loading"
            ? "Загружаем статистику из базы…"
            : load.status === "live"
              ? `Живые данные · ${new Date(stats.generatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
              : "Показаны локальные данные"}
        </p>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={load.status === "loading"}>
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

      {/* Три главные цифры платформы — тёмная лента, как фирменный блок на главной. */}
      <div className="overflow-hidden rounded-3xl bg-ink text-primary-foreground">
        <div className="grid divide-y divide-primary-foreground/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Link
            to="/admin/users"
            className="group p-6 transition-colors hover:bg-primary-foreground/5 md:p-7"
          >
            <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
              <Users className="size-4" />
              Пользователи
            </div>
            <p className="mt-3 font-display text-4xl font-semibold tabular-nums tracking-tight">
              {formatNumber(stats.users.total)}
            </p>
            <p className="mt-2 text-sm text-primary-foreground/60">
              туристов {formatNumber(stats.users.tourists)} · +{formatNumber(stats.users.new7d)} за
              7 дней
            </p>
          </Link>
          <Link
            to="/admin/operators"
            className="group p-6 transition-colors hover:bg-primary-foreground/5 md:p-7"
          >
            <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
              <Building2 className="size-4" />
              Партнёры
            </div>
            <p className="mt-3 font-display text-4xl font-semibold tabular-nums tracking-tight">
              {formatNumber(stats.companies.total)}
            </p>
            <p className="mt-2 text-sm text-primary-foreground/60">
              {stats.companies.pending > 0 ? (
                <span className="font-medium text-premium">
                  {formatNumber(stats.companies.pending)} ждут одобрения
                </span>
              ) : (
                `${formatNumber(stats.companies.approved)} одобрено`
              )}
            </p>
          </Link>
          <Link
            to="/admin/bookings"
            className="group p-6 transition-colors hover:bg-primary-foreground/5 md:p-7"
          >
            <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
              <Wallet className="size-4" />
              Оборот (GMV)
            </div>
            <p className="mt-3 font-display text-4xl font-semibold tabular-nums tracking-tight">
              {formatPrice(stats.bookings.gmv)}
            </p>
            <p className="mt-2 text-sm text-primary-foreground/60">
              доход платформы {formatPrice(revenueTotal)}
            </p>
          </Link>
        </div>
      </div>

      {/* Остальные метрики — компактные плитки с иконками. */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={Inbox}
          label="Заявки (лиды)"
          value={formatNumber(stats.requests.total)}
          hint={`${formatNumber(stats.requests.open)} открыто`}
          to="/admin/bookings"
          emphasis={stats.requests.open > 0}
        />
        <StatTile
          icon={Megaphone}
          label="Предложений"
          value={formatNumber(stats.offers.total)}
          hint="ответы компаний"
          to="/admin/bookings"
        />
        <StatTile
          icon={Ticket}
          label="Бронирования"
          value={formatNumber(stats.bookings.total)}
          hint={`${formatNumber(stats.bookings.paid)} оплачено`}
          to="/admin/bookings"
        />
        <StatTile
          icon={Luggage}
          label="Активные туры"
          value={formatNumber(stats.tours.active)}
          hint={`в каталоге ${formatNumber(stats.tours.total)}`}
          to="/admin/operators"
        />
        <StatTile
          icon={Smartphone}
          label="Установки"
          value={formatNumber(stats.installs.total)}
          hint={`iOS ${formatNumber(stats.installs.ios)} · Android ${formatNumber(stats.installs.android)}`}
          to="/admin/push"
        />
        <StatTile
          icon={Wallet}
          label="Доход платформы"
          value={formatPrice(revenueTotal)}
          hint={
            revenueEntries.length
              ? `${revenueLabel[revenueEntries[0]![0]] ?? revenueEntries[0]![0]}: ${formatPrice(revenueEntries[0]![1])}`
              : "платежей пока нет"
          }
          to="/admin/payments"
        />
      </div>

      {categories.some((c) => c.companies > 0) ? (
        <div className="surface-card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Категории бизнесов</h2>
            <p className="text-xs text-muted-foreground">
              Лид — заявка, дошедшая до компании (предложение или переписка)
            </p>
          </div>
          <ul className="mt-5 space-y-4">
            {categories
              .filter((c) => c.companies > 0)
              .map((c) => {
                const max = Math.max(...categories.map((x) => x.companies), 1);
                return (
                  <li key={c.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{c.label}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatNumber(c.companies)} комп. · {formatNumber(c.leads)} лидов ·{" "}
                        {formatNumber(c.bookingsCount)} броней
                        {c.bookingsSum > 0 ? ` · ${formatPrice(c.bookingsSum)}` : ""}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(6, (c.companies / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : (
        <div className="surface-card mt-6 flex flex-col items-center gap-3 p-8 text-center sm:flex-row sm:text-left">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold">
              Категории заполнятся с первыми партнёрами
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Здесь появится разбивка по турам, экскурсиям, жилью, авто и спорту: компании, лиды и
              брони по каждой категории.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/operators">Партнёры</Link>
          </Button>
        </div>
      )}

      {topCompanies.length > 0 ? (
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
      ) : null}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Требует внимания</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Заявки партнёров на одобрение, ошибки API и платежей
          </p>
          {attention.length === 0 ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-success/8 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Всё спокойно</p>
                <p className="text-xs text-muted-foreground">
                  Нет заявок на одобрение, ошибок API и неудачных платежей.
                </p>
              </div>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {attention.slice(0, 8).map((item, i) => (
                <li key={`${item.to}-${i}`}>
                  <Link
                    to={item.to}
                    className="flex items-center gap-3 rounded-xl border border-premium/25 bg-premium/8 px-3 py-2.5 text-sm hover:bg-premium/15"
                  >
                    <AlertTriangle className="size-4 shrink-0 text-premium" />
                    <span className="min-w-0">
                      <span className="block font-medium">{item.title}</span>
                      <span className="block truncate text-muted-foreground">{item.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Быстрые переходы
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/operators">
                <Building2 className="size-3.5" />
                Партнёры
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/promotions">
                <Megaphone className="size-3.5" />
                Продвижение
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/api-monitoring">
                <RefreshCw className="size-3.5" />
                Мониторинг API
              </Link>
            </Button>
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">Последние действия</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Кто и что сделал в админке и кабинетах
              </p>
            </div>
            <Link
              to="/admin/audit-logs"
              className="text-sm font-medium text-primary hover:underline"
            >
              Весь журнал →
            </Link>
          </div>
          {state.auditLogs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Записей пока нет</p>
          ) : (
            <ul className="mt-4 max-h-96 divide-y divide-border overflow-y-auto text-sm">
              {state.auditLogs.slice(0, 10).map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{auditActionLabel[log.action] ?? log.action}</p>
                    {auditDetail(log) ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {auditDetail(log)}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeRu(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashShell>
  );
}
