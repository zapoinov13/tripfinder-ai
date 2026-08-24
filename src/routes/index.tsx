import React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Flame,
  Handshake,
  MessageCircle,
  Mic,
  Scale,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { SearchPanel } from "@/components/site/search-panel";
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
import { destinations, formatPrice, heroImage, hotTours } from "@/data/demo";
import { usePlatformStore } from "@/lib/platform/hooks";
import { useCompactAppUi } from "@/hooks/use-native-app";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TourGo: сравните туры от разных компаний и выберите лучшую цену" },
      {
        name: "description",
        content:
          "Готовые туры в одном каталоге или одна заявка нескольким турфирмам. Сравнивайте цены, отели и условия. Платите напрямую выбранной компании.",
      },
      {
        property: "og:title",
        content: "TourGo: сравните туры от разных компаний и выберите лучшую цену",
      },
      {
        property: "og:description",
        content:
          "Готовые туры в одном каталоге или одна заявка нескольким турфирмам. Платите напрямую компании.",
      },
    ],
  }),
  component: Index,
});

/** Локальные кадры для баннеров: без Unsplash, чтобы не ломались на главной. */
function destPhoto(id: string, index = 0) {
  const dest = destinations.find((d) => d.id === id);
  if (!dest) return heroImage;
  const local = [dest.image, ...(dest.photos ?? [])].filter(
    (src) => src && !src.includes("images.unsplash.com"),
  );
  return local[index] ?? local[0] ?? dest.image ?? heroImage;
}

const steps = [
  {
    n: "01",
    icon: Search,
    title: "Ищете сами или пишете заявку",
    text: "Откройте каталог туров или опишите поездку один раз. Можно текстом или голосом.",
  },
  {
    n: "02",
    icon: Scale,
    title: "Смотрите цены рядом",
    text: "Несколько турфирм предлагают варианты одной поездки. Отель, питание и цена в одном списке.",
  },
  {
    n: "03",
    icon: Handshake,
    title: "Бронируете у компании",
    text: "Выбираете лучшее предложение и пишете фирме. Договор и оплата напрямую ей, не через нас.",
  },
];

const heroFacts = [
  { icon: Users, value: "40+", label: "проверенных турфирм" },
  { icon: Scale, value: "0 ₸", label: "доплаты туристу" },
  { icon: Flame, value: "1 200+", label: "туров в каталоге" },
];


