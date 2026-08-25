import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  Cable,
  CheckCircle2,
  Circle,
  Inbox,
  Luggage,
  Megaphone,
  TrendingUp,
} from "lucide-react";

import { DashShell, KpiCard } from "@/components/dash/dash-shell";
import { useOperatorNav } from "@/components/dash/nav-items";
import { SalesChart, type SalesChartPoint } from "@/components/dash/sales-chart";
import { Button } from "@/components/ui/button";
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
import { listOrgVertical } from "@/lib/platform/vertical-listings";
import type { Booking, Organization } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/")({
  head: () => ({
    meta: [{ title: "Кабинет турфирмы · TourGo" }],
  }),
  component: OperatorDashboard,
});

const monthFmt = new Intl.DateTimeFormat("ru-RU", { month: "short" });

function buildSalesPoints(bookings: Booking[]): SalesChartPoint[] {
  const paid = bookings.filter((b) => ["PAID", "CONFIRMED", "COMPLETED"].includes(b.status));
  if (paid.length === 0) return [];

  const buckets = new Map<string, { label: string; value: number; sort: number }>();
  for (const booking of paid) {
    const date = new Date(booking.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = buckets.get(key);
    const nextValue = (existing?.value ?? 0) + booking.price;
    buckets.set(key, {
      label: monthFmt.format(date).replace(".", ""),
      value: nextValue,
      sort: date.getFullYear() * 12 + date.getMonth(),
    });
  }

  return [...buckets.values()]
    .sort((a, b) => a.sort - b.sort)
    .slice(-8)
    .map(({ label, value }) => ({
      label,
      value: value / 1_000_000,
    }));
}

function setupSteps(
  org: Organization,
  openRequests: number,
  activeTours: number,
  sportCount: number,
) {
  const needsDocs =
    org.status === "PENDING_APPROVAL" &&
    !org.verificationSubmittedAt &&
    !(org.verificationFiles?.length || org.documents?.length);
  const profileReady = Boolean(org.about?.trim()) && (org.photos?.length ?? 0) > 0;

  return [
    {
      done: !needsDocs,
      title: "Отправить документы на проверку",
      text: "Знак «Проверенная компания» появится после модерации.",
      to: "/operator/company",
      cta: "Загрузить",
    },
    {
      done: profileReady,
      title: "Заполнить страницу компании",
      text: "Фото, описание и контакты повышают доверие туристов.",
      to: "/operator/company",
      cta: "Открыть",
    },
    {
      done: activeTours > 0,
      title: "Добавить первый тур",
      text: "Без туров компания не попадёт в поиск TourGo.",
      to: "/operator/tours",
      cta: "Добавить",
    },
    ...(org.services?.includes("Спорт") ||
    org.services?.includes("Отели") ||
    org.services?.includes("Аренда авто")
      ? [
          {
            done: sportCount > 0,
            title: "Добавить услугу из Instagram или сайта",
            text: "Жильё, авто или спорт: ссылка + текст bio, затем публикация в витрине.",
            to: "/operator/services",
            cta: "Добавить",
          },
        ]
      : []),
    {
      done: openRequests === 0,
      title: "Ответить на заявки туристов",
      text: openRequests > 0 ? `${openRequests} заявок ждут вашего предложения.` : "Новых заявок пока нет.",
      to: "/operator/requests",
      cta: openRequests > 0 ? "Ответить" : "Смотреть",
    },
  ];
}

function OperatorDashboard() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
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
  const myOffers = state.requestOffers.filter((o) => o.organizationId === organization.id);
  const chosenOffers = myOffers.filter((o) => o.status === "CHOSEN").length;
  const answered = new Set(myOffers.map((o) => o.requestId));
  const openRequests = state.tripRequests.filter(
    (r) =>
      r.status !== "CHOSEN" &&
      r.status !== "CLOSED" &&
      !r.declinedByOrgIds.includes(organization.id) &&
      !answered.has(r.id),
  ).length;

  const verified = organization.status === "APPROVED";
  const pendingVerification = organization.status === "PENDING_APPROVAL";
  const salesPoints = buildSalesPoints(bookings);
  const sportCount = listOrgVertical(organization.id).filter((s) => s.status === "published").length;
  const steps = setupSteps(organization, openRequests, active.length, sportCount);
  const pendingSteps = steps.filter((step) => !step.done);
  const topTours = [...orgTours].sort((a, b) => b.bookings - a.bookings).slice(0, 6);

  const quickActions = [
    {
      label: "Заявки",
      hint: openRequests > 0 ? `${openRequests} новых` : "Открыть",
      to: "/operator/requests",
      icon: Inbox,
      highlight: openRequests > 0,
    },
    {
      label: "Туры",
      hint: `${active.length} активных`,
      to: "/operator/tours",
      icon: Luggage,
      highlight: false,
    },
    {
      label: "Компания",
      hint: verified ? "Проверена" : "Профиль",
      to: "/operator/company",
      icon: Building2,
      highlight: false,
    },
    {
      label: "Продвижение",
      hint: formatPrice(organization.promotionBalance),
      to: "/operator/promotion",
      icon: Megaphone,
      highlight: false,
    },
  ] as const;

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title="Кабинет турфирмы"
      subtitle={
        verified
          ? `${organization.name} · тариф ${organization.planCode} · ${formatNumber(active.length)} туров`
          : openRequests > 0
            ? `${organization.name} · ${openRequests} новых заявок`
            : `${organization.name} · заявки, туры и страница компании`
      }
      actions={
        openRequests > 0 ? (
          <Button size="sm" asChild>
            <Link to="/operator/requests">Ответить на заявки</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link to="/operator/tours">Добавить тур</Link>
          </Button>
        )
      }
    >
      {pendingVerification && !organization.verificationSubmittedAt ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-premium/25 bg-premium/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-premium/15 text-premium">
              <BadgeCheck className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Получите знак «Проверенная компания»</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Загрузите документы. Кабинет уже работает, туры и заявки доступны.
              </p>
            </div>
          </div>
          <Button size="sm" className="shrink-0" asChild>
            <Link to="/operator/company">Загрузить документы</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={cn(
              "surface-card flex flex-col gap-2 rounded-2xl p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]",
              action.highlight && "border-primary/25 bg-primary/[0.04] ring-1 ring-primary/10",
            )}
          >
            <span
              className={cn(
                "grid size-9 w-fit place-items-center rounded-xl",
                action.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
              )}
            >
              <action.icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{action.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{action.hint}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Новые заявки"
          value={formatNumber(openRequests)}
          hint={openRequests > 0 ? "ждут ответа" : "всё отвечено"}
          emphasis={openRequests > 0}
        />
        <KpiCard
          label="Мои предложения"
          value={formatNumber(myOffers.length)}
          hint={`выбрали вас ${chosenOffers}`}
        />
        <KpiCard
          label="Активные туры"
          value={formatNumber(active.length)}
          hint={`лимит ${plan?.tourLimit ?? "нет"}`}
        />
        <KpiCard label="Просмотры" value={formatNumber(views)} />
        <KpiCard label="Продажи" value={formatPrice(revenue)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          {pendingSteps.length > 0 ? (
            <section className="surface-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">С чего начать</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pendingSteps.length} шагов до полной готовности кабинета
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums">
                  {steps.filter((s) => s.done).length}/{steps.length}
                </span>
              </div>
              <ul className="mt-5 space-y-2">
                {steps.map((step) => (
                  <li
                    key={step.title}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-4 py-3",
                      step.done ? "border-border/60 bg-secondary/30" : "border-border bg-background",
                    )}
                  >
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", step.done && "text-muted-foreground")}>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{step.text}</p>
                    </div>
                    {!step.done ? (
                      <Button size="sm" variant="outline" className="shrink-0" asChild>
                        <Link to={step.to}>{step.cta}</Link>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="surface-card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Продажи</h2>
                {revenue > 0 ? (
                  <span className="text-sm font-medium text-success">{formatPrice(revenue)} всего</span>
                ) : null}
              </div>
              <div className="mt-6 h-72">
                {salesPoints.length > 0 ? (
                  <SalesChart points={salesPoints} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 px-6 text-center">
                    <TrendingUp className="size-8 text-muted-foreground/70" />
                    <p className="mt-3 font-medium">Пока нет продаж</p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Отвечайте на заявки и продвигайте туры. График появится после первых оплат.
                    </p>
                    <Button size="sm" className="mt-4" asChild>
                      <Link to="/operator/requests">Смотреть заявки</Link>
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="surface-card flex flex-col p-6">
          <h2 className="font-display text-lg font-semibold">Состояние</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Тариф</dt>
              <dd className="font-medium">{organization.planCode}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Проверка</dt>
              <dd className={cn("font-medium", verified ? "text-success" : "text-premium")}>
                {verified
                  ? "Проверена"
                  : organization.verificationSubmittedAt
                    ? "На модерации"
                    : "Не отправлена"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Каталог API</dt>
              <dd className="font-medium">
                {api?.status === "connected" ? "Подключён" : "Не настроен"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Баланс продвижения</dt>
              <dd className="font-medium tabular-nums">{formatPrice(organization.promotionBalance)}</dd>
            </div>
          </dl>

          <div className="mt-auto space-y-2 pt-6">
            {api?.status !== "connected" ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/operator/tours" search={{ add: "api" }}>
                  <Cable className="size-4" />
                  Загрузить по API
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/operator/billing">Тариф и лимиты</Link>
            </Button>
          </div>
        </aside>
      </div>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Лучшие туры</h2>
            <p className="mt-1 text-sm text-muted-foreground">По количеству бронирований</p>
          </div>
          {topTours.length > 0 ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/operator/tours">Все туры</Link>
            </Button>
          ) : null}
        </div>

        {topTours.length > 0 ? (
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
                {topTours.map((tour) => {
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
        ) : (
          <div className="border-t border-border px-6 py-10 text-center">
            <Luggage className="mx-auto size-8 text-muted-foreground/70" />
            <p className="mt-3 font-medium">Туров пока нет</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Добавьте первый тур, чтобы попасть в поиск TourGo.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link to="/operator/tours">Добавить тур</Link>
            </Button>
          </div>
        )}
      </section>
    </DashShell>
  );
}
