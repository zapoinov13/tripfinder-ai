import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2, Gem, Layers, Sparkles, Tag } from "lucide-react";

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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voyago — найдите путешествие, которое подходит именно вам" },
      {
        name: "description",
        content:
          "Маркетплейс туров: сравниваем предложения туроператоров, горящие туры и Premium-цены. Подбор тура с AI.",
      },
      { property: "og:title", content: "Voyago — маркетплейс туров" },
      {
        property: "og:description",
        content: "Сравниваем туры от разных операторов и помогаем найти лучшее предложение.",
      },
    ],
  }),
  component: Index,
});

const benefits = [
  {
    icon: Layers,
    title: "Все операторы в одном месте",
    text: "Сравнивайте предложения разных туристических компаний.",
  },
  {
    icon: Sparkles,
    title: "AI-подбор",
    text: "Просто расскажите, какой отдых хотите — AI найдёт подходящие варианты.",
  },
  {
    icon: Tag,
    title: "Лучшие цены",
    text: "Сравнивайте цены и условия разных предложений.",
  },
  {
    icon: Gem,
    title: "Эксклюзивные предложения",
    text: "Premium-пользователи получают доступ к закрытым предложениям.",
  },
];

const steps = [
  { n: "01", title: "Расскажите, куда хотите поехать" },
  { n: "02", title: "Мы найдём подходящие варианты" },
  { n: "03", title: "Сравните предложения" },
  { n: "04", title: "Выберите лучший тур" },
];

function Index() {
  return (
    <SiteLayout>
      <section className="container-page pt-6 md:pt-8">
        <div className="relative overflow-hidden rounded-4xl">
          <img
            src={heroImage}
            alt="Побережье с бирюзовой водой на закате"
            width={1920}
            height={1080}
            className="h-[420px] w-full object-cover md:h-[540px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/10" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-14">
            <h1 className="max-w-3xl font-display text-3xl font-semibold text-primary-foreground md:text-5xl md:leading-[1.08]">
              Найдите путешествие, которое подходит именно вам
            </h1>
            <p className="mt-4 max-w-xl text-sm text-primary-foreground/85 md:text-lg">
              Сравниваем туры от разных операторов и помогаем найти лучшее предложение.
            </p>
          </div>
        </div>

        <div className="relative z-10 -mt-8 px-0 md:-mt-12 md:px-8">
          <SearchPanel />
        </div>
      </section>

      <section className="container-page mt-20 md:mt-28">
        <SectionHead
          title="Популярные направления"
          subtitle="Идеи для вашего следующего путешествия"
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.slice(0, 6).map((dest) => (
            <Link
              key={dest.id}
              to="/search"
              className="hover-lift group relative overflow-hidden rounded-3xl"
            >
              <img
                src={dest.image}
                alt={dest.country}
                loading="lazy"
                className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-xl font-semibold text-primary-foreground">
                  {dest.flag} {dest.country}
                </h3>
                <p className="mt-1 text-sm text-primary-foreground/80">{dest.blurb}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
                  {dest.tours} туров
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-20 md:mt-28">
        <SectionHead
          title="🔥 Горящие туры"
          subtitle="Лучшие предложения на ближайшие даты"
          action={
            <Button variant="outline" asChild>
              <Link to="/hot">
                Все горящие туры <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hotTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} layout="grid" />
          ))}
        </div>
      </section>

      <section className="container-page mt-20 md:mt-28">
        <div className="gradient-premium overflow-hidden rounded-4xl px-6 py-12 md:px-14 md:py-16">
          <div className="max-w-2xl">
            <span className="rounded-full bg-premium/20 px-3 py-1 text-xs font-semibold text-premium">
              💎 PREMIUM
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold text-primary-foreground md:text-4xl">
              Больше путешествий. Меньше цены.
            </h2>
            <p className="mt-3 text-primary-foreground/75">
              Получайте доступ к эксклюзивным предложениям и закрытым ценам.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {premiumTours.map((tour) => {
              const hotel = getHotel(tour.hotelId);
              return (
                <div key={tour.id} className="overflow-hidden rounded-3xl bg-card">
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="text-xs font-semibold text-premium">💎 PREMIUM</div>
                    <h3 className="mt-2 truncate font-display text-lg font-semibold">
                      {hotel.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {hotel.flag} {hotel.city} · {tour.meal}
                    </p>
                    <div className="mt-4 text-sm text-muted-foreground line-through">
                      {formatPrice(tour.price)}
                    </div>
                    <div className="font-display text-2xl font-semibold">
                      {formatPrice(tour.premiumPrice ?? tour.price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/premium">Открыть Premium</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page mt-20 md:mt-28">
        <SectionHead title="Почему выбирают нас" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item) => (
            <div key={item.title} className="surface-card p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-20 md:mt-28">
        <SectionHead title="Найти путешествие — проще, чем кажется" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.n} className="rounded-3xl border border-dashed border-border p-6">
              <span className="font-display text-3xl font-semibold text-primary/30">{step.n}</span>
              <p className="mt-4 text-base font-medium">{step.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-20 md:mt-28">
        <div className="relative overflow-hidden rounded-4xl">
          <img
            src={heroImage}
            alt="Морской пейзаж"
            loading="lazy"
            className="h-[360px] w-full object-cover"
          />
          <div className="gradient-ai absolute inset-0 opacity-90" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <h2 className="font-display text-3xl font-semibold text-primary-foreground md:text-4xl">
              Не знаете, куда поехать?
            </h2>
            <p className="mt-3 max-w-xl text-primary-foreground/85">
              Расскажите AI о своём идеальном отдыхе — он подберёт направления и туры под ваш
              бюджет.
            </p>
            <Button size="lg" variant="secondary" className="mt-7" asChild>
              <Link to="/search">
                <Sparkles className="size-4" />
                Найти с AI
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page mt-16">
        <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold">Вы туроператор?</h3>
              <p className="text-sm text-muted-foreground">
                Подключите свои туры и получайте новых клиентов.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/for-operators">Подключить компанию</Link>
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
        <h2 className="font-display text-2xl font-semibold md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="hidden md:block">{action}</div> : null}
    </div>
  );
}
