import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Flame,
  Gem,
  Layers,
  Sparkles,
  Tag,
} from "lucide-react";

import { ChatDemo, ChatDemoFeatures } from "@/components/site/chat-demo";
import { CompareTable } from "@/components/site/compare-table";
import { FaqSection } from "@/components/site/faq-section";
import { QuickPrompts } from "@/components/site/quick-prompts";
import { SearchPanel } from "@/components/site/search-panel";
import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import {
  destinations,
  formatPrice,
  getHotel,
  heroImage,
  hotTours,
  premiumTours,
} from "@/data/demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voyago — найдите путешествие, которое подходит именно вам" },
      {
        name: "description",
        content:
          "Маркетплейс туров: сравниваем предложения туроператоров, горящие туры и Premium-цены. Подбор тура с AI.",
      },
      { property: "og:title", content: "Voyago — найдите путешествие, которое подходит именно вам" },
      {
        property: "og:description",
        content:
          "Маркетплейс туров: сравниваем предложения туроператоров, горящие туры и Premium-цены. Подбор тура с AI.",
      },
    ],
  }),
  component: Index,
});

const benefits = [
  {
    icon: Layers,
    title: "Все операторы в одном месте",
    text: "Сравнивайте предложения разных туристических компаний без переключений.",
  },
  {
    icon: Sparkles,
    title: "AI-подбор",
    text: "Опишите отдых своими словами — AI найдёт подходящие варианты.",
  },
  {
    icon: Tag,
    title: "Честные цены",
    text: "Одинаковые условия рядом: легче выбрать лучшее предложение.",
  },
  {
    icon: Gem,
    title: "Premium-доступ",
    text: "Закрытые цены и ранний доступ к горящим турам.",
  },
];

const trustStats = [
  { value: "12", label: "подключённых туроператоров" },
  { value: "~30 сек", label: "до первой подборки туров" },
  { value: "0 ₸", label: "наценки к цене оператора" },
  { value: "24/7", label: "AI-подбор без выходных" },
];

const steps = [
  { n: "01", title: "Куда хотите", text: "Город, даты и бюджет — или просто расскажите AI." },
  { n: "02", title: "Смотрим варианты", text: "Туры от разных операторов в одной выдаче." },
  { n: "03", title: "Сравниваете", text: "Цена, питание, море и рейтинг — рядом." },
  { n: "04", title: "Бронируете", text: "Выбираете лучший тур и оформляете спокойно." },
];