function Index() {
  const compactApp = useCompactAppUi();

  return (
    <SiteLayout>
      <section className="relative isolate -mt-[65px] overflow-hidden md:-mt-[73px]">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            width={1920}
            height={1080}
            className="animate-soft-zoom size-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(175deg,oklch(0.16_0.02_250/0.72)_0%,oklch(0.16_0.02_250/0.38)_38%,oklch(0.16_0.02_250/0.9)_100%)]" />
        </div>

        <div className="container-page relative flex min-h-[92svh] flex-col justify-end gap-5 pb-8 pt-20 md:min-h-[92vh] md:gap-6 md:pb-16 md:pt-32">
          <div className="animate-fade-up max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-[0.7rem] font-semibold tracking-[0.14em] text-primary-foreground uppercase backdrop-blur-md md:text-xs">
              <ShieldCheck className="size-3.5" />
              Туры от проверенных компаний
            </p>
            <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-[1.05] tracking-tight text-primary-foreground drop-shadow-md md:mt-5 md:text-7xl md:leading-[1.02]">
              Сравните цены
              <br className="hidden sm:block" /> и купите тур выгоднее
            </h1>
            <p className="mt-3 max-w-xl text-base text-primary-foreground drop-shadow-md md:mt-4 md:text-xl">
              Готовые туры от разных турфирм в одном каталоге. Или одна заявка: компании сами
              пришлют цены, вы выберете лучшую и оплатите напрямую фирме.
            </p>

            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.8rem] text-primary-foreground/85 md:mt-6 md:gap-x-6 md:text-sm">

              {heroFacts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-2">
                  <fact.icon className="size-4 text-primary-foreground" />
                  <span>
                    <span className="font-semibold text-primary-foreground">{fact.value}</span>{" "}
                    {fact.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div id="search" className="animate-fade-up animation-delay-150 scroll-mt-28">
            <SearchPanel tone="hero" />
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-primary-foreground/85">
                Не хотите листать каталог?{" "}
                <Link
                  to="/request"
                  search={{}}
                  className="font-semibold text-primary-foreground underline underline-offset-4"
                >
                  {"\n"}Оставьте заявку, турфирмы пришлют цены сами
                </Link>
              </p>
              <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
                {destinations.slice(0, 6).map((d) => (
                  <Link
                    key={d.id}
                    to="/destination/$destinationId"
                    params={{ destinationId: d.id }}
                    className="snap-start whitespace-nowrap rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3.5 py-2 text-sm font-medium text-primary-foreground backdrop-blur-md transition-colors hover:bg-primary-foreground/20"
                  >
                    {d.flag} {d.country}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page mt-10 md:mt-16">
        <SectionHead
          title="Куда едут чаще всего"
          subtitle="Откройте страну: внутри туры от разных компаний с ценами рядом"
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
              to="/destination/$destinationId"
              params={{ destinationId: dest.id }}
              className="hover-lift group relative overflow-hidden rounded-3xl"
            >
              <img
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-64 md:h-72 lg:h-80"
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
                      className="size-7 rounded-md object-cover ring-1 ring-white/50 shadow-sm sm:size-10 sm:rounded-lg"
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
          title={"Горящие туры\nуспейте на скидку"}
          subtitle="Вылеты в ближайшие даты: компании уже снизили цену"
          action={
            <Button variant="outline" asChild>
              <Link to="/hot">
                Все горящие
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground md:hidden">
          <Flame className="size-4 text-primary" />
          Скидки на ближайший вылет
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hotTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
        <div className="mt-6 md:hidden">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/hot">Смотреть все горящие туры</Link>
          </Button>
        </div>
      </section>

      <HomeFeaturedTours />

      <section className="container-page mt-16 md:mt-24">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/excursions"
            className="group relative overflow-hidden rounded-3xl"
          >
            <SafeImage
              src={destPhoto("uae", 2)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 md:p-8">
              <h3 className="media-caption font-display text-xl font-semibold">
                Экскурсии
              </h3>
              <p className="media-caption-muted mt-2 text-sm">
                Сафари, яхты, обзор города, парки и билеты. Цены от разных компаний рядом.
              </p>
              <span className="media-caption mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                Смотреть экскурсии
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/assistance"
            className="group relative overflow-hidden rounded-3xl"
          >
            <SafeImage
              src={destPhoto("turkey", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 md:p-8">
              <h3 className="media-caption font-display text-xl font-semibold">
                Уже в поездке?
              </h3>
              <p className="media-caption-muted mt-2 text-sm">
                Нужна машина, гид или билеты на сегодня? Компании в городе пришлют цены.
              </p>
              <span className="media-caption mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                Попросить помощь
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {!compactApp ? (
      <section className="container-page mt-10 md:mt-14">
        <div className="relative overflow-hidden rounded-[2rem]">
          <SafeImage
            src={destPhoto("thailand", 1)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,oklch(0.16_0.02_250/0.92)_0%,oklch(0.16_0.02_250/0.72)_46%,oklch(0.16_0.02_250/0.42)_100%)]" />
          <div className="relative grid min-h-[420px] gap-10 p-7 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)] md:items-center md:p-10 lg:min-h-[460px] lg:p-12">
            <div>
              <p className="inline-flex rounded-full bg-primary-foreground/14 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary-foreground uppercase backdrop-blur-md">
                Не хотите искать сами?
              </p>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight text-primary-foreground md:text-5xl md:leading-[1.08]">
                Одна заявка. Несколько цен.
              </h2>
              <p className="mt-4 max-w-lg text-sm text-primary-foreground/80 md:text-base">
                Расскажите, куда и когда едете. Компании сами пришлют отель, цену и условия. Вы
                сравниваете и выбираете.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to="/request" search={{}}>
                    Получить предложения
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20"
                  asChild
                >
                  <a href="#search">Искать самому</a>
                </Button>
              </div>
            </div>

            <div className="relative">
              <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary-foreground/60 uppercase">
                Ответы на заявку
              </p>
              <ul className="space-y-3">
                {[
                  {
                    company: "Family Travel",
                    hotel: "Rixos Premium Dubai",
                    note: "7 ночей · всё включено",
                    price: 1290000,
                    highlight: true,
                  },
                  {
                    company: "Dubai Travel",
                    hotel: "Address Beach Resort",
                    note: "7 ночей · завтраки",
                    price: 1180000,
                  },
                  {
                    company: "Sunway",
                    hotel: "Jumeirah Beach Hotel",
                    note: "7 ночей · полупансион",
                    price: 1350000,
                  },
                ].map((offer) => (
                  <li
                    key={offer.company}
                    className={cn(
                      "rounded-2xl border p-4 backdrop-blur-md",
                      offer.highlight
                        ? "border-primary-foreground/35 bg-primary-foreground text-ink"
                        : "border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-wide uppercase opacity-60">
                          {offer.company}
                        </p>
                        <p className="mt-1 font-display text-sm font-semibold">{offer.hotel}</p>
                        <p className={cn("mt-1 text-xs", offer.highlight ? "opacity-70" : "text-primary-foreground/70")}>
                          {offer.note}
                        </p>
                      </div>
                      <p className="shrink-0 font-display text-sm font-semibold">
                        {formatPrice(offer.price)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {!compactApp ? (
      <>
      <section className="container-page mt-16 md:mt-24">
        <div className="overflow-hidden rounded-[2rem] bg-ink text-primary-foreground">
          <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/70 uppercase">
                Как устроен TourGo
              </p>
              <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
                От идеи отпуска до выбора турфирмы за три шага
              </h2>
              <p className="mt-3 max-w-xl text-sm text-primary-foreground/75 md:text-base">
                Мы не продаём туры сами. Мы собираем предложения компаний, чтобы вы сравнили цены и
                купили у той, что подходит.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                asChild
              >
                <a href="#search">Найти тур</a>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20"
                asChild
              >
                <Link to="/request" search={{}}>
                  Оставить заявку
                </Link>
              </Button>
            </div>
          </div>

          <ol className="grid border-t border-primary-foreground/10 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.n}
                className={cn(
                  "relative p-6 md:p-8",
                  index > 0 && "border-t border-primary-foreground/10 md:border-t-0 md:border-l",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary-foreground/12">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-4xl font-semibold text-primary-foreground/20">
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-16 md:mt-24">
        <div className="container-page">
          <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Почему TourGo</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.08]">
            Хватит собирать отпуск в десяти WhatsApp
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Раньше вы писали знакомым агентам и ждали скрины прайсов. Здесь все ответы в одном
            окне: кто какую цену дал, какой отель и что входит.
          </p>
        </div>

        <div className="container-page mt-8 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <Link
            to="/request"
            search={{}}
            className="group relative min-h-[300px] overflow-hidden rounded-[2rem] lg:col-span-7 lg:row-span-2 lg:min-h-[520px]"
          >
            <SafeImage
              src={destPhoto("uae", 1)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[300px] flex-col justify-end p-6 md:p-8 lg:min-h-[520px]">
              <span className="w-fit rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                Самый удобный способ
              </span>
              <h3 className="media-caption mt-4 font-display text-2xl font-semibold md:text-4xl">
                Одна заявка: цены от нескольких турфирм
              </h3>
              <p className="media-caption-muted mt-3 max-w-lg text-sm md:text-base">
                Опишите куда, когда и бюджет. Подходящие компании пришлют свои варианты. Вы
                сравниваете и пишете той, чья цена и условия лучше.
              </p>
              <span className="media-caption mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                Получить цены от компаний
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/search"
            search={{} as never}
            className="group relative min-h-[220px] overflow-hidden rounded-[2rem] lg:col-span-5"
          >
            <SafeImage
              src={destPhoto("maldives", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[220px] flex-col justify-end p-6">
              <h3 className="media-caption font-display text-xl font-semibold">
                Каталог как витрина, а не лента сторис
              </h3>
              <p className="media-caption-muted mt-2 text-sm">
                Цена, питание, перелёт и название компании сразу на карточке. Без скринов из чата.
              </p>
            </div>
          </Link>

          <Link
            to="/about"
            className="group relative min-h-[220px] overflow-hidden rounded-[2rem] lg:col-span-5"
          >
            <SafeImage
              src={destPhoto("turkey", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 media-scrim-strong" />
            <div className="relative flex h-full min-h-[220px] flex-col justify-end p-6">
              <h3 className="media-caption font-display text-xl font-semibold">
                Платите турфирме, не «сайту»
              </h3>
              <p className="media-caption-muted mt-2 text-sm">
                TourGo: витрина. Договор и деньги у компании, которую выбрали вы.
              </p>
            </div>
          </Link>
        </div>

        <div className="container-page mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] border border-border/80 bg-secondary/40 p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Как было раньше
            </p>
            <ul className="mt-5 space-y-4">
              {[
                { icon: MessageCircle, text: "Десять чатов, сторис и «скину прайс вечером»" },
                { icon: Users, text: "Непонятно, кому можно доверять, а кто просто пишет" },
                { icon: Scale, text: "Цены разбросаны: сравнить почти невозможно" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-card">
                    <item.icon className="size-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] bg-ink p-6 text-primary-foreground md:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/70 uppercase">
              Как с TourGo
            </p>
            <ul className="mt-5 space-y-4">
              {[
                { icon: ShieldCheck, text: "Только компании с проверкой документов" },
                { icon: Scale, text: "Отели, питание и цены рядом, выбор за минуты" },
                { icon: Mic, text: "Можно просто сказать голосом, какой отдых хотите" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm text-primary-foreground/90">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary-foreground/12">
                    <item.icon className="size-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page mt-16 mb-8 md:mt-24">
        <div className="relative overflow-hidden rounded-[2rem]">
          <SafeImage
            src={destPhoto("uae", 2)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,oklch(0.16_0.02_250/0.92)_0%,oklch(0.16_0.02_250/0.72)_48%,oklch(0.16_0.02_250/0.38)_100%)]" />
          <div className="relative grid min-h-[340px] gap-10 p-7 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] md:items-end md:p-10 lg:min-h-[380px] lg:p-12">
            <div>
              <p className="inline-flex rounded-full bg-primary-foreground/14 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary-foreground uppercase backdrop-blur-md">
                Для турфирм
              </p>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight text-primary-foreground md:text-5xl md:leading-[1.08]">
                Туристы уже ищут отпуск. Покажите свою цену первыми
              </h2>
              <p className="mt-4 max-w-lg text-sm text-primary-foreground/80 md:text-base">
                Заявки приходят в кабинет. Вы отвечаете предложением. Клиент ваш, оплата идёт вам,
                не платформе.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground text-ink hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to="/company-signup">
                    Добавить турфирму
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20"
                  asChild
                >
                  <Link to="/for-companies">Как получать заявки</Link>
                </Button>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                {
                  title: "Заявки без холодных звонков",
                  text: "Турист сам описал поездку, вы видите только подходящие запросы.",
                },
                {
                  title: "Клиент остаётся вашим",
                  text: "Договор и оплата у вас. TourGo не забирает комиссию с тура.",
                },
                {
                  title: "Страница с знаком доверия",
                  text: "Фото, отзывы и проверка: турист видит, что вы настоящая компания.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur-md"
                >
                  <p className="font-display text-sm font-semibold text-primary-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-primary-foreground/75">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      </>
      ) : null}
    </SiteLayout>
  );
}

function HomeFeaturedTours() {
  const state = usePlatformStore();
  const now = Date.now();
  const tours = state.promotions
    .filter(
      (p) =>
        p.type === "HOME_FEATURE" &&
        p.status === "ACTIVE" &&
        new Date(p.expiresAt).getTime() > now,
    )
    .map((p) => state.tours.find((t) => t.id === p.tourOfferId && t.status === "active"))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .slice(0, 4);

  if (tours.length === 0) return null;

  return (
    <section className="container-page mt-16 md:mt-24">
      <SectionHead
        title="Туры на главной"
        subtitle="Компании подняли эти предложения повыше. Сравните и выберите"
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} layout="grid" />
        ))}
      </div>
    </section>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <h2 className={cn("font-display text-2xl font-semibold tracking-tight md:text-3xl")}>
          {title.split("\n").map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < title.split("\n").length - 1 && <br />}
            </React.Fragment>
          ))}
        </h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="hidden md:block">{action}</div> : null}
    </div>
  );
}
