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
import { CompareTable } from "@/components/site/compare-table";
import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { destinations, formatPrice, heroImage, hotTours } from "@/data/demo";
import { usePlatformStore } from "@/lib/platform/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TourGo: найдите тур сами или получите предложения от турфирм" },
      {
        name: "description",
        content:
          "Найдите и сравните предложения разных туристических компаний в одном месте. Или оставьте одну заявку, турфирмы предложат свои варианты.",
      },
      {
        property: "og:title",
        content: "TourGo: найдите тур сами или получите предложения от турфирм",
      },
      {
        property: "og:description",
        content: "Найдите и сравните предложения разных туристических компаний в одном месте.",
      },
    ],
  }),
  component: Index,
});

function destPhoto(id: string, index = 0) {
  const dest = destinations.find((d) => d.id === id);
  return dest?.photos?.[index] ?? dest?.image ?? heroImage;
}

const steps = [
  {
    n: "01",
    icon: Search,
    title: "Находите",
    text: "Смотрите туры в каталоге или оставьте одну заявку. Можно написать текстом или сказать голосом.",
  },
  {
    n: "02",
    icon: Scale,
    title: "Сравниваете",
    text: "Несколько компаний на одну поездку. Цена, отель, питание и условия рядом.",
  },
  {
    n: "03",
    icon: Handshake,
    title: "Выбираете",
    text: "Пишете выбранной фирме. Договор и оплата у неё. TourGo за тур денег не берёт.",
  },
];

