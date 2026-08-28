import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  MessageSquare,
  Search,
  SearchX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, TabPills } from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import {
  buildMarketingStats,
  delta,
  type Metric,
  type Period,
} from "@/lib/platform/marketing-stats";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/admin/analytics")({
  head: () => privatePage("Аналитика · Админ"),
  component: AdminAnalyticsPage,
});

/**
 * Маркетинговая аналитика: сколько людей, куда они уходят и чего им не хватило.
 *
 * Прежняя версия показывала «Топ событий» и ленту — по ней нельзя было принять
 * ни одного решения. Здесь каждый блок отвечает на рабочий вопрос: растём ли мы
 * (цифры со сравнением к прошлому периоду), где теряем (воронка в процентах),
 * куда звать партнёров (спрос и поиски без результата), когда писать людям
 * (часы активности) и какие компании реально работают на трафике.
 */

function Delta({ metric, invert = false }: { metric: Metric; invert?: boolean }) {
  const value = delta(metric);
  if (value === null) {
    // Рост с нуля процентом не описывается — говорим словами.
    if (metric.prev === 0 && metric.value > 0) {
      return <span className="text-xs font-semibold text-success">первые за период</span>;
    }
    return <span className="text-xs text-muted-foreground">нет сравнения</span>;
  }
  if (value === 0)
    return <span className="text-xs text-muted-foreground">как в прошлый период</span>;
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        good ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value)}% к прошлому периоду
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  metric,
  format = (v: number) => formatNumber(v),
  hint,
}: {
  icon: LucideIcon;
  label: string;
  metric: Metric;
  format?: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-secondary text-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
        {format(metric.value)}
      </p>
      <div className="mt-1.5">
        <Delta metric={metric} />
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AdminAnalyticsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [period, setPeriod] = useState<Period>("30");

  const stats = useMemo(() => buildMarketingStats(state, period), [state, period]);

  if (!allowed) return null;

  const hasData = stats.searches.value > 0 || stats.audience.value > 0 || stats.guests > 0;
  const peakHour = stats.hours.indexOf(Math.max(...stats.hours));
  const hoursMax = Math.max(...stats.hours, 1);
  const periodName = period === "all" ? "всё время" : `${period} дней`;

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Аналитика"
      subtitle="Сколько людей приходит, где они теряются и чего не нашли."
    >
      <TabPills
        value={period}
        onChange={(v) => setPeriod(v as Period)}
        items={[
          { value: "7", label: "7 дней" },
          { value: "30", label: "30 дней" },
          { value: "all", label: "Всё время", count: state.analyticsEvents.length },
        ]}
      />

      {!hasData ? (
        <div className="mt-4">
          <EmptyState
            title="За период ничего не происходило"
            description="Цифры появятся сами, как только люди начнут искать и открывать предложения. Первым заполнится поиск."
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Users}
              label="Людей на платформе"
              metric={stats.audience}
              hint={
                stats.guests > 0
                  ? `и ещё ${formatNumber(stats.guests)} действий от гостей без аккаунта`
                  : "все действия — из аккаунтов"
              }
            />
            <MetricCard
              icon={Search}
              label="Поисков"
              metric={stats.searches}
              hint={`новых аккаунтов за ${periodName}: ${formatNumber(stats.newUsers.value)}`}
            />
            <MetricCard
              icon={MessageSquare}
              label="Обращений в компании"
              metric={stats.requests}
              hint={`дошло до сделки: ${formatNumber(stats.deals.value)}`}
            />
            <MetricCard
              icon={Activity}
              label="Поиск → обращение"
              metric={stats.conversion}
              format={(v) => `${v}%`}
              hint="главная метрика площадки"
            />
          </div>

          <section className="surface-card mt-6 overflow-hidden">
            <div className="border-b border-border bg-secondary/20 px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Путь до заявки</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Где именно теряются люди. Процент — сколько дошло с прошлого шага.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {stats.funnel.map((step) => (
                <li key={step.label} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-medium">
                      {step.label}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {step.hint}
                      </span>
                    </p>
                    <p className="font-display text-lg font-semibold tabular-nums">
                      {formatNumber(step.value)}
                      {step.ofPrev !== null ? (
                        <span
                          className={cn(
                            "ml-2 text-sm font-semibold",
                            step.ofPrev >= 50
                              ? "text-success"
                              : step.ofPrev >= 20
                                ? "text-premium"
                                : "text-destructive",
                          )}
                        >
                          {step.ofPrev}%
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${step.ofTop === null ? 100 : Math.max(2, step.ofTop)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card mt-6 overflow-hidden">
            <div className="border-b border-border bg-secondary/20 px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Спрос по дням</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Поиски и обращения рядом: видно, растёт ли интерес и превращается ли он в заявки.
              </p>
            </div>
            <div className="h-72 p-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend} margin={{ left: -8, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="ma-searches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ma-requests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatNumber(Number(value)),
                      name === "searches" ? "Поиски" : "Обращения",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Legend formatter={(value) => (value === "searches" ? "Поиски" : "Обращения")} />
                  <Area
                    type="monotone"
                    dataKey="searches"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    fill="url(#ma-searches)"
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#ma-requests)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
            <section className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Что ищут</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Направления и категории по числу поисков. Красным — доля поисков без результата.
              </p>
              {stats.demand.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Поисков за период не было.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {stats.demand.map((row) => {
                    const max = stats.demand[0]?.count ?? 1;
                    const emptyShare = row.count > 0 ? (row.empty / row.count) * 100 : 0;
                    return (
                      <li key={row.label}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{row.label}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatNumber(row.count)}
                            {row.empty > 0 ? (
                              <span className="text-destructive"> · {row.empty} пусто</span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
                          >
                            <div
                              className="h-full bg-destructive/70"
                              style={{ width: `${emptyShare}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="surface-card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <SearchX className="size-4 text-destructive" />
                Искали — не нашли
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Готовый спрос без предложения: сюда стоит звать партнёров в первую очередь.
              </p>
              {stats.unmet.length === 0 ? (
                <p className="mt-4 text-sm text-success">
                  Все поиски за период что-то находили — дыр в предложении нет.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {stats.unmet.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.04] px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">{row.label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatNumber(row.count)} раз
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {stats.queries.length > 0 ? (
                <>
                  <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Частые запросы словами
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {stats.queries.map((q) => (
                      <span
                        key={q.label}
                        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium"
                      >
                        {q.label}
                        <span className="ml-1 text-muted-foreground">{q.count}</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          </div>

          <section className="surface-card mt-6 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Clock className="size-4 text-muted-foreground" />
              Когда люди на платформе
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Пик — {String(peakHour).padStart(2, "0")}:00. В этот час лучше всего заходят push и
              рассылки.
            </p>
            <div className="mt-5 flex h-28 items-end gap-1">
              {stats.hours.map((count, hour) => (
                <div key={hour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all",
                      hour === peakHour ? "bg-primary" : "bg-primary/25",
                    )}
                    style={{ height: `${Math.max(2, (count / hoursMax) * 88)}px` }}
                    title={`${hour}:00 — ${count}`}
                  />
                  {hour % 6 === 0 ? (
                    <span className="text-[10px] tabular-nums text-muted-foreground">{hour}</span>
                  ) : (
                    <span className="text-[10px]">&nbsp;</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {stats.companies.length > 0 ? (
            <section className="surface-card mt-6 overflow-hidden">
              <div className="border-b border-border bg-secondary/20 px-5 py-4">
                <h2 className="font-display text-lg font-semibold">Компании на трафике</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Кому платформа привела людей и кто сумел их превратить в заявки.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Компания</TableHead>
                      <TableHead className="text-right">Просмотры</TableHead>
                      <TableHead className="text-right">Клики</TableHead>
                      <TableHead className="text-right">Заявки</TableHead>
                      <TableHead className="text-right">Конверсия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.companies.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(c.views)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(c.clicks)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(c.requests)}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.views > 0 ? (
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                c.cr >= 20
                                  ? "text-success"
                                  : c.cr > 0
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                              )}
                            >
                              {c.cr}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </DashShell>
  );
}
