import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2, Flame, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import heroImage from "@/assets/hero.jpg";
import { AiIntentBar } from "@/components/site/ai-intent-bar";
import { SiteLayout } from "@/components/site/site-layout";
import {
  MediaCardCaption,
  mediaBodyClass,
  mediaMetaClass,
  mediaTitleClass,
} from "@/components/media/media-card-overlay";
import { SafeImage } from "@/components/media/safe-image";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { destinations, hotTours } from "@/data/demo";
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
    title: "Откройте нужный раздел",
    text: "Тур, экскурсия, жильё, авто, спорт или помощь. Фильтры и поиск уже внутри.",
  },
  {
    icon: Wallet,
    title: "Сравните цены рядом",
    text: "Несколько компаний на одном экране. Состав, даты и сумма без переписки в чатах.",
  },
  {
    icon: ShieldCheck,
    title: "Платите компании напрямую",
    text: "TourGo: витрина. Договор и деньги у фирмы, которую выбрали вы.",
  },
];

const facts = [
  { value: "6", label: "разделов поездки" },
  { value: "0%", label: "комиссии туристу" },
  { value: "24/7", label: "помощь на месте" },
];

function Index() {
  const featuredExcursions = getFeaturedExcursions(3);

  return (
    <SiteLayout>
      <section className="md:container-page md:py-14">
        <div className="relative overflow-hidden md:rounded-[2.5rem]">
          {/* Мобильный hero компактный: плитки выбора должны попадать в первый экран. */}
          <img
            src={heroImage}
            alt="Пляж и курорт: подбор туров на TourGo"
            className="h-[min(42svh,21rem)] w-full object-cover object-[center_35%] animate-soft-zoom md:h-[32rem]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/15" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col px-5 pb-5 pt-10 text-primary-foreground md:p-10">
            <p className="animate-fade-up hidden font-display text-2xl font-semibold tracking-tight md:mb-5 md:block md:text-3xl">
              TourGo
            </p>

            <h1 className="animate-fade-up font-display text-[1.7rem] font-semibold leading-[1.1] tracking-tight [animation-delay:80ms] sm:text-5xl md:text-6xl">
              Сравните цены
              <br />и купите выгоднее
            </h1>

            <p className="animate-fade-up mt-2 max-w-md text-[14px] leading-snug text-primary-foreground/85 [animation-delay:140ms] md:mt-5 md:text-xl md:leading-relaxed">
              Туры, жильё, авто и помощь от компаний. Платите напрямую.
            </p>

            <Link
              to="/ai-search"
              search={{} as never}
              className="animate-fade-up mt-4 flex h-12 w-full items-center gap-3 rounded-2xl bg-background px-3.5 text-left text-foreground shadow-lg active:scale-[0.99] [animation-delay:200ms] md:hidden"
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

      <section className="container-page pt-4 md:pt-0">
        <div className="hidden grid-cols-3 gap-4 md:mt-6 md:grid">
          {facts.map((fact) => (
            <div key={fact.label} className="surface-card px-4 py-4 text-center">
              <p className="font-display text-3xl font-semibold leading-none">{fact.value}</p>
              <p className="mt-1 text-sm text-foreground/60">{fact.label}</p>
            </div>
          ))}
        </div>

        <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-2.5 md:mt-10 md:grid-cols-3 md:gap-4">
          {travelScenarios.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              search={{} as never}
              className="surface-card flex h-full items-center gap-2.5 px-3 py-3.5 text-left md:min-h-[11.5rem] md:flex-col md:items-start md:justify-between md:gap-2 md:p-6 md:transition-transform md:hover:-translate-y-1"
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
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-4 text-primary-foreground md:mt-8 md:rounded-[1.75rem] md:gap-4 md:px-8 md:py-6"
        >
          <span className="min-w-0">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/70 md:text-sm">
              <Building2 className="size-3.5 md:size-4" />
              {b2bNav.title}
            </span>
            <span className="mt-1 block font-display text-base font-semibold leading-snug md:mt-2 md:text-2xl">
              Приведите клиентов без комиссии туристу
            </span>
            <span className="mt-1 hidden text-sm leading-relaxed text-primary-foreground/80 md:block md:text-base">
              {b2bNav.hint}
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 md:size-6" />
        </Link>
      </section>

      <section className="container-page mt-6 md:mt-10">
        <SectionHead
          title="Куда едут чаще всего"
          subtitle="Откройте страну и сравните туры от разных компаний"
          action={
            <Button variant="outline" asChild>
              <Link to="/destinations">
                Все направления
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              to="/search"
              search={{ destination: dest.id } as never}
              className="hover-lift group relative overflow-hidden rounded-3xl"
            >
              <img
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-64 md:h-72"
              />
              <div className="absolute inset-0 media-scrim-strong" />
              {dest.photos?.filter((p) => !p.includes("images.unsplash.com")).slice(1, 4).length ? (
                <div className="absolute right-2 top-2 z-[2] flex gap-1 sm:right-3 sm:top-3">
                  {dest.photos
                    .filter((p) => !p.includes("images.unsplash.com"))
                    .slice(1, 4)
                    .map((img, i) => (
                      <SafeImage
                        key={`${dest.id}-${i}`}
                        src={img}
                        alt=""
                        className="size-7 rounded-md object-cover shadow-sm ring-1 ring-white/50 sm:size-10 sm:rounded-lg"
                      />
                    ))}
                </div>
              ) : null}
              <MediaCardCaption>
                <h3 className={mediaTitleClass("md")}>
                  {dest.flag} {dest.country}
                </h3>
                <p className={mediaBodyClass()}>{dest.blurb}</p>
                <p className={mediaMetaClass()}>
                  {dest.tours} предложений · {dest.city}
                </p>
              </MediaCardCaption>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Горящие туры"
          subtitle="Ближайшие вылеты со сниженной ценой. Успейте забронировать"
          action={
            <Button variant="outline" asChild>
              <Link to="/search" search={{ offers: "hot" } as never}>
                Смотреть остальные
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-3 flex items-center gap-2 text-base text-foreground/70 md:hidden">
          <Flame className="size-4 text-primary" />
          Скидки на ближайший вылет. Осталось мало мест
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hotTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
        <SeeRestLink
          to="/search"
          search={{ offers: "hot" }}
          label="Смотреть остальные горящие туры"
        />
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Экскурсии и развлечения"
          subtitle="Сафари, яхты и парки от местных компаний, когда вы уже на месте"
          action={
            <Button variant="outline" asChild>
              <Link to="/excursions">
                Смотреть остальные
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredExcursions.map((item) => (
            <Link
              key={item.id}
              to="/excursions"
              search={{ destination: item.destinationId, city: item.city } as never}
              className="hover-lift surface-card overflow-hidden p-0"
            >
              <img src={item.image} alt="" className="h-40 w-full object-cover" />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.city}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{item.duration}</p>
              </div>
            </Link>
          ))}
        </div>
        <SeeRestLink to="/excursions" label="Смотреть остальные экскурсии" />
      </section>

      <section className="container-page mt-16 mb-10 md:mt-24">
        <SectionHead
          title="Как устроен TourGo"
          subtitle="Три шага от идеи поездки до брони у компании"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {how.map((item) => (
            <div key={item.title} className="surface-card p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.text}</p>
            </div>
          ))}
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
    <div className="mt-6 flex justify-center md:mt-8">
      <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
        <Link to={to} search={(search ?? {}) as never}>
          {label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