function Index() {
  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            width={1920}
            height={1080}
            className="animate-soft-zoom h-full min-h-[92vh] w-full object-cover md:min-h-[90vh]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.16_0.02_250/0.28)_0%,oklch(0.16_0.02_250/0.22)_28%,oklch(0.16_0.02_250/0.78)_100%)]" />
        </div>

        <div className="container-page relative flex min-h-[92vh] flex-col justify-end pb-8 pt-6 md:min-h-[90vh] md:pb-14 md:pt-8">
          <div className="animate-fade-up max-w-3xl">
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-primary-foreground/80 uppercase">
              TourGo
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-primary-foreground md:text-6xl md:leading-[1.05]">
              Куда хотите поехать?
            </h1>
            <p className="mt-3 max-w-lg text-base text-primary-foreground/85 md:text-lg">
              Несколько компаний. Цены рядом. Вы выбираете.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Проверенные компании", "Сравнение рядом", "Платите фирме"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground/90 backdrop-blur-md"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-fade-up animation-delay-150 mt-6 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar md:mt-8">
            {destinations.map((dest) => (
              <Link
                key={dest.id}
                to="/destination/$destinationId"
                params={{ destinationId: dest.id }}
                className="group relative h-24 w-[7.5rem] shrink-0 overflow-hidden rounded-2xl md:h-28 md:w-36"
              >
                <img
                  src={dest.image}
                  alt=""
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent" />
                <span className="absolute inset-x-2 bottom-2 font-display text-sm font-semibold text-primary-foreground">
                  {dest.flag} {dest.country}
                </span>
              </Link>
            ))}
          </div>

          <div
            id="search"
            className="animate-fade-up animation-delay-300 mt-5 scroll-mt-28 md:mt-7"
          >
            <SearchPanel tone="hero" />
            <p className="mt-3 text-sm text-primary-foreground/75">
              Не хотите заполнять форму?{" "}
              <Link to="/request" search={{}} className="font-semibold text-primary-foreground underline-offset-4 hover:underline">
                Получите предложения от компаний
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="container-page mt-10 md:mt-14">
        <div className="relative overflow-hidden rounded-[2rem]">
          <img
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

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="🔥 Горящие туры"
          subtitle="Выгодные предложения на ближайшие даты"
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
          Свежие скидки на вылет
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

      <section className="mt-16 md:mt-24">
        <div className="container-page">
          <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Почему TourGo</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.08]">
            Хватит собирать отпуск в десяти чатах
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Мы не турагентство и не продаём туры. Компании показывают цены рядом. Вы сравниваете и
            платите той фирме, которую выбрали.
          </p>
        </div>

        <div className="container-page mt-8 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <Link
            to="/request"
            search={{}}
            className="group relative min-h-[300px] overflow-hidden rounded-[2rem] lg:col-span-7 lg:row-span-2 lg:min-h-[520px]"
          >
            <img
              src={destPhoto("uae", 1)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.16_0.02_250/0.15)_0%,oklch(0.16_0.02_250/0.78)_100%)]" />
            <div className="relative flex h-full min-h-[300px] flex-col justify-end p-6 md:p-8 lg:min-h-[520px]">
              <span className="w-fit rounded-full bg-primary-foreground/14 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-md">
                Главное
              </span>
              <h3 className="mt-4 font-display text-2xl font-semibold text-primary-foreground md:text-4xl">
                Одна заявка. Несколько ответов.
              </h3>
              <p className="mt-3 max-w-lg text-sm text-primary-foreground/80 md:text-base">
                Раньше вы писали в десять WhatsApp. Здесь оставляете пожелание один раз. Компании
                сами присылают цену, отель и условия.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground">
                Получить предложения
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/search"
            search={{} as never}
            className="group relative min-h-[220px] overflow-hidden rounded-[2rem] lg:col-span-5"
          >
            <img
              src={destPhoto("maldives", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />
            <div className="relative flex h-full min-h-[220px] flex-col justify-end p-6">
              <h3 className="font-display text-xl font-semibold text-primary-foreground">
                Сравнивайте как на витрине
              </h3>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Цена, питание, перелёт и компания рядом. Без сторис и скринов в переписке.
              </p>
            </div>
          </Link>

          <Link
            to="/about"
            className="group relative min-h-[220px] overflow-hidden rounded-[2rem] lg:col-span-5"
          >
            <img
              src={destPhoto("turkey", 0)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/10" />
            <div className="relative flex h-full min-h-[220px] flex-col justify-end p-6">
              <h3 className="font-display text-xl font-semibold text-primary-foreground">
                Платите фирме, не посреднику
              </h3>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Договор и деньги у компании, которую выбрали вы. TourGo не берёт оплату за поездку.
              </p>
            </div>
          </Link>
        </div>

        <div className="container-page mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] border border-border/80 bg-secondary/40 p-6 md:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Раньше
            </p>
            <ul className="mt-5 space-y-4">
              {[
                { icon: MessageCircle, text: "Десять чатов, сторис и «скину прайс вечером»" },
                { icon: Users, text: "Непонятно, какая фирма настоящая, а какая просто пишет" },
                { icon: Scale, text: "Цены в разных местах. Сравнить почти невозможно" },
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
              С TourGo
            </p>
            <ul className="mt-5 space-y-4">
              {[
                { icon: ShieldCheck, text: "Проверенные компании. Данные смотрим до размещения" },
                { icon: Scale, text: "Отели, питание и цены рядом. Выбираете за минуты" },
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

        <div className="container-page mt-8">
          <CompareTable />
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead title="Популярные направления" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest, i) => (
            <Link
              key={dest.id}
              to="/destination/$destinationId"
              params={{ destinationId: dest.id }}
              className={cn(
                "hover-lift group relative overflow-hidden rounded-3xl",
                i === 0 && "sm:col-span-2 lg:col-span-1",
              )}
            >
              <img
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 lg:h-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
              {dest.photos?.slice(1, 4).length ? (
                <div className="absolute right-3 top-3 flex gap-1">
                  {dest.photos.slice(1, 4).map((img, i) => (
                    <img
                      key={`${dest.id}-${i}`}
                      src={img}
                      alt=""
                      className="size-10 rounded-lg object-cover ring-1 ring-primary-foreground/40"
                    />
                  ))}
                </div>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-xl font-semibold text-primary-foreground">
                  {dest.flag} {dest.country}
                </h3>
                <p className="mt-1 text-sm text-primary-foreground/80">{dest.blurb}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
                  {dest.tours} предложений · {dest.city}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/excursions"
            className="group relative overflow-hidden rounded-3xl"
          >
            <img
              src={destinations.find((d) => d.id === "uae")?.photos?.[2] ?? destinations[1]?.image}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/15" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 md:p-8">
              <h3 className="font-display text-xl font-semibold text-primary-foreground">
                Экскурсии
              </h3>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Сафари, яхты, обзор города, парки и билеты. Цены от разных компаний рядом.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground">
                Смотреть экскурсии
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/assistance"
            className="group relative overflow-hidden rounded-3xl"
          >
            <img
              src={destinations.find((d) => d.id === "turkey")?.image}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/15" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 md:p-8">
              <h3 className="font-display text-xl font-semibold text-primary-foreground">
                Уже в поездке?
              </h3>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Нужна машина, гид или билеты на сегодня? Компании в городе пришлют цены.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground">
                Попросить помощь
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <div className="overflow-hidden rounded-[2rem] bg-ink text-primary-foreground">
          <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/70 uppercase">
                Как это работает
              </p>
              <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Три шага. Без десяти чатов.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-primary-foreground/75 md:text-base">
                Ищете сами или оставляете заявку. Сравниваете предложения. Платите компании,
                которую выбрали.
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

      <section className="container-page mt-16 mb-8 md:mt-24">
        <div className="relative overflow-hidden rounded-[2rem]">
          <img
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
                Туристы уже ищут. Покажите свои цены.
              </h2>
              <p className="mt-4 max-w-lg text-sm text-primary-foreground/80 md:text-base">
                Оставляют заявку, вы отвечаете. Клиент ваш, оплата вам. Кабинет можно открыть сразу.
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
                  <Link to="/for-companies">Как это устроено</Link>
                </Button>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                { title: "Заявки приходят сами", text: "Турист пишет один раз. Вы видите подходящие запросы." },
                { title: "Клиент остаётся вашим", text: "Договор и оплата у вас. TourGo за тур денег не берёт." },
                { title: "Страница компании", text: "Фото, отзывы и знак проверки, который видят туристы." },
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
        title="Рекомендуем"
        subtitle="Компании подняли эти туры на главную. Сравните и выберите."
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
          {title}
        </h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="hidden md:block">{action}</div> : null}
    </div>
  );
}
