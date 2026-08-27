import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Eye,
  Heart,
  Inbox,
  Megaphone,
  MessageCircle,
  Minus,
  Star,
  Target,
  TrendingUp,
  Wallet,
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

import { TabPills } from "@/components/admin";
import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice, nightsLabel, tourCover } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { businessMoney, listingPerformance, recordsWord } from "@/lib/platform/business-stats";
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import {
  computeOperatorAnalytics,
  deltaLabel,
  pct,
  type AnalyticsPeriod,
} from "@/lib/platform/operator-analytics";
import { usePlatformStore } from "@/lib/platform/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/analytics")({
  head: () => ({ meta: [{ title: "Аналитика · TourGo" }] }),
  component: OperatorAnalyticsPage,
});

type TourSort = "views" | "bookings" | "conversion";

function OperatorAnalyticsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [tourSort, setTourSort] = useState<TourSort>("views");

  void state.analyticsEvents.length;
  void state.requestOffers.length;
  void state.bookings.length;

  const data = useMemo(
    () => (organization ? computeOperatorAnalytics(organization.id, period) : null),
    [
      organization,
      period,
      state.analyticsEvents,
      state.requestOffers,
      state.bookings,
      state.favorites,
      state.payments,
      state.promotions,
      state.requestMessages,
      state.tripRequests,
      state.tours,
      state.companyReviews,
    ],
  );

  const pageStats = useMemo(() => {
    if (!organization) return null;
    const since = period === 0 ? 0 : Date.now() - period * 24 * 60 * 60 * 1000;
    const events = state.analyticsEvents.filter(
      (e) =>
        e.payload?.["companyId"] === organization.id &&
        (since === 0 || new Date(e.createdAt).getTime() >= since),
    );
    const views = events.filter((e) => e.type === "COMPANY_PAGE_VIEW").length;
    const clicks: Record<string, number> = {};
    for (const e of events) {
      if (e.type !== "COMPANY_CONTACT_CLICK") continue;
      const channel = typeof e.payload?.["channel"] === "string" ? e.payload["channel"] : "other";
      clicks[channel] = (clicks[channel] ?? 0) + 1;
    }
    const checkinEvents = events.filter((e) => e.type === "COMPANY_CHECKIN");
    const recentVisits = checkinEvents.slice(0, 6).map((e) => {
      const name =
        typeof e.payload?.["userName"] === "string" && e.payload["userName"]
          ? e.payload["userName"]
          : (state.users.find((u) => u.id === e.userId)?.name ?? "Клиент");
      return { id: e.id, name, at: e.createdAt };
    });
    return { views, clicks, checkins: checkinEvents.length, recentVisits };
  }, [organization, period, state.analyticsEvents, state.users]);

  // «Бизнес без туров»: динамика страницы компании вместо туровых метрик.
  const bizStats = useMemo(() => {
    if (!organization) return null;
    const all = state.analyticsEvents.filter((e) => e.payload?.["companyId"] === organization.id);
    const days = period === 0 ? 30 : period;
    const now = Date.now();
    const since = now - days * 24 * 60 * 60 * 1000;
    const prevSince = since - days * 24 * 60 * 60 * 1000;
    const inWindow = (e: (typeof all)[number], from: number, to: number) => {
      const t = new Date(e.createdAt).getTime();
      return t >= from && t < to;
    };
    const cur = all.filter((e) => (period === 0 ? true : inWindow(e, since, now + 1)));
    const prev = period === 0 ? [] : all.filter((e) => inWindow(e, prevSince, since));
    const count = (list: typeof all, type: string) => list.filter((e) => e.type === type).length;

    const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
    const trend: { day: string; views: number; actions: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = now - (i + 1) * 24 * 60 * 60 * 1000;
      const end = now - i * 24 * 60 * 60 * 1000;
      const bucket = all.filter((e) => inWindow(e, start, end));
      trend.push({
        day: dayFmt.format(new Date(end)).replace(".", ""),
        views: bucket.filter((e) => e.type === "COMPANY_PAGE_VIEW").length,
        actions: bucket.filter(
          (e) => e.type === "COMPANY_CONTACT_CLICK" || e.type === "COMPANY_CHECKIN",
        ).length,
      });
    }
    return {
      views: count(cur, "COMPANY_PAGE_VIEW"),
      viewsPrev: count(prev, "COMPANY_PAGE_VIEW"),
      clicks: count(cur, "COMPANY_CONTACT_CLICK"),
      clicksPrev: count(prev, "COMPANY_CONTACT_CLICK"),
      checkins: count(cur, "COMPANY_CHECKIN"),
      checkinsPrev: count(prev, "COMPANY_CHECKIN"),
      trend,
      hasTrend: trend.some((p) => p.views || p.actions),
    };
  }, [organization, period, state.analyticsEvents]);

  const money = useMemo(
    () => (organization ? businessMoney(organization.id, period) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organization?.id, period, state.serviceRequests, state.promotions],
  );
  const listingRows = useMemo(
    () => (organization ? listingPerformance(organization.id, period) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organization?.id, period, state.serviceRequests],
  );

  if (!allowed || !organization || !data) return null;

  const businessOnly = isBusinessOnlyServices(organization.services);

  const sortedTours = [...data.topTours].sort((a, b) => {
    if (tourSort === "bookings") return b.bookings - a.bookings;
    if (tourSort === "conversion") return b.conversion - a.conversion;
    return b.views - a.views;
  });

  const cityMax = data.cities[0]?.views || 1;
  const trendHasData = data.trend.some((p) => p.views || p.offers || p.picks || p.revenue);

  const pageStatsSection = pageStats ? (
    <section className="surface-card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Страница компании</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Кто заходит на вашу визитку и куда нажимает: маршрут, WhatsApp, звонки.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/company/$companyId" params={{ companyId: organization.id }}>
            Открыть страницу
          </Link>
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <PageStat label="Просмотры страницы" value={pageStats.views} />
        <PageStat label="Маршрут (карта)" value={pageStats.clicks["map"] ?? 0} />
        <PageStat label="WhatsApp" value={pageStats.clicks["whatsapp"] ?? 0} />
        <PageStat label="Позвонить" value={pageStats.clicks["phone"] ?? 0} />
        <PageStat label="Instagram" value={pageStats.clicks["instagram"] ?? 0} />
        <PageStat label="Пришли из приложения" value={pageStats.checkins} />
      </div>
      {pageStats.recentVisits.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-success/25 bg-success/5 p-4">
          <p className="text-sm font-semibold">Последние визиты</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Клиенты нажали «Я здесь» на вашей странице — пришли по факту.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {pageStats.recentVisits.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{v.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(v.at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pageStats.views === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Пока тихо. Заполните страницу (адрес, часы, фото) и поделитесь ссылкой — клики начнут
          считаться автоматически.
        </p>
      ) : null}
    </section>
  ) : null;

  const periodTabs = (
    <TabPills
      value={String(period)}
      onChange={(v) => setPeriod(Number(v) as AnalyticsPeriod)}
      items={[
        { value: "7", label: "7 дней" },
        { value: "30", label: "30 дней" },
        { value: "0", label: "Всё время" },
      ]}
    />
  );

  if (businessOnly && bizStats) {
    return (
      <DashShell
        brand={organization.name}
        items={nav}
        title="Статистика"
        subtitle="Просмотры страницы, клики по контактам и визиты клиентов."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/operator/promotion">
              <Megaphone className="size-3.5" />
              Продвижение
            </Link>
          </Button>
        }
      >
        {periodTabs}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Просмотры страницы"
            value={formatNumber(bizStats.views)}
            delta={period === 0 ? null : deltaLabel(bizStats.views, bizStats.viewsPrev)}
            up={bizStats.views >= bizStats.viewsPrev}
            hint="открыли вашу компанию"
          />
          <MetricCard
            label="Клики по контактам"
            value={formatNumber(bizStats.clicks)}
            delta={period === 0 ? null : deltaLabel(bizStats.clicks, bizStats.clicksPrev)}
            up={bizStats.clicks >= bizStats.clicksPrev}
            hint="WhatsApp, звонки, маршрут"
          />
          <MetricCard
            label="Визиты «Я здесь»"
            value={formatNumber(bizStats.checkins)}
            delta={period === 0 ? null : deltaLabel(bizStats.checkins, bizStats.checkinsPrev)}
            up={bizStats.checkins >= bizStats.checkinsPrev}
            hint="пришли по факту"
            emphasis={bizStats.checkins > 0}
          />
          <MetricCard
            label="Рейтинг компании"
            value={data.rating ? `${data.rating.average} ★` : "-"}
            delta={null}
            up={Boolean(data.rating && data.rating.average >= 4)}
            hint={data.rating ? `${data.rating.count} отзывов` : "отзывов пока нет"}
          />
        </div>

        {money && money.requests > 0 ? (
          <section className="surface-card mt-6 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Сколько принесли записи</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Считаем по ценам ваших услуг. Клиент платит вам напрямую, поэтому это ожидаемый
                  доход, а не факт оплаты.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MoneyTile label="Записей за период" value={formatNumber(money.requests)} />
              <MoneyTile
                label="Состоялись"
                value={formatNumber(money.won)}
                hint={
                  money.requests
                    ? `${Math.round((money.won / money.requests) * 100)}% от всех`
                    : undefined
                }
                tone="success"
              />
              <MoneyTile
                label="Доход по записям"
                value={formatPrice(money.earned)}
                tone="success"
              />
              <MoneyTile label="Средний чек" value={formatPrice(money.averageCheck)} />
            </div>

            {money.fromPromo > 0 || money.organic > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
                  <p className="text-sm font-semibold">С продвижения</p>
                  <p className="mt-1 font-display text-xl font-semibold">
                    {formatNumber(money.fromPromo)}{" "}
                    <span className="text-sm font-medium text-muted-foreground">
                      {recordsWord(money.fromPromo)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    доход {formatPrice(money.promoEarned)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm font-semibold">Пришли сами</p>
                  <p className="mt-1 font-display text-xl font-semibold">
                    {formatNumber(money.organic)}{" "}
                    <span className="text-sm font-medium text-muted-foreground">
                      {recordsWord(money.organic)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    доход {formatPrice(money.organicEarned)}
                  </p>
                </div>
              </div>
            ) : null}

            {listingRows.some((row) => row.requests > 0) ? (
              <div className="mt-5">
                <p className="text-sm font-medium">Что приносит деньги</p>
                <ul className="mt-2 space-y-1.5">
                  {listingRows
                    .filter((row) => row.requests > 0)
                    .map((row) => (
                      <li
                        key={row.listing.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-2.5 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {row.listing.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatNumber(row.requests)} {recordsWord(row.requests)} · состоялись{" "}
                          {formatNumber(row.won)}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatPrice(row.earned)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="surface-card mt-6 overflow-hidden">
          <div className="border-b border-border bg-secondary/20 px-5 py-4 md:px-6">
            <h2 className="font-display text-lg font-semibold">Динамика за период</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Просмотры страницы и действия клиентов (контакты + визиты) по дням.
            </p>
          </div>
          <div className="p-5 md:p-6">
            {bizStats.hasTrend ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bizStats.trend} margin={{ left: -8, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="biz-views" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="biz-actions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
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
                      fill="url(#biz-views)"
                    />
                    <Area
                      type="monotone"
                      dataKey="actions"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#biz-actions)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Eye className="size-10 text-muted-foreground" />
                <p className="mt-4 font-medium">За этот период событий пока мало</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Опубликуйте объявления и делитесь страницей компании — просмотры и действия
                  клиентов появятся на графике автоматически.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" asChild>
                    <Link to="/operator/services">Мои объявления</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/operator/company">Страница компании</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {pageStatsSection}
      </DashShell>
    );
  }

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Аналитика"
      subtitle="Просмотры, заявки, конверсия и продажи за выбранный период."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/operator/promotion">
            <Megaphone className="size-3.5" />
            Продвижение
          </Link>
        </Button>
      }
    >
      {periodTabs}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Просмотры туров"
          value={formatNumber(data.views)}
          delta={period === 0 ? null : deltaLabel(data.views, data.viewsPrev)}
          up={data.views >= data.viewsPrev}
          hint="открыли карточки"
        />
        <MetricCard
          label="Ответы на заявки"
          value={formatNumber(data.offersSent)}
          delta={period === 0 ? null : deltaLabel(data.offersSent, data.offersSentPrev)}
          up={data.offersSent >= data.offersSentPrev}
          hint={`${pct(data.chosen, data.offersSent)} выбрали вас`}
        />
        <MetricCard
          label="Выручка"
          value={data.paidBookings > 0 ? formatPrice(data.revenue) : "-"}
          delta={period === 0 ? null : deltaLabel(data.revenue, data.revenuePrev)}
          up={data.revenue >= data.revenuePrev}
          hint={data.paidBookings > 0 ? `${data.paidBookings} оплат` : "оплат пока нет"}
        />
        <MetricCard
          label="Конверсия ответов"
          value={data.offersSent ? `${Math.round(data.winRate)}%` : "-"}
          delta={null}
          up={data.winRate >= 25}
          hint={`${data.chosen} из ${data.offersSent} предложений`}
          emphasis={data.openRequests > 0}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Заявки без ответа"
          value={String(data.openRequests)}
          hint="можно забрать сейчас"
          emphasis={data.openRequests > 0}
        />
        <KpiCard
          label="Непрочитанные"
          value={String(data.unreadMessages)}
          hint="сообщения туристов"
        />
        <KpiCard
          label="Среднее время ответа"
          value={data.avgResponseHours !== null ? `${data.avgResponseHours} ч` : "-"}
          hint="от заявки до предложения"
        />
        <KpiCard
          label="Рейтинг компании"
          value={data.rating ? `${data.rating.average} ★` : "-"}
          hint={data.rating ? `${data.rating.count} отзывов` : "отзывов пока нет"}
        />
      </div>

      {pageStatsSection}

      {data.insights.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {data.insights.map((item) => (
            <div
              key={item.title}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4",
                item.tone === "warn" && "border-premium/40 bg-premium/10",
                item.tone === "ok" && "border-success/30 bg-success/5",
                item.tone === "info" && "border-primary/25 bg-primary/[0.04]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={item.to}>{item.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-b border-border bg-secondary/20 px-5 py-4 md:px-6">
          <h2 className="font-display text-lg font-semibold">Динамика за период</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Просмотры, ответы на заявки, выбор туриста и выручка по дням.
          </p>
        </div>
        <div className="p-5 md:p-6">
          {trendHasData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ left: -8, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="an-views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="an-offers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="an-picks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="revenue" orientation="right" hide />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        views: "Просмотры",
                        offers: "Ответы",
                        picks: "Выбрали вас",
                        revenue: "Выручка",
                      };
                      const v = Number(value);
                      return [
                        name === "revenue" ? formatPrice(v) : formatNumber(v),
                        labels[String(name)] ?? String(name),
                      ];
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      (
                        ({
                          views: "Просмотры",
                          offers: "Ответы",
                          picks: "Выбрали",
                          revenue: "Выручка",
                        }) as Record<string, string>
                      )[String(value)] ?? value
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    fill="url(#an-views)"
                  />
                  <Area
                    type="monotone"
                    dataKey="offers"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#an-offers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="picks"
                    stroke="var(--success)"
                    strokeWidth={2}
                    fill="url(#an-picks)"
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--premium, var(--accent))"
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Eye className="size-10 text-muted-foreground" />
              <p className="mt-4 font-medium">За этот период событий пока мало</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Опубликуйте туры, ответьте на заявки и включите продвижение, график заполнится
                автоматически.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button size="sm" asChild>
                  <Link to="/operator/tours">Мои туры</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/operator/requests">Заявки</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="surface-card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Воронка туриста</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Где теряется интерес. Цель: сократить путь от просмотра до оплаты.
        </p>
        <div className="mt-6 grid gap-2 lg:grid-cols-5">
          {data.funnel.map((step, i) => {
            const prev = data.funnel[i - 1]?.value ?? step.value;
            const drop = i > 0 && prev > 0 ? Math.round((1 - step.value / prev) * 100) : 0;
            return (
              <div key={step.label} className="relative">
                {i > 0 ? (
                  <span className="absolute -left-1 top-1/2 hidden h-px w-2 -translate-y-1/2 bg-border lg:block" />
                ) : null}
                <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {step.label}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                    {formatNumber(step.value)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{step.hint}</p>
                  {i > 0 && drop > 0 ? (
                    <p className="mt-2 text-[11px] font-medium text-premium">
                      −{drop}% от шага выше
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/20 px-5 py-4 md:px-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Топ туров</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Что смотрят и что бронируют.</p>
            </div>
            <TabPills
              value={tourSort}
              onChange={(v) => setTourSort(v as TourSort)}
              items={[
                { value: "views", label: "Просмотры" },
                { value: "bookings", label: "Брони" },
                { value: "conversion", label: "Конверсия" },
              ]}
            />
          </div>
          {sortedTours.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Опубликуйте тур, здесь появятся цифры.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sortedTours.slice(0, 8).map((row, index) => {
                const maxViews = sortedTours[0]?.views || 1;
                return (
                  <li key={row.tour.id} className="flex gap-4 p-5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <img
                      src={tourCover(row.tour, row.hotel)}
                      alt=""
                      className="size-16 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.tour.title || row.hotel.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.hotel.city} · {nightsLabel(row.tour.nights)} · {row.tour.meal}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">
                          {formatPrice(row.tour.price)}
                        </p>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(8, (row.views / maxViews) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3" />
                          {formatNumber(row.views)}
                        </span>
                        <span>{formatNumber(row.bookings)} броней</span>
                        <span>{pct(row.bookings, row.views)} конверсия</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Направления</h2>
            <p className="mt-1 text-sm text-muted-foreground">Интерес по городам назначения.</p>
            {data.cities.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Появится после публикации туров.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {data.cities.slice(0, 6).map((row) => (
                  <li key={row.city}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium">{row.city}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(row.views)} · {formatNumber(row.bookings)} броней
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${Math.max(8, (row.views / cityMax) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Заявки и маркетинг</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Inbox className="size-4" />
                  Ответили на заявки
                </span>
                <span className="font-semibold tabular-nums">{formatNumber(data.offersSent)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Target className="size-4" />
                  Турист выбрал вас
                </span>
                <span className="font-semibold tabular-nums">{formatNumber(data.chosen)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="size-4" />
                  Не выбрали
                </span>
                <span className="font-semibold tabular-nums">{formatNumber(data.declined)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Heart className="size-4" />В избранном
                </span>
                <span className="font-semibold tabular-nums">{formatNumber(data.favorites)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Wallet className="size-4" />
                  Потрачено на продвижение
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(data.promoSpend)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Megaphone className="size-4" />
                  Активных кампаний
                </span>
                <span className="font-semibold tabular-nums">{data.activePromos}</span>
              </li>
              {data.avgResponseHours !== null ? (
                <li className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-4" />
                    Среднее время ответа
                  </span>
                  <span className="font-semibold tabular-nums">{data.avgResponseHours} ч</span>
                </li>
              ) : null}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link to="/operator/requests">Заявки</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/operator/messages">
                  <MessageCircle className="size-3.5" />
                  Сообщения
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/operator/reviews">
                  <Star className="size-3.5" />
                  Отзывы
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </DashShell>
  );
}

/** Плитка денежного блока: значение крупно, подпись мелко. */
function MoneyTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  tone?: "success" | undefined;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-xl font-semibold tabular-nums",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  up,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  delta: string | null;
  up: boolean;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-card p-5",
        emphasis && "border-primary/30 bg-primary/[0.03] ring-1 ring-primary/15",
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              up ? "bg-success/12 text-success" : "bg-premium/12 text-premium",
            )}
          >
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {delta}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <Minus className="size-3" />
            за период
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
