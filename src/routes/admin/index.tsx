import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  Building2,
  CheckCircle2,
  Inbox,
  Luggage,
  RefreshCw,
  Smartphone,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";

import {
  auditToneClass,
  auditView,
  formatRelativeRu,
  orgName,
  ROUTINE_ACTIONS,
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
import { cn } from "@/lib/utils";
import {
  buildCategoryStats,
  fetchAdminOverviewStats,
  statsFromLocalStore,
  type AdminOverviewStats,
} from "@/lib/supabase/admin-stats";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/")({
  head: () => privatePage("Админ · TourGo"),
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
      {/* Многоточие вместо «Заявки турфирмам» ничего не сообщает: пусть
          подпись переносится на вторую строку. */}
      <p className="mt-2.5 text-xs leading-tight text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{hint}</p>
    </Link>
  );
}

/**
 * Три главные цифры платформы.
 *
 * Раньше это была тёмная лента во всю ширину: она спорила со светлой админкой
 * и тянула взгляд на себя вместо того, чтобы показывать цифры. Теперь карточки
 * того же семейства, что и остальные плитки, но крупнее и с цветным акцентом —
 * иерархия видна, а страница остаётся спокойной.
 */
function HeroStat({
  icon: Icon,
  label,
  value,
  hint,
  to,
  tone = "neutral",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: ReactNode;
  to: string;
  tone?: "neutral" | "primary" | "success";
}) {
  const chip =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "success"
        ? "bg-success/15 text-success"
        : "bg-secondary text-foreground";
  const glow =
    tone === "primary"
      ? "from-primary/[0.07]"
      : tone === "success"
        ? "from-success/[0.08]"
        : "from-secondary/60";

  return (
    <Link
      to={to}
      className="surface-card group relative overflow-hidden p-5 transition-colors hover:border-primary/30 md:p-6"
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
          glow,
        )}
      />
      <span className="relative flex items-center gap-2.5">
        <span className={cn("grid size-9 place-items-center rounded-xl", chip)}>
          <Icon className="size-[18px]" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <ArrowUpRight className="ml-auto size-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
      </span>
      <p className="relative mt-4 font-display text-[2.15rem] font-semibold leading-none tabular-nums tracking-tight md:text-[2.5rem]">
        {value}
      </p>
      <p className="relative mt-2.5 text-sm text-muted-foreground">{hint}</p>
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
  // Заявки клиентов бизнесам приходят из локального стора: RPC обзора их не считает.
  const serviceRequestsTotal = state.serviceRequests.length;
  const serviceRequestsNew = state.serviceRequests.filter((r) => r.status === "NEW").length;
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

  const pendingClaims = state.companyClaims.filter((c) => c.status === "NEW");

  const attention: Array<{ title: string; detail: string; to: string }> = [
    ...pendingOps.map((o) => ({
      title: "Компания ждёт одобрения",
      detail: o.name,
      to: "/admin/operators",
    })),
    ...pendingClaims.map((c) => ({
      title: "Владелец просит доступ к карточке",
      detail: `${orgName(c.organizationId)} · ${c.contactName}`,
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

  /* Вход и перенос гостевых данных случаются каждый день у каждого — в обзоре
     они вытесняли единственную запись о том, что кто-то удалил компанию. */
  const recentActions = state.auditLogs
    .filter((log) => !ROUTINE_ACTIONS.has(log.action))
    .slice(0, 8)
    .map((log) => ({ log, view: auditView(log) }));

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

      <div className="grid gap-3 sm:grid-cols-3">
        <HeroStat
          icon={Users}
          label="Пользователи"
          value={formatNumber(stats.users.total)}
          hint={`туристов ${formatNumber(stats.users.tourists)} · +${formatNumber(stats.users.new7d)} за 7 дней`}
          to="/admin/users"
        />
        <HeroStat
          icon={Building2}
          label="Партнёры"
          value={formatNumber(stats.companies.total)}
          tone={stats.companies.pending > 0 ? "primary" : "neutral"}
          hint={
            stats.companies.pending > 0 ? (
              <span className="font-medium text-primary">
                {formatNumber(stats.companies.pending)} ждут одобрения
              </span>
            ) : (
              `${formatNumber(stats.companies.approved)} одобрено`
            )
          }
          to="/admin/operators"
        />
        <HeroStat
          icon={Wallet}
          label="Оборот (GMV)"
          value={formatPrice(stats.bookings.gmv)}
          tone={stats.bookings.gmv > 0 ? "success" : "neutral"}
          hint={`доход платформы ${formatPrice(revenueTotal)}`}
          to="/admin/bookings"
        />
      </div>

      {/* Остальные метрики — компактные плитки с иконками. */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={Inbox}
          label="Заявки турфирмам"
          value={formatNumber(stats.requests.total)}
          hint={`${formatNumber(stats.requests.open)} открыто · ${formatNumber(stats.offers.total)} предложений`}
          to="/admin/bookings"
          emphasis={stats.requests.open > 0}
        />
        <StatTile
          icon={CalendarCheck}
          label="Записи в компании"
          value={formatNumber(serviceRequestsTotal)}
          hint={
            serviceRequestsNew > 0
              ? `${formatNumber(serviceRequestsNew)} ждут ответа`
              : "зал, жильё, авто"
          }
          to="/admin/bookings"
          emphasis={serviceRequestsNew > 0}
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
              : "движений денег пока не было"
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
                    {/* Полоса — шкала «кто активнее», а не тревога: тонкая и
                        приглушённая, чтобы не кричала при одинаковых числах. */}
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/70"
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
            /* Пусто — значит делать нечего: одна строка вместо панели на
               полкарточки. Место в обзоре должно занимать то, что требует
               решения, а не сообщение о его отсутствии. */
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" />
              Разобрано — открытых задач нет
            </p>
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
          {attention.length > 8 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              и ещё {attention.length - 8} — разбирайте по разделам слева
            </p>
          ) : null}
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
          {recentActions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Значимых действий пока не было — входы и переносы данных лежат в журнале.
            </p>
          ) : (
            <ul className="mt-4 space-y-1">
              {recentActions.map(({ log, view }) => (
                <li key={log.id} className="flex items-start gap-3 py-1.5">
                  <span
                    className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                      auditToneClass[view.tone],
                    )}
                  >
                    <view.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {view.title}
                      {view.target ? (
                        <span className="font-normal text-muted-foreground"> · {view.target}</span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {view.extra ? `${view.extra} · ` : ""}
                      {view.actor} · {formatRelativeRu(log.createdAt)}
                    </span>
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
