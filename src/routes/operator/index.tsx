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
import { useAutoApiSync } from "@/lib/platform/api-sync";
import { useAuth, useRequireAuth } from "@/lib/platform/auth";
import { categoriesOfServices, isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { usePlatformStore } from "@/lib/platform/hooks";
import { getCompanyRating } from "@/lib/platform/messages";
import {
  carClassLabel,
  sportKindLabel,
  stayKindLabel,
  verticalLabel,
  type VerticalId,
} from "@/lib/platform/service-ingest";
import {
  closedDateLabel,
  isClosedDate,
  isoDate,
  upcomingClosedDates,
} from "@/lib/platform/booking-slots";
import {
  formatServiceRequestWhen,
  requestsForDate,
  serviceRequestStatusClass,
  serviceRequestStatusLabel,
  unreadServiceMessagesForOrg,
  upcomingServiceRequests,
} from "@/lib/platform/service-requests";
import { recordsWord } from "@/lib/platform/business-stats";
import { listOrgVertical } from "@/lib/platform/vertical-listings";
import type { Booking, Organization } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operator/")({
  head: () => ({
    meta: [{ title: "Кабинет компании · TourGo" }],
  }),
  component: OperatorDashboard,
});

const monthFmt = new Intl.DateTimeFormat("ru-RU", { month: "short" });

function listingKindLabel(vertical: VerticalId, kind: string) {
  if (vertical === "sport") return sportKindLabel(kind);
  if (vertical === "stay") return stayKindLabel(kind);
  return carClassLabel(kind);
}

/** «1 объявление», «2 объявления», «5 объявлений» */
function listingsCountLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} объявление`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} объявления`;
  return `${n} объявлений`;
}

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
  businessOnly: boolean,
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
    ...(businessOnly
      ? []
      : [
          {
            done: activeTours > 0,
            title: "Добавить первый тур",
            text: "Без туров компания не попадёт в поиск TourGo.",
            to: "/operator/tours",
            cta: "Добавить",
          },
        ]),
    ...(businessOnly ||
    ["sport", "stays", "cars"].some((id) =>
      categoriesOfServices(org.services ?? []).has(id as never),
    )
      ? [
          {
            done: sportCount > 0,
            title: "Добавить первое объявление",
            text: "Жильё, авто или спорт: ссылка из Instagram или сайта + описание, затем публикация в витрине.",
            to: "/operator/services",
            cta: "Добавить",
          },
        ]
      : []),
    ...(businessOnly
      ? []
      : [
          {
            done: openRequests === 0,
            title: "Ответить на заявки туристов",
            text:
              openRequests > 0
                ? `${openRequests} заявок ждут вашего предложения.`
                : "Новых заявок пока нет.",
            to: "/operator/requests",
            cta: openRequests > 0 ? "Ответить" : "Смотреть",
          },
        ]),
  ];
}

