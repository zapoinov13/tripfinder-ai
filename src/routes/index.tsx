import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2, Clock, Flame, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import heroImage from "@/assets/hero.jpg";
import { AiIntentBar } from "@/components/site/ai-intent-bar";
import { SiteLayout } from "@/components/site/site-layout";
import { SafeImage } from "@/components/media/safe-image";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { destinations, formatPrice, hotTours } from "@/data/demo";
import { getFeaturedExcursions } from "@/data/excursions";
import { b2bNav, travelScenarios } from "@/data/scenarios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TourGo: сравните цены на туры, экскурсии, жильё и помощь в поездке" },
      {
        name: "description",
        content:
          "Сравните предложения компаний и купите выгоднее. Туры, экскурсии, жильё, авто и помощь в одном месте. Платите напрямую выбранной фирме.",
      },
    ],
  }),
  component: Index,
});

const how = [
  {
    icon: Sparkles,
    title: "Скажите, что нужно",
    text: "Опишите поездку своими словами: AI откроет нужный раздел и покажет подходящие варианты.",
  },
  {
    icon: Wallet,
    title: "Сравните и выберите",
    text: "Один и тот же тур у разных компаний стоит по-разному. У нас эта разница видна сразу, без переписки в чатах.",
  },
  {
    icon: ShieldCheck,
    title: "Бронируйте напрямую",
    text: "Договор и оплата у выбранной компании. TourGo не берёт комиссию с туриста: цена не растёт.",
  },
];

const facts = [
  { value: "6", label: "разделов поездки" },
  { value: "0%", label: "комиссии туристу" },
  { value: "24/7", label: "помощь на месте" },
];

