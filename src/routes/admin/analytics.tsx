import { createFileRoute } from "@tanstack/react-router";
import { Activity, Eye, MousePointerClick, Search } from "lucide-react";
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

import {
  EmptyState,
  KpiLinkCard,
  TabPills,
  eventLabel,
  formatRelativeRu,
  userName,
} from "@/components/admin";
import { DashShell } from "@/components/dash/dash-shell";
import { useAdminNav } from "@/components/dash/nav-items";
import { formatNumber } from "@/data/demo";
import { useRequireAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Аналитика · Админ" }] }),
  component: AdminAnalyticsPage,
});

const DAY_MS = 86400000;

/** Просмотровые события — интерес; остальное считаем действиями. */
const VIEW_EVENTS = new Set([
  "SEARCH_COMPLETED",
  "AI_SEARCH_STARTED",
  "TOUR_VIEWED",
  "COMPANY_PAGE_VIEW",
  "PREMIUM_VIEWED",
]);

const dayLabel = (d: Date) =>
  d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");

function AdminAnalyticsPage() {
  const { allowed } = useRequireAuth(["PLATFORM_ADMIN", "PLATFORM_MANAGER"]);
  const nav = useAdminNav();
  const state = usePlatformStore();
  const [period, setPeriod] = useState<"7" | "30" | "all">("30");

  const events = useMemo(() => {
    if (period === "all") return state.analyticsEvents;
    const since = Date.now() - Number(period) * DAY_MS;
    return state.analyticsEvents.filter((e) => new Date(e.createdAt).getTime() >= since);
  }, [state.analyticsEvents, period]);

  const kpis = useMemo(() => {
    let searches = 0;
    let views = 0;
    let clicks = 0;
    let checkins = 0;
    for (const e of events) {
      if (e.type === "SEARCH_COMPLETED" || e.type === "AI_SEARCH_STARTED") searches += 1;
      if (e.type === "TOUR_VIEWED" || e.type === "COMPANY_PAGE_VIEW") views += 1;
      if (e.type === "COMPANY_CONTACT_CLICK") clicks += 1;
      if (e.type === "COMPANY_CHECKIN") checkins += 1;
    }
    return { searches, views, clicks, checkins };
  }, [events]);

  const trend = useMemo(() => {
    const days = period === "all" ? 30 : Number(period);
    const buckets: { day: string; views: number; actions: number }[] = [];
    const index = new Map<string, number>();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      index.set(key, buckets.length);
      buckets.push({ day: dayLabel(d), views: 0, actions: 0 });
    }
    for (const e of state.analyticsEvents) {
      const key = e.createdAt.slice(0, 10);
      const at = index.get(key);
      if (at === undefined) continue;
      if (VIEW_EVENTS.has(e.type)) buckets[at]!.views += 1;
      else buckets[at]!.actions += 1;
    }
    return buckets;
  }, [state.analyticsEvents, period]);

  const funnel = useMemo(() => {
    const chosen = state.tripRequests.filter((r) => r.status === "CHOSEN").length;
    return [
      {
        label: "Поиски",
        value: kpis.searches,
        hint: "обычный и AI-поиск",
      },
      {
        label: "Просмотры",
        value: kpis.views,
        hint: "туры и страницы компаний",
      },
      {
        label: "Заявки",
        value: state.tripRequests.length,
        hint: "оставили заявку",
      },
      {
        label: "Выбрали компанию",
        value: chosen,
        hint: "сделка состоялась",
      },
    ];
  }, [kpis, state.tripRequests]);

  if (!allowed) return null;

  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;
  const trendHasData = trend.some((p) => p.views || p.actions);

  return (
    <DashShell
      brand="TourGo Админ"
      items={nav}
      title="Аналитика"
      subtitle="Что делают люди на платформе: поиски, просмотры, клики и визиты."
    >
      <TabPills
        value={period}
        onChange={(v) => setPeriod(v as typeof period)}
        items={[
          { value: "7", label: "7 дней" },
          { value: "30", label: "30 дней" },
          { value: "all", label: "Всё время", count: state.analyticsEvents.length },
        ]}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiLinkCard label="Поиски" value={formatNumber(kpis.searches)} hint="обычный и AI-поиск" />
        <KpiLinkCard
          label="Просмотры"
          value={formatNumber(kpis.views)}
          hint="туры и страницы компаний"
        />
        <KpiLinkCard
          label="Клики по контактам"
          value={formatNumber(kpis.clicks)}
          hint="маршрут, WhatsApp, звонки"
        />
        <KpiLinkCard
          label="Визиты из приложения"
          value={formatNumber(kpis.checkins)}
          hint="чекины у партнёров"
        />
      </div>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-b border-border bg-secondary/20 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Активность по дням</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Просмотры (интерес) и действия (клики, заявки, визиты, сообщения).
          </p>
        </div>
        <div className="p-5">
          {trendHasData ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -8, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="pa-views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pa-actions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatNumber(Number(value)),
                      name === "views" ? "Просмотры" : "Действия",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Legend formatter={(value) => (value === "views" ? "Просмотры" : "Действия")} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    fill="url(#pa-views)"
                  />
                  <Area
                    type="monotone"
                    dataKey="actions"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#pa-actions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center py-14 text-center">
              <Activity className="size-10 text-muted-foreground" />
              <p className="mt-3 font-medium">За период событий пока нет</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                График заполнится сам, когда туристы начнут искать и открывать предложения.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="surface-card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Воронка туриста</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          От поиска до выбранной компании{period === "all" ? "" : ` · за ${period} дней`} (заявки —
          за всё время).
        </p>
        <div className="mt-5 grid gap-2 lg:grid-cols-4">
          {funnel.map((step, i) => {
            const prev = funnel[i - 1]?.value ?? step.value;
            const drop = i > 0 && prev > 0 ? Math.round((1 - step.value / prev) * 100) : 0;
            return (
              <div
                key={step.label}
                className="rounded-2xl border border-border bg-secondary/30 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {step.label}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                  {formatNumber(step.value)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{step.hint}</p>
                {i > 0 && drop > 0 && prev > 0 ? (
                  <p className="mt-2 text-[11px] font-medium text-premium">−{drop}% от шага выше</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Событий пока нет"
            description="Появятся по мере использования сайта и приложения"
          />
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Топ событий</h2>
            <div className="mt-4 space-y-3">
              {sorted.slice(0, 10).map(([type, count]) => (
                <div key={type}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{eventLabel[type] ?? type}</span>
                    <span className="font-medium tabular-nums">{formatNumber(count)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(6, (count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Живая лента</h2>
            <ul className="mt-4 max-h-96 divide-y divide-border overflow-y-auto text-sm">
              {events.slice(0, 40).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {e.type === "COMPANY_CONTACT_CLICK" ? (
                      <MousePointerClick className="size-3.5 shrink-0 text-primary" />
                    ) : VIEW_EVENTS.has(e.type) ? (
                      e.type.startsWith("SEARCH") || e.type.startsWith("AI") ? (
                        <Search className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Eye className="size-3.5 shrink-0 text-muted-foreground" />
                      )
                    ) : (
                      <Activity className="size-3.5 shrink-0 text-success" />
                    )}
                    <span className="truncate">
                      {eventLabel[e.type] ?? e.type}
                      <span className="text-muted-foreground">
                        {" · "}
                        {e.userId ? userName(e.userId) : "аноним"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeRu(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </DashShell>
  );
}
