import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2, Flame, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";

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
      { title: "TourGo: туры, экскурсии, жильё, авто и помощь в поездке" },
      {
        name: "description",
        content: "Всё для путешествия в одном месте. Выберите, что нужно — и ищите внутри раздела.",
      },
    ],
  }),
  component: Index,
});

const how = [
  {
    icon: Sparkles,
    title: "Выберите, что нужно",
    text: "Тур, экскурсия, жильё, авто, спорт или помощь. Поиск — уже внутри раздела.",
  },
  {
    icon: Wallet,
    title: "Сравните цены компаний",
    text: "Несколько предложений рядом. Смотрите состав, даты и сумму.",
  },
  {
    icon: ShieldCheck,
    title: "Платите компании напрямую",
    text: "TourGo не продаёт поездку за агентство. Договор и оплата — у выбранной фирмы.",
  },
];

function Index() {
  const featuredExcursions = getFeaturedExcursions(3);

  return (
    <SiteLayout>
      <section className="container-page py-8 md:py-14">
        <h1 className="font-display text-4xl font-semibold leading-[1.12] tracking-tight md:text-6xl">
          Что вам нужно?
        </h1>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-foreground/70 md:text-xl">
          Всё для путешествия в одном месте
        </p>

        <div className="mt-6 max-w-2xl">
          <AiIntentBar />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-3 md:gap-4">
          {travelScenarios.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              search={{} as never}
              className="hover-lift surface-card flex min-h-[9.5rem] flex-col justify-between p-4 md:min-h-[11.5rem] md:p-6"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary md:size-14">
                <item.icon className="size-6 md:size-7" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-snug md:text-2xl">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-foreground/65 md:text-base">
                  {item.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>

        <Link
          to={b2bNav.to}
          className="mt-6 flex items-center justify-between gap-4 rounded-[1.75rem] bg-ink px-5 py-5 text-primary-foreground md:mt-8 md:px-8 md:py-6"
        >
          <span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
              <Building2 className="size-4" />
              {b2bNav.title}
            </span>
            <span className="mt-2 block font-display text-xl font-semibold leading-snug md:text-2xl">
              Вы туристическая компания?
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-primary-foreground/80 md:text-base">
              {b2bNav.hint}
            </span>
          </span>
          <ArrowRight className="size-6 shrink-0" />
        </Link>
      </section>

      <section className="container-page mt-6 md:mt-10">
        <SectionHead
          title="Куда едут чаще всего"
          subtitle="Откройте страну — внутри туры от разных компаний"
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
          subtitle="Ближайшие даты: компании уже снизили цену"
          action={
            <Button variant="outline" asChild>
              <Link to="/search" search={{ offers: "hot" } as never}>
                Все горящие
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-3 flex items-center gap-2 text-base text-foreground/70 md:hidden">
          <Flame className="size-4 text-primary" />
          Скидки на ближайший вылет
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hotTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Экскурсии и развлечения"
          subtitle="Сафари, яхты, парки — когда вы уже на месте"
          action={
            <Button variant="outline" asChild>
              <Link to="/excursions">
                Все экскурсии
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
      </section>

      <section className="container-page mt-16 mb-10 md:mt-24">
        <SectionHead title="Как устроен TourGo" subtitle="Коротко, без лишних экранов" />
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
        {subtitle ? <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground/70">{subtitle}</p> : null}
      </div>
      {action ? <div className="hidden md:block">{action}</div> : null}
    </div>
  );
}
