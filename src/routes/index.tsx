import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Flame,
  Layers,
  MapPinned,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { FaqSection } from "@/components/site/faq-section";
import { SearchPanel } from "@/components/site/search-panel";
import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { Button } from "@/components/ui/button";
import { destinations, heroImage, hotTours } from "@/data/demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TourGo — найдите тур сами или получите предложения от турфирм" },
      {
        name: "description",
        content:
          "Найдите и сравните предложения разных туристических компаний в одном месте. Или оставьте одну заявку — турфирмы предложат свои варианты.",
      },
      {
        property: "og:title",
        content: "TourGo — найдите тур сами или получите предложения от турфирм",
      },
      {
        property: "og:description",
        content: "Найдите и сравните предложения разных туристических компаний в одном месте.",
      },
    ],
  }),
  component: Index,
});

const benefits = [
  {
    icon: ShieldCheck,
    emoji: "🏆",
    title: "Проверенные турфирмы",
    text: "Мы проверяем данные компаний перед размещением.",
  },
  {
    icon: Layers,
    emoji: "🔎",
    title: "Всё в одном месте",
    text: "Не нужно писать в десять разных WhatsApp и Instagram.",
  },
  {
    icon: Scale,
    emoji: "⚖️",
    title: "Легко сравнить",
    text: "Цена, отель, питание, перелёт и условия рядом.",
  },
  {
    icon: Sparkles,
    emoji: "✨",
    title: "Можно просто рассказать",
    text: "Опишите поездку текстом или голосом — TourGo поможет найти варианты.",
  },
];

const steps = [
  {
    n: "1",
    title: "Найдите",
    text: "Выберите направление или расскажите о поездке своими словами.",
  },
  { n: "2", title: "Сравните", text: "Посмотрите предложения разных турфирм." },
  {
    n: "3",
    title: "Получите дополнительные варианты",
    text: "Оставьте заявку, если хотите, чтобы турфирмы сами предложили тур.",
  },
  { n: "4", title: "Выберите", text: "Сравните условия и свяжитесь с подходящей компанией." },
];

const availableNow = ["uae"];

function Index() {
  const ready = destinations.filter((d) => availableNow.includes(d.id));
  const soon = destinations.filter((d) => !availableNow.includes(d.id)).slice(0, 5);

  return (
    <SiteLayout>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            width={1920}
            height={1080}
            className="animate-soft-zoom h-full min-h-[92vh] w-full object-cover md:min-h-[86vh]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.16_0.02_250/0.45)_0%,oklch(0.16_0.02_250/0.55)_45%,oklch(0.16_0.02_250/0.82)_100%)]" />
        </div>

        <div className="container-page relative flex min-h-[92vh] flex-col justify-end pb-8 pt-24 md:min-h-[86vh] md:pb-12 md:pt-28">
          <div className="animate-fade-up max-w-3xl">
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-primary-foreground/90 uppercase">
              TourGo
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-primary-foreground md:text-6xl md:leading-[1.05]">
              Куда хотите поехать?
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/85 md:text-lg">
              Найдите и сравните предложения разных туристических компаний в одном месте.
            </p>
          </div>

          <div
            id="search"
            className="animate-fade-up animation-delay-150 mt-8 scroll-mt-28 md:mt-10"
          >
            <SearchPanel />
          </div>

          <div className="animate-fade-up animation-delay-300 mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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

      {/* Ключевая функция: одна заявка — несколько предложений */}
      <section className="container-page mt-10 md:mt-14">
        <div className="surface-card grid gap-6 p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center md:p-10">
          <div>
            <p className="text-sm font-semibold text-primary">Не хотите искать сами?</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Оставьте одну заявку — несколько проверенных турфирм предложат вам свои варианты
            </h2>
            <p className="mt-3 text-muted-foreground">
              Расскажите, куда и когда хотите поехать. Компании сами пришлют предложения с ценой,
              отелем и условиями — вы сравните и выберете.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/request" search={{}}>
                  Получить предложения от турфирм
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#search">Искать самому</a>
              </Button>
            </div>
          </div>
          <ol className="space-y-3">
            {[
              { icon: Users, text: "Одна заявка — несколько турфирм" },
              { icon: Scale, text: "Сравнение предложений в одной таблице" },
              { icon: ShieldCheck, text: "Только проверенные компании" },
            ].map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-4"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <item.icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{item.text}</span>
              </li>
            ))}
          </ol>
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

      <section className="container-page mt-16 md:mt-24">
        <SectionHead title="Почему TourGo?" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-border/80 bg-card/60 p-6 transition-colors hover:border-primary/25 hover:bg-card"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-base font-semibold">
                {item.emoji} {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead title="Популярные направления" />
        <p className="mt-6 text-sm font-semibold text-success">Доступно сейчас</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ready.map((dest) => (
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
                className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-xl font-semibold text-primary-foreground">
                  {dest.flag} {dest.country}
                </h3>
                <p className="mt-1 text-sm text-primary-foreground/80">{dest.blurb}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm font-semibold text-muted-foreground">Скоро</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {soon.map((dest) => (
            <span
              key={dest.id}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground"
            >
              {dest.flag} {dest.country}
            </span>
          ))}
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/excursions"
            className="surface-card group flex flex-col justify-between gap-5 p-6 transition-colors hover:border-primary/40 md:p-8"
          >
            <div>
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <MapPinned className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">Экскурсии и развлечения</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Сафари в пустыне, прогулка на яхте, Бурдж-Халифа, поездка в Абу-Даби, Ferrari World,
                обзорная по Дубаю и трансфер из аэропорта.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Смотреть экскурсии
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            to="/assistance"
            className="surface-card group flex flex-col justify-between gap-5 p-6 transition-colors hover:border-primary/40 md:p-8"
          >
            <div>
              <span className="grid size-11 place-items-center rounded-2xl bg-ai/10 text-ai">
                <Users className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">Помощь в поездке</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Уже в другой стране и не знаете, к кому обратиться? Опишите, что вам нужно —
                туристические компании предложат варианты.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Оставить заявку
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24">
        <SectionHead title="Как работает TourGo" />
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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
          <div>
            <SectionHead title="Частые вопросы" subtitle="Коротко о том, как всё устроено" />
            <Button variant="outline" className="mt-6" asChild>
              <Link to="/about">Подробнее о TourGo</Link>
            </Button>
          </div>
          <FaqSection />
        </div>
      </section>

      <section className="container-page mt-16 mb-8 md:mt-24">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-border bg-card px-6 py-7 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold">Вы туристическая компания?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Размещайте свои туры и получайте новые заявки от путешественников через TourGo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/company-signup">Добавить свою турфирму</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/for-companies">Узнать подробнее</Link>
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
