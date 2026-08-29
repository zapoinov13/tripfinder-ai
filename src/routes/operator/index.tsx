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
import { companyGaps } from "@/lib/platform/company-completeness";
import { categoriesOfServices, isListingBusiness } from "@/lib/platform/company-categories";
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
  scheduleActive,
  upcomingClosedDates,
} from "@/lib/platform/booking-slots";
import {
  formatServiceRequestWhen,
  requestsForDate,
  requestsOnClosedDays,
  serviceRequestStatusClass,
  serviceRequestStatusLabel,
  unreadServiceMessagesForOrg,
  updateServiceRequestStatus,
  upcomingServiceRequests,
} from "@/lib/platform/service-requests";
import { recordsWord } from "@/lib/platform/business-stats";
import { listOrgVertical } from "@/lib/platform/vertical-listings";
import type { Booking, Organization } from "@/lib/platform/types";
import { cn } from "@/lib/utils";
import { privatePage } from "@/lib/seo";

export const Route = createFileRoute("/operator/")({
  head: () => privatePage("Кабинет компании"),
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

type SetupStep = {
  id: string;
  done: boolean;
  title: string;
  text: string;
  to: string;
  cta: string;
  /** Без этого шага компания не может принять первого клиента. */
  essential: boolean;
};

/**
 * Путь запуска компании: по порядку, в котором шаги реально нужны.
 *
 * Сначала страница — клиенту надо на что-то смотреть. Потом услуги — иначе
 * записываться не на что. Потом расписание — без него кнопка записи не даёт
 * выбрать время. Документы идут последними: они дают знак проверки, но не
 * мешают принимать клиентов.
 */
function setupSteps(
  org: Organization,
  openRequests: number,
  activeTours: number,
  sportCount: number,
  businessOnly: boolean,
): SetupStep[] {
  // Документы нужны, пока знак не выдан. На статус ориентироваться нельзя:
  // с автоодобрением он у всех APPROVED, и шаг пропал бы навсегда.
  const needsDocs =
    !org.documentsVerifiedAt && !org.verificationSubmittedAt && !org.documents?.length;
  // Готовность страницы считаем общими правилами, а не своими: иначе кабинет,
  // список «чего не хватает» и разбор AI отвечают на один вопрос по-разному.
  const gaps = companyGaps({ company: org, listingsCount: activeTours + sportCount });
  // Из списка «чего не хватает» убираем то, для чего в онбординге есть свой шаг:
  // иначе партнёр читает про услуги дважды и не понимает, это одно и то же или
  // два разных дела.
  const pageGaps = gaps.filter((g) => g.id !== "listings");
  const profileReady = pageGaps.filter((g) => g.required).length === 0;
  // Называем недостающее поимённо. «Заполните страницу компании» — совет,
  // после которого всё равно надо идти и разбираться, что именно не заполнено.
  const pageText = pageGaps.length
    ? `Не хватает: ${pageGaps
        .slice(0, 3)
        .map((g) => g.label.toLowerCase())
        .join(", ")}${pageGaps.length > 3 ? ` и ещё ${pageGaps.length - 3}` : ""}.`
    : "Фото и описание: это первое, что видит клиент, когда открывает вас.";
  const sellsListings =
    businessOnly ||
    ["sport", "stays", "cars"].some((id) =>
      categoriesOfServices(org.services ?? []).has(id as never),
    );

  return [
    {
      id: "profile",
      done: profileReady,
      title: "Заполнить страницу компании",
      text: pageText,
      to: "/operator/company",
      cta: "Заполнить",
      essential: true,
    },
    ...(sellsListings
      ? [
          {
            id: "listing",
            done: sportCount > 0,
            title: "Опубликовать первую услугу",
            text: "Жильё, авто или спорт: ссылка из Instagram или сайта — и карточка попадёт в витрину.",
            to: "/operator/services",
            cta: "Добавить",
            essential: true,
          },
        ]
      : []),
    ...(businessOnly
      ? []
      : [
          {
            id: "tour",
            done: activeTours > 0,
            title: "Добавить первый тур",
            text: "Без туров компания не попадёт в поиск TourGo.",
            to: "/operator/tours",
            cta: "Добавить",
            essential: true,
          },
        ]),
    ...(businessOnly
      ? [
          {
            id: "schedule",
            done: scheduleActive(org),
            title: "Включить запись по времени",
            text: "Часы приёма и длина слота: без них клиент не сможет выбрать время на вашей странице.",
            to: "/operator/company",
            cta: "Настроить",
            essential: true,
          },
        ]
      : []),
    {
      id: "docs",
      done: !needsDocs,
      title: "Отправить документы на проверку",
      text: "Знак «Проверенная компания» появится после модерации. Принимать клиентов можно уже сейчас.",
      to: "/operator/company",
      cta: "Загрузить",
      essential: false,
    },
    ...(businessOnly
      ? []
      : [
          {
            id: "requests",
            done: openRequests === 0,
            title: "Ответить на заявки туристов",
            text:
              openRequests > 0
                ? `${openRequests} заявок ждут вашего предложения.`
                : "Новых заявок пока нет.",
            to: "/operator/requests",
            cta: openRequests > 0 ? "Ответить" : "Смотреть",
            essential: false,
          },
        ]),
  ];
}

/**
 * Экран запуска: пока компания не готова принимать клиентов, главная
 * показывает один следующий шаг крупно, а остальные — списком под ним.
 * Колонка нулей новичку ничего не объясняет, поэтому её здесь нет.
 */
function LaunchPanel({
  steps,
  next,
  companyId,
}: {
  steps: SetupStep[];
  next: SetupStep;
  companyId: string;
}) {
  const essential = steps.filter((s) => s.essential);
  const done = essential.filter((s) => s.done).length;
  const left = essential.length - done;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-primary/25 bg-primary/[0.04]">
      <div className="border-b border-primary/15 px-5 py-5 md:px-7 md:py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Шаг {done + 1} из {essential.length}
            </p>
            <h2 className="mt-1.5 font-display text-xl font-semibold md:text-2xl">{next.title}</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-foreground/70">
              {next.text}
            </p>
          </div>
          <Button size="lg" className="shrink-0" asChild>
            <Link to={next.to}>{next.cta}</Link>
          </Button>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/15">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((done / essential.length) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {left === 1 ? "остался 1 шаг" : `осталось ${left} ${left < 5 ? "шага" : "шагов"}`}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-border/60 bg-card">
        {steps.map((step) => {
          const current = step.id === next.id;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-5 py-3 md:px-7",
                current && "bg-primary/[0.03]",
              )}
            >
              {step.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : (
                <Circle
                  className={cn(
                    "size-4 shrink-0",
                    current ? "text-primary" : "text-muted-foreground/60",
                  )}
                />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  step.done
                    ? "text-muted-foreground line-through decoration-border"
                    : current
                      ? "font-semibold"
                      : "text-foreground/80",
                )}
              >
                {step.title}
              </span>
              {!step.essential ? (
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  можно позже
                </span>
              ) : null}
              {!step.done && !current ? (
                <Button size="sm" variant="ghost" className="shrink-0" asChild>
                  <Link to={step.to}>{step.cta}</Link>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card px-5 py-3 md:px-7">
        <p className="text-xs text-muted-foreground">
          Клиенты найдут вас в витрине и в поиске, как только шаги будут закрыты.
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link to="/company/$companyId" params={{ companyId }}>
            Как видит клиент
          </Link>
        </Button>
      </div>
    </section>
  );
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

  // Компании открываются автоматически, поэтому знак «Проверена» больше не
  // следует из статуса: он про документы, которые смотрит человек.
  const verified = Boolean(organization.documentsVerifiedAt);
  const pendingVerification = !verified;
  const salesPoints = buildSalesPoints(bookings);
  const sportCount = listOrgVertical(organization.id).filter(
    (s) => s.status === "published",
  ).length;
  // «Бизнес без туров» (спортзал, прокат, жильё): вместо туров — объявления.
  const businessOnly = isListingBusiness(organization.category, organization.services);
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
  // Записи, которые остались на закрытых днях: их надо перенести руками.
  const strandedBookings = requestsOnClosedDays(
    organization.id,
    upcomingClosedDates(organization.bookingSchedule),
    todayDate,
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
  // Пока не сделаны обязательные шаги, компания не может принять клиента:
  // главная ведёт по ним, а не показывает колонку нулей.
  const essentialPending = steps.filter((step) => step.essential && !step.done);
  const launching = essentialPending.length > 0;
  const nextStep = essentialPending[0];
  const noActivityYet =
    pageViews === 0 &&
    todayBookings.length === 0 &&
    newServiceRequests === 0 &&
    bookings.length === 0;
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
      tabs="partner"
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
      {launching && nextStep ? (
        <LaunchPanel steps={steps} next={nextStep} companyId={organization.id} />
      ) : null}

      {!launching && pendingVerification && !organization.verificationSubmittedAt ? (
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

      {/* На телефоне эти же разделы лежат в нижнем баре — дублировать не нужно. */}
      <div className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4 lg:gap-3">
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

      {/* Телефон: сначала «кто ко мне сегодня», цифры ниже. Экран шире — как было. */}
      <div className="flex flex-col">
        {launching && noActivityYet ? null : businessOnly ? (
          <div className="order-2 mt-6 grid grid-cols-2 gap-3 sm:order-none xl:grid-cols-4">
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
          <div className="order-2 mt-6 grid grid-cols-2 gap-3 sm:order-none sm:grid-cols-3 xl:grid-cols-5">
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

        <div className="order-1 grid gap-6 sm:order-none sm:mt-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            {!launching && pendingSteps.length > 0 ? (
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
                          className={cn(
                            "text-sm font-medium",
                            step.done && "text-muted-foreground",
                          )}
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

                {strandedBookings.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                    <p className="min-w-0 text-sm">
                      На закрытые дни осталось {strandedBookings.length}{" "}
                      {recordsWord(strandedBookings.length)}: перенесите или отмените — клиент
                      получит уведомление.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/operator/requests">Разобрать</Link>
                    </Button>
                  </div>
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
                          {/* На телефоне название услуги важнее аккуратного обрезания. */}
                          {r.listingName ? (
                            <span className="block text-xs text-muted-foreground sm:truncate">
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
                        {/* Ответить, не уходя с экрана: день партнёр смотрит с телефона. */}
                        <span className="flex w-full items-center gap-2 sm:w-auto">
                          {r.contactPhone ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              asChild
                            >
                              <a href={`tel:${r.contactPhone}`}>Позвонить</a>
                            </Button>
                          ) : null}
                          {r.status === "NEW" ? (
                            <Button
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() =>
                                updateServiceRequestStatus(r.id, "CONFIRMED", {
                                  actorId: user.id,
                                  organizationName: organization.name,
                                })
                              }
                            >
                              Подтвердить
                            </Button>
                          ) : null}
                        </span>
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
      </div>

      {/* Во время запуска пустой блок объявлений дублирует шаг «Опубликовать услугу». */}
      {businessOnly && !(launching && myListings.length === 0) ? (
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
            <>
              {/* На телефоне таблица ломает названия по буквам — там список. */}
              <ul className="divide-y divide-border border-t border-border md:hidden">
                {myListings.slice(0, 6).map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{l.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {listingKindLabel(l.vertical, l.kind)} · {l.city}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums">
                        {l.price > 0 ? formatPrice(l.price) : "по запросу"}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[11px] font-medium",
                          l.status === "published" ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {l.status === "published" ? "Опубликовано" : "Скрыто"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
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
            </>
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