function Index() {
  const featuredExcursions = getFeaturedExcursions(6);

  return (
    <SiteLayout>
      <section className="md:container-page md:py-14">
        <div className="relative overflow-hidden md:rounded-[2.5rem]">
          {/* Мобильный hero компактный: плитки выбора должны попадать в первый экран. */}
          <img
            src={heroImage}
            alt="Пляж и курорт: подбор туров на TourGo"
            className="h-[min(31svh,16rem)] w-full object-cover object-[center_35%] animate-soft-zoom md:h-[32rem]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/60 to-ink/25" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col px-5 pb-4 pt-6 text-primary-foreground md:p-10">
            <p className="animate-fade-up hidden font-display text-2xl font-semibold tracking-tight md:mb-5 md:block md:text-3xl">
              TourGo
            </p>

            <h1 className="animate-fade-up font-display text-[1.7rem] font-semibold leading-[1.1] tracking-tight [animation-delay:80ms] [text-shadow:0_2px_14px_rgba(10,15,30,0.55)] sm:text-5xl md:text-6xl">
              Сравните цены
              <br />и купите выгоднее
            </h1>

            <p className="animate-fade-up mt-1.5 max-w-md text-[14px] leading-snug text-primary-foreground [animation-delay:140ms] [text-shadow:0_1px_10px_rgba(10,15,30,0.6)] md:mt-5 md:text-xl md:leading-relaxed">
              Туры, жильё, авто и помощь от компаний.  Платите напрямую.
            </p>

            <Link
              to="/ai-search"
              search={{} as never}
              className="animate-fade-up mt-3 flex h-12 w-full items-center gap-3 rounded-2xl bg-background px-3.5 text-left text-foreground shadow-lg active:scale-[0.99] [animation-delay:200ms] md:hidden"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                Опишите поездку
              </span>
              <ArrowRight className="size-4 shrink-0 text-foreground/45" aria-hidden />
            </Link>

            <div className="animate-fade-up hidden max-w-2xl [animation-delay:200ms] md:block">
              <AiIntentBar tone="onDark" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pt-3 md:pt-0">
        <div className="hidden grid-cols-3 gap-4 md:mt-6 md:grid">
          {facts.map((fact) => (
            <div key={fact.label} className="surface-card px-4 py-4 text-center">
              <p className="font-display text-3xl font-semibold leading-none">{fact.value}</p>
              <p className="mt-1 text-sm text-foreground/60">{fact.label}</p>
            </div>
          ))}
        </div>

        <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-2 md:mt-10 md:grid-cols-3 md:gap-4">
          {travelScenarios.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              search={{} as never}
              className="surface-card flex h-full items-center gap-2.5 px-3 py-3 text-left md:min-h-[11.5rem] md:flex-col md:items-start md:justify-between md:gap-2 md:p-6 md:transition-transform md:hover:-translate-y-1"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary md:size-14 md:rounded-2xl">
                <item.icon className="size-[18px] md:size-7" />
              </span>
              <span className="min-w-0 w-full">
                <span className="block font-display text-base font-semibold leading-tight md:hidden">
                  {item.shortTitle ?? item.title}
                </span>
                <span className="hidden font-display text-2xl font-semibold leading-snug md:block">
                  {item.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-foreground/60 md:mt-1 md:line-clamp-none md:text-base md:leading-relaxed">
                  <span className="md:hidden">{item.shortHint}</span>
                  <span className="hidden md:inline">{item.hint}</span>
                </span>
              </span>
            </Link>
          ))}
        </div>

        <Link
          to={b2bNav.to}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-ink/90 active:scale-[0.99] md:mt-8 md:h-14 md:w-auto md:px-8 md:text-base"
        >
          <Building2 className="size-4 md:size-5" />
          {b2bNav.title}
          <ArrowRight className="size-4 md:size-5" />
        </Link>
      </section>

      <section className="container-page mt-6 md:mt-10">
        <SectionHead
          title="Куда едут чаще всего"
          subtitle="Внутри каждой страны живые цены сразу от нескольких компаний"
          action={
            <Button variant="outline" asChild>
              <Link to="/destinations">
                Все направления
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        {/* Мобильный: окно 2x2 со свайпом вбок, тем же жестом, что туры и экскурсии. */}
        <div className="-mx-4 mt-5 grid snap-x snap-mandatory grid-flow-col grid-rows-2 auto-cols-[44%] gap-2.5 overflow-x-auto scroll-pl-4 px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:mt-6 md:auto-cols-auto md:grid-flow-row md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              to="/search"
              search={{ destination: dest.id } as never}
              className="hover-lift group relative block snap-start overflow-hidden rounded-2xl md:rounded-3xl"
            >
              <SafeImage
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105 md:h-56"
              />
              <div className="absolute inset-0 media-scrim-strong" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground md:p-4">
                <h3 className="font-display text-[15px] font-semibold leading-tight md:text-lg">
                  {dest.flag} {dest.country}
                </h3>
                <p className="mt-0.5 text-[11px] leading-tight text-primary-foreground/80 md:text-sm">
                  {dest.tours} предложений · {dest.city}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <SeeRestLink to="/destinations" label="Все направления" />
      </section>

      <section className="mt-10 bg-gradient-to-b from-primary-soft/60 via-primary-soft/25 to-transparent md:mt-14">
        {/* Тёплая полоса выделяет горящие туры среди остальных секций. */}
        <div className="container-page py-6 md:py-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground">
            <Flame className="size-3.5" />
            Осталось мало мест
          </div>
          <div className="mt-3">
            <SectionHead
              title="Горящие туры"
              subtitle="Компании уже снизили цену на ближайшие вылеты. Такие предложения разбирают за пару дней"
              action={
                <Button variant="outline" asChild>
                  <Link to="/search" search={{ offers: "hot" } as never}>
                    Смотреть остальные
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
            />
          </div>
          {/* Мобильный: горизонтальная карусель, как у экскурсий ниже. */}
          <div className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:mx-0 md:mt-6 md:gap-4 md:px-0 lg:grid-cols-4">
            {hotTours.map((tour) => (
              <div key={tour.id} className="w-[85%] shrink-0 snap-start snap-always sm:w-auto">
                <TourCard tour={tour} layout="grid" />
              </div>
            ))}
          </div>
          <SeeRestLink
            to="/search"
            search={{ offers: "hot" }}
            label="Смотреть остальные горящие туры"
          />
        </div>
      </section>

      <section className="container-page mt-10 md:mt-14">
        <SectionHead
          title="Экскурсии и развлечения"
          subtitle="Сафари, яхты и парки от местных компаний по их ценам, без наценки посредников"
          action={
            <Button variant="outline" asChild>
              <Link to="/excursions">
                Смотреть остальные
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        {/* Мобильный: горизонтальная карусель со snap, чтобы не раздувать страницу. */}
        <div className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:mt-6 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {featuredExcursions.map((item) => (
            <Link
              key={item.id}
              to="/excursions"
              search={{ destination: item.destinationId, city: item.city } as never}
              className="hover-lift surface-card w-[85%] shrink-0 snap-start snap-always overflow-hidden p-0 sm:w-[46%] md:w-auto"
            >
              <div className="relative">
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="h-40 w-full object-cover md:h-44"
                />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur-sm">
                  {item.category}
                </span>
                <span className="absolute bottom-2.5 right-2.5 rounded-full bg-background px-2.5 py-1 text-xs font-bold shadow-md">
                  от {formatPrice(item.price)}
                </span>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.city}
                </p>
                <h3 className="mt-1 line-clamp-2 font-display text-[1.05rem] font-semibold leading-snug md:text-lg">
                  {item.title}
                </h3>
                <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[13px] text-foreground/60">
                  <Clock className="size-3.5 shrink-0" />
                  <span className="shrink-0">{item.duration}</span>
                  <span className="shrink-0">·</span>
                  <span className="truncate">{item.company}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <SeeRestLink to="/excursions" label="Смотреть остальные экскурсии" />
      </section>

      <section className="container-page mt-10 md:mt-14">
        <div className="rounded-3xl bg-ink px-5 py-7 text-primary-foreground md:rounded-[2rem] md:px-10 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-[1.65rem] font-semibold leading-snug tracking-tight md:text-4xl md:leading-[1.15]">
                Как устроен TourGo
              </h2>
              <p className="mt-1.5 max-w-xl text-base leading-snug text-primary-foreground/70">
                Три шага, чтобы купить ту же поездку дешевле
              </p>
            </div>
          </div>

          <ol className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-4">
            {how.map((item, i) => (
              <li
                key={item.title}
                className="relative rounded-2xl bg-primary-foreground/[0.06] p-4 ring-1 ring-primary-foreground/10 md:p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground md:size-10">
                    <item.icon className="size-[18px] md:size-5" />
                  </span>
                  <span className="font-display text-3xl font-semibold text-primary-foreground/25 md:text-4xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold md:text-lg">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/70">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row md:mt-8">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/ai-search" search={{} as never}>
                <Sparkles className="size-4" />
                Подобрать поездку
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto"
              asChild
            >
              <Link to="/search" search={{ offers: "hot" } as never}>
                <Flame className="size-4" />
                Горящие туры
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[1.65rem] font-semibold leading-snug tracking-tight md:text-4xl md:leading-[1.15]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground/70">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="hidden shrink-0 md:block">{action}</div> : null}
    </div>
  );
}

function SeeRestLink({
  to,
  search,
  label,
}: {
  to: "/excursions" | "/search" | "/destinations";
  search?: Record<string, string>;
  label: string;
}) {
  return (
    <div className="mt-4 flex justify-center md:mt-6">
      <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
        <Link to={to} search={(search ?? {}) as never}>
          {label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