function OperatorDashboard() {
  const { allowed } = useRequireAuth(["OPERATOR_ADMIN", "OPERATOR_MANAGER"]);
  const { user, organization } = useAuth();
  const state = usePlatformStore();
  const nav = useOperatorNav(organization?.id);
  // Фид компании подтягивается сам, пока открыт кабинет.
  useAutoApiSync(organization ? [organization.id] : []);
  if (allowed && user && !organization) {
    // Партнёр без компании: старая регистрация оборвалась или админ перевёл
    // аккаунт в партнёры вручную. Дорегистрация создаст компанию сразу.
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Завершите регистрацию компании</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Аккаунт партнёра есть, а компании ещё нет. Заполните короткую анкету — название,
            категорию и город — и кабинет откроется сразу.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/company-signup">Создать компанию</Link>
          </Button>
        </div>
      </div>
    );
  }
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
  const sportCount = listOrgVertical(organization.id).filter(
    (s) => s.status === "published",
  ).length;
  // «Бизнес без туров» (спортзал, прокат, жильё): вместо туров — объявления.
  const businessOnly = isBusinessOnlyServices(organization.services);
  const steps = setupSteps(organization, openRequests, active.length, sportCount, businessOnly);

  // Живая статистика страницы компании (просмотры, контакты, визиты).
  const companyEvents = state.analyticsEvents.filter(
    (e) => e.payload?.["companyId"] === organization.id,
  );
  const pageViews = companyEvents.filter((e) => e.type === "COMPANY_PAGE_VIEW").length;
  const contactClicks = companyEvents.filter((e) => e.type === "COMPANY_CONTACT_CLICK").length;
  const checkins = companyEvents.filter((e) => e.type === "COMPANY_CHECKIN");
  const newServiceRequests = state.serviceRequests.filter(
    (r) => r.organizationId === organization.id && r.status === "NEW",
  ).length;
  const orgRating = getCompanyRating(organization.id);
  const activePromo = state.promotions.find(
    (p) =>
      p.organizationId === organization.id &&
      p.status === "ACTIVE" &&
      new Date(p.expiresAt).getTime() > Date.now(),
  );
  const todayDate = isoDate(new Date());
  const todayBookings = requestsForDate(organization.id, todayDate);
  // Разовые выходные: сегодня закрыто или отпуск на подходе.
  const closedToday = isClosedDate(organization.bookingSchedule, todayDate);
  const closedAhead = upcomingClosedDates(organization.bookingSchedule).filter(
    (d) => d !== todayDate,
  );
  const upcoming = upcomingServiceRequests(organization.id, todayDate, 6);
  const unreadMessages = unreadServiceMessagesForOrg(organization.id);
  // Ожидаемый доход: цены услуг из объявлений, к которым привязаны записи.
  const priceOf = (listingId: string | undefined) =>
    listingId ? (listOrgVertical(organization.id).find((l) => l.id === listingId)?.price ?? 0) : 0;
  const todayRevenue = todayBookings.reduce((sum, r) => sum + priceOf(r.listingId) * r.people, 0);
  const myListings = listOrgVertical(organization.id);
  const publishedListings = myListings.filter((l) => l.status === "published");
  const pendingSteps = steps.filter((step) => !step.done);
  const topTours = [...orgTours].sort((a, b) => b.bookings - a.bookings).slice(0, 6);

  const quickActions = businessOnly
    ? ([
        {
          label: "Заявки",
          hint: newServiceRequests > 0 ? `${newServiceRequests} новых` : "Открыть",
          to: "/operator/requests",
          icon: Inbox,
          highlight: newServiceRequests > 0,
        },
        {
          label: "Объявления",
          hint: `${publishedListings.length} опубликовано`,
          to: "/operator/services",
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
      ] as const)
    : ([
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
      ] as const);

  return (
    <DashShell
      brand={organization.name}
      items={nav}
      title={businessOnly ? "Кабинет компании" : "Кабинет турфирмы"}
      subtitle={
        verified
          ? businessOnly
            ? `${organization.name} · тариф ${organization.planCode} · ${listingsCountLabel(sportCount)}`
            : `${organization.name} · тариф ${organization.planCode} · ${formatNumber(active.length)} туров`
          : openRequests > 0
            ? `${organization.name} · ${openRequests} новых заявок`
            : businessOnly
              ? `${organization.name} · объявления, заявки и страница компании`
              : `${organization.name} · заявки, туры и страница компании`
      }
      actions={
        openRequests > 0 ? (
          <Button size="sm" asChild>
            <Link to="/operator/requests">Ответить на заявки</Link>
          </Button>
        ) : businessOnly ? (
          <Button size="sm" variant="outline" asChild>
            <Link to="/operator/services">Добавить объявление</Link>
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
                action.highlight
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
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

      {businessOnly ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Записей сегодня"
            value={formatNumber(todayBookings.length)}
            hint={
              todayBookings.length > 0
                ? `ожидаемо ${formatPrice(todayRevenue)}`
                : "на сегодня пусто"
            }
            emphasis={todayBookings.length > 0}
          />
          <KpiCard
            label="Новые заявки"
            value={formatNumber(newServiceRequests)}
            hint={newServiceRequests > 0 ? "ждут ответа" : "всё обработано"}
            emphasis={newServiceRequests > 0}
          />
          <KpiCard
            label="Сообщения"
            value={formatNumber(unreadMessages)}
            hint={
              unreadMessages > 0
                ? unreadMessages % 10 === 1 && unreadMessages % 100 !== 11
                  ? "непрочитанное"
                  : "непрочитанных"
                : "всё прочитано"
            }
            emphasis={unreadMessages > 0}
          />
          <KpiCard
            label="Просмотры страницы"
            value={formatNumber(pageViews)}
            hint={`${formatNumber(contactClicks)} кликов · ${formatNumber(checkins.length)} визитов`}
          />
        </div>
      ) : (
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
            hint={`лимит ${plan ? plan.tourLimit + organization.additionalTourLimit : "нет"}`}
          />
          <KpiCard label="Просмотры" value={formatNumber(views)} />
          <KpiCard label="Продажи" value={formatPrice(revenue)} />
        </div>
      )}

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
                      step.done
                        ? "border-border/60 bg-secondary/30"
                        : "border-border bg-background",
                    )}
                  >
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn("text-sm font-medium", step.done && "text-muted-foreground")}
                      >
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
          ) : businessOnly ? (
            <section className="surface-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Сегодня{closedToday ? " · закрыто" : ""}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {todayBookings.length > 0
                      ? `${todayBookings.length} ${recordsWord(todayBookings.length)} · ожидаемо ${formatPrice(todayRevenue)}`
                      : "Записей на сегодня нет"}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/operator/requests">Все заявки</Link>
                </Button>
              </div>

              {closedToday ? (
                <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
                  Сегодня выходной по вашему расписанию: новых записей не будет.
                  {todayBookings.length > 0
                    ? ` Но ${todayBookings.length} ${recordsWord(todayBookings.length)} уже стоит — перенесите или предупредите клиентов.`
                    : ""}
                </p>
              ) : closedAhead.length > 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Закрыто впереди: {closedAhead.slice(0, 4).map(closedDateLabel).join(", ")}
                  {closedAhead.length > 4 ? ` и ещё ${closedAhead.length - 4}` : ""}.
                </p>
              ) : null}

              {todayBookings.length > 0 ? (
                <ul className="mt-5 space-y-2">
                  {todayBookings.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
                    >
                      <span className="font-display text-lg font-semibold tabular-nums">
                        {r.time || "—"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {r.contactName || "Клиент"}
                          {r.people > 1 ? ` · ${r.people} чел.` : ""}
                        </span>
                        {r.listingName ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.listingName}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          serviceRequestStatusClass[r.status],
                        )}
                      >
                        {serviceRequestStatusLabel[r.status]}
                      </span>
                      {r.contactPhone ? (
                        <a
                          href={`tel:${r.contactPhone}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {r.contactPhone}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : closedToday ? null : (
                <div className="mt-5 rounded-2xl border border-dashed border-border bg-secondary/20 px-6 py-8 text-center">
                  <p className="font-medium">На сегодня записей нет</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {upcoming.length > 0
                      ? "Ближайшие записи — ниже."
                      : "Клиенты записываются со страницы компании и из объявлений."}
                  </p>
                </div>
              )}

              {upcoming.filter((r) => r.date !== todayDate).length > 0 ? (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-medium">Дальше</p>
                  <ul className="mt-2 space-y-1.5">
                    {upcoming
                      .filter((r) => r.date !== todayDate)
                      .slice(0, 4)
                      .map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {formatServiceRequestWhen(r.date, r.time)}
                          </span>
                          <span className="font-medium">
                            {r.contactName || "Клиент"}
                            {r.listingName ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {r.listingName}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="surface-card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Продажи</h2>
                {revenue > 0 ? (
                  <span className="text-sm font-medium text-success">
                    {formatPrice(revenue)} всего
                  </span>
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
            {businessOnly ? null : (
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Каталог API</dt>
                <dd className="font-medium">
                  {api?.status === "connected" ? "Подключён" : "Не настроен"}
                </dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Рейтинг</dt>
              <dd className="font-medium">
                {orgRating
                  ? `${orgRating.average.toFixed(1)} ★ (${orgRating.count})`
                  : "нет отзывов"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Продвижение</dt>
              <dd className="text-right font-medium">
                {activePromo ? (
                  <>
                    <span className="text-success">идёт</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      до {new Date(activePromo.expiresAt).toLocaleDateString("ru-RU")}
                    </span>
                  </>
                ) : (
                  "не включено"
                )}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Баланс продвижения</dt>
              <dd className="font-medium tabular-nums">
                {formatPrice(organization.promotionBalance)}
              </dd>
            </div>
          </dl>

          <div className="mt-auto space-y-2 pt-6">
            {!businessOnly && api?.status !== "connected" ? (
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

      {businessOnly ? (
        <section className="surface-card mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Мои объявления</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Что клиенты видят в витринах «Спорт», «Жильё» и «Авто»
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/operator/services">Управлять</Link>
            </Button>
          </div>
          {myListings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Объявление</TableHead>
                    <TableHead>Город</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myListings.slice(0, 6).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {l.name}
                        <span className="block text-xs text-muted-foreground">
                          {verticalLabel(l.vertical)} · {listingKindLabel(l.vertical, l.kind)}
                        </span>
                      </TableCell>
                      <TableCell>{l.city}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            l.status === "published" ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          {l.status === "published" ? "Опубликовано" : "Скрыто"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.price > 0 ? formatPrice(l.price) : "по запросу"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border-t border-border px-6 py-10 text-center">
              <Luggage className="mx-auto size-8 text-muted-foreground/70" />
              <p className="mt-3 font-medium">Объявлений пока нет</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Добавьте первую карточку — жильё, авто или спорт — и она появится в витрине.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link to="/operator/services">Добавить объявление</Link>
              </Button>
            </div>
          )}
        </section>
      ) : (
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
      )}
    </DashShell>
  );
}