function Index() {
  return (
    <SiteLayout>
      {/* Full-bleed hero — one composition */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            width={1920}
            height={1080}
            className="animate-soft-zoom h-full min-h-[92vh] w-full object-cover md:min-h-[88vh]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.16_0.02_250/0.45)_0%,oklch(0.16_0.02_250/0.55)_45%,oklch(0.16_0.02_250/0.82)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.63_0.19_32/0.22),transparent_55%)]" />
        </div>

        <div className="container-page relative flex min-h-[92vh] flex-col justify-end pb-8 pt-24 md:min-h-[88vh] md:pb-12 md:pt-28">
          <div className="animate-fade-up max-w-3xl">
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-primary-foreground/90 uppercase md:text-base">
              Voyago
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-primary-foreground md:text-6xl md:leading-[1.05]">
              Найдите путешествие, которое подходит именно вам
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/80 md:text-lg">
              Сравниваем туры от разных операторов и помогаем найти лучшее предложение.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#search">Найти тур</a>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary-foreground/12 text-primary-foreground backdrop-blur-md hover:bg-primary-foreground/20"
                asChild
              >
                <Link to="/ai-search">
                  <Sparkles className="size-4" />
                  Найти с AI
                </Link>
              </Button>
            </div>
          </div>

          <div
            id="search"
            className="animate-fade-up animation-delay-150 mt-10 scroll-mt-28 md:mt-12"
          >
            <SearchPanel />
          </div>

          <QuickPrompts
            variant="onImage"
            className="animate-fade-up animation-delay-300 mt-5"
          />

          <div className="animate-fade-up animation-delay-300 mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {destinations.slice(0, 6).map((dest) => (
              <Link
                key={dest.id}
                to="/destination/$destinationId"
                params={{ destinationId: dest.id }}
                className="shrink-0 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3.5 py-2 text-sm text-primary-foreground backdrop-blur-md transition-colors hover:bg-primary-foreground/20"
              >
                {dest.flag} {dest.country}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page mt-10 md:mt-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {trustStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card/70 px-5 py-4">
              <p className="font-display text-2xl font-semibold md:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Популярные направления"
          subtitle="Выберите страну — покажем актуальные туры"
        />
        <div className="mt-8 flex gap-4 overflow-x-auto pb-2 no-scrollbar md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {destinations.slice(0, 6).map((dest, i) => (
            <Link
              key={dest.id}
              to="/destination/$destinationId"
              params={{ destinationId: dest.id }}
              className={cn(
                "hover-lift group relative w-[78vw] shrink-0 overflow-hidden rounded-3xl sm:w-[46vw] md:w-auto",
                i === 0 && "md:col-span-2 md:row-span-2",
              )}
            >
              <img
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className={cn(
                  "w-full object-cover transition-transform duration-700 group-hover:scale-105",
                  i === 0 ? "h-72 md:h-full md:min-h-[28rem]" : "h-72",
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <h3 className="font-display text-xl font-semibold text-primary-foreground md:text-2xl">
                  {dest.flag} {dest.country}
                </h3>
                <p className="mt-1 text-sm text-primary-foreground/80">{dest.blurb}</p>
                <p className="mt-3 text-xs font-medium tracking-wide text-primary-foreground/65">
                  от {dest.tours.toLocaleString("ru-RU")} туров
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Горящие туры"
          subtitle="Лучшие цены на ближайшие даты"
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

      <section className="container-page mt-16 md:mt-24">
        <div className="gradient-premium relative overflow-hidden rounded-[2rem] px-6 py-12 md:px-12 md:py-16">
          <div className="pointer-events-none absolute -right-20 top-0 size-72 rounded-full bg-premium/15 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
            <div className="max-w-lg">
              <p className="text-xs font-semibold tracking-[0.18em] text-premium uppercase">
                Premium
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-primary-foreground md:text-4xl">
                Больше путешествий. Меньше цены.
              </h2>
              <p className="mt-3 text-primary-foreground/75">
                Эксклюзивные предложения и закрытые цены для подписчиков Voyago Premium.
              </p>
              <Button size="lg" variant="secondary" className="mt-8" asChild>
                <Link to="/premium">Открыть Premium</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {premiumTours.map((tour) => {
                const hotel = getHotel(tour.hotelId);
                return (
                  <Link
                    key={tour.id}
                    to="/tour/$tourId"
                    params={{ tourId: tour.id }}
                    className="group overflow-hidden rounded-3xl bg-card/95 transition-transform hover:-translate-y-1"
                  >
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      loading="lazy"
                      className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="p-4">
                      <p className="truncate font-display text-sm font-semibold">{hotel.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hotel.flag} {hotel.city}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground line-through">
                        {formatPrice(tour.price)}
                      </p>
                      <p className="font-display text-xl font-semibold">
                        {formatPrice(tour.premiumPrice ?? tour.price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Почему Voyago"
          subtitle="Один маркетплейс — меньше хаоса при поиске тура"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-border/80 bg-card/60 p-6 transition-colors hover:border-primary/25 hover:bg-card"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Как это работает"
          subtitle="Четыре простых шага от идеи до бронирования"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.n} className="relative rounded-3xl bg-secondary/50 p-6">
              {index < steps.length - 1 ? (
                <span className="absolute top-10 right-0 hidden h-px w-4 translate-x-1/2 bg-border md:block" />
              ) : null}
              <span className="font-display text-3xl font-semibold text-primary/35">{step.n}</span>
              <h3 className="mt-4 font-display text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-ai/10 px-3 py-1 text-xs font-semibold text-ai">
              <Sparkles className="size-3.5" />
              AI Concierge
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Диалог вместо десятка фильтров
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Не знаете, куда поехать? Опишите отдых своими словами — AI уточнит детали и соберёт
              подборку туров от разных операторов под ваш бюджет.
            </p>
            <div className="mt-7">
              <ChatDemoFeatures />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/ai-search">
                  <Sparkles className="size-4" />
                  Попробовать AI-подбор
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#search">Обычный поиск</a>
              </Button>
            </div>
          </div>
          <ChatDemo />
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead
          title="Voyago и альтернативы"
          subtitle="Что вы получаете по сравнению с поиском вручную и походом в турагентство"
        />
        <div className="mt-8">
          <CompareTable />
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
          <div>
            <SectionHead title="Частые вопросы" subtitle="Коротко о том, как всё устроено" />
            <Button variant="outline" className="mt-6" asChild>
              <Link to="/about">Подробнее о Voyago</Link>
            </Button>
          </div>
          <FaqSection />
        </div>
      </section>

      <section className="container-page mt-12 mb-8 md:mt-16">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-border bg-card px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold">Вы туроператор?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Подключите каталог и получайте бронирования из Voyago.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/for-operators">
              Подключить компанию
              <ArrowRight className="size-4" />
            </Link>
          </Button>
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
  action?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="hidden md:block">{action}</div> : null}
    </div>
  );
}
