import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Heart,
  Inbox,
  Megaphone,
  Star,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashShell } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice, nightsLabel, tourCover } from "@/data/demo";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { getHotel } from "@/lib/platform/catalog";
import { usePlatformStore } from "@/lib/platform/hooks";
import { getCompanyRating } from "@/lib/platform/messages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/analytics")({
  head: () => ({ meta: [{ title: "Аналитика · TourGo" }] }),
  component: OperatorAnalyticsPage,
});

const periods = [
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 0, label: "Всё время" },
] as const;

function inPeriod(iso: string, days: number) {
  if (!days) return true;
  return new Date(iso).getTime() >= Date.now() - days * 86400000;
}

function pct(part: number, whole: number) {
  if (!whole) return "0%";
  const value = (part / whole) * 100;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`;
}

function lastDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (count - 1 - i));
    return d;
  });
}

function OperatorAnalyticsPage() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { organization } = useAuth();
  const nav = useOperatorNav(organization?.id);
  const state = usePlatformStore();
  const [days, setDays] = useState(30);
  if (!allowed || !organization) return null;

  const orgId = organization.id;
  const tours = state.tours.filter((t) => t.operatorOrgId === orgId);
  const views = tours.reduce((s, t) => s + t.views, 0);
  const catalogBookings = tours.reduce((s, t) => s + t.bookings, 0);
  const favorites = state.favorites.filter((f) => tours.some((t) => t.id === f.tourId)).length;
  const rating = getCompanyRating(orgId);

  const myOffers = state.requestOffers.filter(
    (o) => o.organizationId === orgId && inPeriod(o.createdAt, days),
  );
  const chosen = myOffers.filter((o) => o.status === "CHOSEN");
  const answeredIds = new Set(
    state.requestOffers.filter((o) => o.organizationId === orgId).map((o) => o.requestId),
  );
  const openRequests = state.tripRequests.filter(
    (r) =>
      r.status !== "CHOSEN" &&
      r.status !== "CLOSED" &&
      !r.declinedByOrgIds.includes(orgId) &&
      !answeredIds.has(r.id) &&
      inPeriod(r.createdAt, days || 3650),
  );
  const paid = state.bookings.filter(
    (b) =>
      b.organizationId === orgId &&
      ["PAID", "CONFIRMED", "COMPLETED"].includes(b.status) &&
      inPeriod(b.createdAt, days),
  );
  const revenue = paid.reduce((s, b) => s + b.price, 0);
  const promoSpend = state.payments
    .filter((p) => p.organizationId === orgId && p.type === "promotion" && p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  const unread = state.requestMessages.filter(
    (m) => m.organizationId === orgId && m.authorSide === "TOURIST" && !m.readByCompany,
  ).length;

  const ranked = [...tours]
    .map((t) => {
      const hotel = getHotel(t.hotelId);
      const conversion = t.views ? t.bookings / t.views : 0;
      return { tour: t, hotel, conversion };
    })
    .sort((a, b) => b.tour.views - a.tour.views);

  const byCity = ranked.reduce<Record<string, { views: number; bookings: number }>>((acc, row) => {
    const city = row.hotel.city || "Другое";
    const cur = acc[city] ?? { views: 0, bookings: 0 };
    acc[city] = {
      views: cur.views + row.tour.views,
      bookings: cur.bookings + row.tour.bookings,
    };
    return acc;
  }, {});
  const cities = Object.entries(byCity).sort((a, b) => b[1].views - a[1].views);
  const cityMax = cities[0]?.[1].views || 1;

  const chartDays = lastDays(days === 0 ? 14 : Math.min(days, 14));
  const trend = chartDays.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const offers = myOffers.filter((o) => o.createdAt.slice(0, 10) === key).length;
    const picks = chosen.filter((o) => o.createdAt.slice(0, 10) === key).length;
    const viewsDay = state.analyticsEvents.filter(
      (e) =>
        e.type === "TOUR_VIEWED" &&
        e.createdAt.slice(0, 10) === key &&
        tours.some((t) => t.id === e.payload?.["tourId"]),
    ).length;
    return {
      day: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      offers,
      picks,
      views: viewsDay,
    };
  });
  const trendHasData = trend.some((p) => p.offers || p.picks || p.views);

  const weak = ranked.find((r) => r.tour.views >= 800 && r.conversion < 0.004);
  const strong = [...ranked].sort((a, b) => b.conversion - a.conversion)[0];
  const insights = [
    openRequests.length > 0
      ? {
          icon: Inbox,
          tone: "warn" as const,
          title: `${openRequests.length} заявок без ответа`,
          text: "Турист уходит к той компании, которая пишет первой.",
          to: "/operator/requests" as const,
          cta: "Ответить",
        }
      : null,
    unread > 0
      ? {
          icon: Inbox,
          tone: "warn" as const,
          title: `${unread} непрочитанных сообщений`,
          text: "Откройте переписку, пока турист не выбрал другой вариант.",
          to: "/operator/messages" as const,
          cta: "Читать",
        }
      : null,
    weak
      ? {
          icon: AlertTriangle,
          tone: "warn" as const,
          title: `${weak.tour.title || weak.hotel.name} смотрят, почти не бронируют`,
          text: "Проверьте цену, питание и фото. Или поднимите другой тур, который уже продаётся.",
          to: "/operator/tours" as const,
          cta: "К турам",
        }
      : null,
    strong && strong.tour.bookings > 0
      ? {
          icon: TrendingUp,
          tone: "ok" as const,
          title: `${strong.tour.title || strong.hotel.name} бронируют чаще всего`,
          text: "Продвиньте этот тур: туристы уже ему доверяют.",
          to: "/operator/promotion" as const,
          cta: "Продвинуть",
        }
      : null,
  ].filter(Boolean);

  const funnel = [
    { label: "Просмотры", value: views, hint: "открыли карточку тура" },
    { label: "В избранном", value: favorites, hint: "сохранили себе" },
    { label: "Ваши ответы", value: myOffers.length, hint: "предложения по заявкам" },
    { label: "Вас выбрали", value: chosen.length, hint: "турист взял ваш вариант" },
    { label: "Оплачено", value: paid.length || catalogBookings, hint: paid.length ? "через TourGo" : "брони в карточках" },
  ];

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Аналитика"
      subtitle="Что смотрят, где теряются заявки и какие туры бронируют."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setDays(p.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm",
                days === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {rating ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-premium text-premium" />
            {rating.average} из 5 · {rating.count} отзывов
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Eye}
          label="Просмотры туров"
          value={formatNumber(views)}
          hint="Сколько раз открыли ваши карточки"
        />
        <Stat
          icon={Inbox}
          label="Заявки без ответа"
          value={formatNumber(openRequests.length)}
          hint="Их ещё можно забрать"
          warn={openRequests.length > 0}
        />
        <Stat
          icon={CheckCircle2}
          label="Вас выбрали"
          value={formatNumber(chosen.length)}
          hint={`${pct(chosen.length, myOffers.length)} от ваших предложений`}
        />
        <Stat
          icon={Heart}
          label="Брони и продажи"
          value={paid.length ? formatPrice(revenue) : formatNumber(catalogBookings)}
          hint={paid.length ? "Оплачено через TourGo" : "Брони в карточках туров"}
        />
      </div>

      {insights.length > 0 ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {insights.map((item) =>
            item ? (
              <div
                key={item.title}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4",
                  item.tone === "warn"
                    ? "border-premium/40 bg-premium/10"
                    : "border-success/30 bg-success/5",
                )}
              >
                <item.icon
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    item.tone === "warn" ? "text-premium" : "text-success",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={item.to}>{item.cta}</Link>
                </Button>
              </div>
            ) : null,
          )}
        </div>
      ) : null}

      <section className="surface-card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Воронка</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Где турист отваливается. Чем короче шаг к следующему, тем лучше.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {funnel.map((step, i) => {
            const prev = funnel[i - 1]?.value ?? step.value;
            return (
              <div key={step.label} className="rounded-2xl bg-secondary/60 p-4">
                <p className="text-xs text-muted-foreground">{step.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{formatNumber(step.value)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {i === 0 ? step.hint : `${pct(step.value, prev)} от прошлого шага`}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Какие туры работают</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Просмотры показывают интерес. Брони показывают, что цена и условия заходят.
          </p>
          {ranked.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Пока нет туров. Опубликуйте карточку, и здесь появятся цифры.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {ranked.slice(0, 8).map((row) => {
                const maxViews = ranked[0]?.tour.views || 1;
                return (
                  <li key={row.tour.id} className="flex gap-3">
                    <img
                      src={tourCover(row.tour, row.hotel)}
                      alt=""
                      className="size-14 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.tour.title || row.hotel.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.hotel.city} · {nightsLabel(row.tour.nights)} · {row.tour.meal}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{formatPrice(row.tour.price)}</p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(6, (row.tour.views / maxViews) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(row.tour.views)} просмотров · {formatNumber(row.tour.bookings)}{" "}
                        броней · конверсия {pct(row.tour.bookings, row.tour.views)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Куда едут</h2>
            <p className="mt-1 text-sm text-muted-foreground">По просмотрам ваших туров.</p>
            {cities.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Появится после публикации туров.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {cities.slice(0, 6).map(([city, stat]) => (
                  <li key={city}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{city}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(stat.views)} · {formatNumber(stat.bookings)} броней
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(8, (stat.views / cityMax) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card p-6">
            <h2 className="font-display text-lg font-semibold">Заявки и продвижение</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Ответили на заявки</span>
                <span className="font-medium">{formatNumber(myOffers.length)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Турист выбрал вас</span>
                <span className="font-medium">{formatNumber(chosen.length)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Конверсия ответов</span>
                <span className="font-medium">{pct(chosen.length, myOffers.length)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Потрачено на продвижение</span>
                <span className="font-medium">{formatPrice(promoSpend)}</span>
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link to="/operator/requests">Заявки</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/operator/promotion">
                  <Megaphone className="size-3.5" />
                  Продвижение
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      {trendHasData ? (
        <section className="surface-card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">По дням</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Просмотры страниц, ваши ответы на заявки и сколько раз вас выбрали.
          </p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="an-offers" x1="0" y1="0" x2="0" y2="1">
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
                    name === "offers" ? "Ответы" : name === "picks" ? "Выбрали вас" : "Просмотры",
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.5}
                  fill="transparent"
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
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </DashShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  warn,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="surface-card p-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      <p className={cn("mt-1 text-xs", warn ? "text-premium" : "text-muted-foreground")}>{hint}</p>
    </div>
  );
}
