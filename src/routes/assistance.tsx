import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Car,
  ChevronRight,
  Clock,
  LifeBuoy,
  MapPin,
  MessageSquare,
  Plane,
  ShieldCheck,
  Ship,
  Sparkles,
  Sun,
  Ticket,
  Users,
} from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { VitrineHeader } from "@/components/site/vitrine-filters";
import { Button } from "@/components/ui/button";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { destinations, formatPrice, resortsByDestination } from "@/data/demo";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

type Search = { destination?: string; city?: string; wish?: string };

export const Route = createFileRoute("/assistance")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" && search["destination"]
      ? { destination: search["destination"] }
      : {}),
    ...(typeof search["city"] === "string" && search["city"] ? { city: search["city"] } : {}),
    ...(typeof search["wish"] === "string" && search["wish"] ? { wish: search["wish"] } : {}),
  }),
  head: () =>
    seo({
      title: "Помощь в поездке: водитель, гид, бронь",
      description:
        "Опишите задачу своими словами: водитель, гид, бронь столика, фотограф. Компании пришлют предложения с ценой.",
      path: "/assistance",
    }),
  component: AssistancePage,
});

const needs = [
  {
    id: "car",
    icon: Car,
    title: "Машина и водитель",
    text: "На день или на несколько часов. Можно с русским языком.",
    wish: (place: string) =>
      `Мы сейчас здесь: ${place}. Нужна машина с русскоговорящим водителем на день.`,
  },
  {
    id: "transfer",
    icon: Plane,
    title: "Трансфер в аэропорт",
    text: "Встреча, багаж, детское кресло по запросу.",
    wish: (place: string) =>
      `Мы сейчас здесь: ${place}. Нужен трансфер в аэропорт. Нас двое взрослых, с багажом.`,
  },
  {
    id: "guide",
    icon: MessageSquare,
    title: "Гид на русском",
    text: "Обзорная, семейная или под ваши интересы.",
    wish: (place: string) => `Мы сейчас здесь: ${place}. Нужен русскоговорящий гид на полдня.`,
  },
  {
    id: "tour",
    icon: Sun,
    title: "Экскурсия на завтра",
    text: "Готовая программа на ближайшие дни.",
    wish: (place: string) =>
      `Мы сейчас здесь: ${place}. Завтра хотим экскурсию. Нас двое взрослых.`,
  },
  {
    id: "sea",
    icon: Ship,
    title: "Море, яхта или катер",
    text: "Прогулка, купание, закат, аренда на компанию.",
    wish: (place: string) =>
      `Мы сейчас здесь: ${place}. Хотим прогулку на яхте или катере на вечер, до 6 человек.`,
  },
  {
    id: "tickets",
    icon: Ticket,
    title: "Билеты в парк или на шоу",
    text: "Аквапарк, аттракционы, вечерняя программа.",
    wish: (place: string) =>
      `Мы сейчас здесь: ${place}. Нужны билеты в парк или на шоу на завтра, семья из четырёх человек.`,
  },
];

const steps = [
  {
    title: "Где вы и что нужно",
    text: "Страна, город и задача. Можно написать своими словами или голосом.",
  },
  {
    title: "Компании отвечают",
    text: "Заявку видят проверенные турфирмы, которые работают в этой стране.",
  },
  {
    title: "Сравниваете цены",
    text: "Несколько предложений в одном окне. Смотрите состав, время и сумму.",
  },
  { title: "Выбираете сами", text: "Пишете компании напрямую. TourGo не берёт оплату за поездку." },
];

const offers = [
  { company: "Dubai Travel", price: 180000, note: "Мечеть + Ferrari World, 10 часов" },
  { company: "Family Travel", price: 195000, note: "Тот же маршрут, детские кресла" },
  { company: "Marina Boats", price: 220000, note: "Приватный минивэн и гид" },
];

function AssistancePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/assistance" });
  const destinationId = search.destination ?? "";
  const city = search.city ?? "";
  const dest = destinations.find((d) => d.id === destinationId);
  const cities = dest ? (resortsByDestination[dest.id] ?? []) : [];
  const cityOk = Boolean(city && cities.some((c) => c.name === city));
  const place = cityOk ? city : (dest?.city ?? dest?.country ?? "");
  const [hint, setHint] = useState(false);
  const [wish, setWish] = useState(search.wish ?? "");

  const go = (patch: Search) => {
    setHint(false);
    void navigate({
      search: {
        ...(patch.destination ? { destination: patch.destination } : {}),
        ...(patch.city ? { city: patch.city } : {}),
      },
    });
  };

  const requestSearch = (wish?: string) => ({
    kind: "assistance" as const,
    ...(dest ? { destination: dest.id } : {}),
    ...(cityOk ? { city } : {}),
    ...(wish ? { wish } : {}),
  });

  const onNeed = (wish: string) => {
    if (!dest) {
      setHint(true);
      document.getElementById("where")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    void navigate({ to: "/request", search: requestSearch(wish) });
  };

  return (
    <SiteLayout>
      {/* Раздел открывается так же, как остальные витрины: обложка во весь
          экран заставляла заново понимать, куда человек попал. */}
      <section className="container-page pt-8 md:pt-12">
        <VitrineHeader
          section="Помощь в поездке"
          title="Что вам нужно?"
          subtitle="Опишите задачу словами или голосом. Водитель, гид, бронь, фотограф — компании пришлют предложения."
        />
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button size="lg" asChild>
            <Link to="/request" search={requestSearch()}>
              Оставить заявку
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/excursions" search={dest ? { destination: dest.id } : {}}>
              Смотреть экскурсии
            </Link>
          </Button>
        </div>
      </section>

      <div className="mt-6 border-y border-border/70 bg-card">
        <div className="container-page grid gap-3 py-4 sm:grid-cols-3">
          {[
            { icon: Clock, text: "Заявка уходит компаниям сразу" },
            { icon: ShieldCheck, text: "Только проверенные турфирмы" },
            { icon: Users, text: "Несколько цен на одну задачу" },
          ].map((item) => (
            <p key={item.text} className="flex items-center gap-2.5 text-sm">
              <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <item.icon className="size-4" />
              </span>
              {item.text}
            </p>
          ))}
        </div>
      </div>

      <div className="container-page py-10 md:py-14">
        <div className="surface-card p-5 md:p-6">
          <h2 className="font-display text-2xl font-semibold">Опишите задачу своими словами</h2>
          <p className="mt-2 text-base leading-relaxed text-foreground/70">
            Например: «Нужен русскоговорящий водитель завтра на весь день».
          </p>
          <div className="mt-4">
            <VoiceTextarea
              value={wish}
              onChange={setWish}
              placeholder="Нужен русскоговорящий водитель завтра на весь день."
            />
          </div>
          <Button
            className="mt-4"
            size="lg"
            onClick={() => onNeed(wish.trim() || "Нужна помощь в поездке")}
          >
            Получить предложения
          </Button>
        </div>

        <div id="where" className="mt-10 scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Шаг 1</p>
              <h2 className="mt-1 font-display text-2xl font-semibold md:text-3xl">
                Где вы сейчас?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Компании увидят страну и город и предложат то, что реально сделать на месте.
              </p>
            </div>
            {dest ? (
              <button
                type="button"
                onClick={() => go({})}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Сменить страну
              </button>
            ) : null}
          </div>

          {hint && !dest ? (
            <p className="mt-4 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium">
              Сначала выберите страну, затем задачу.
            </p>
          ) : null}

          <div className="-mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
            {destinations.map((item) => {
              const on = dest?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(on ? {} : { destination: item.id })}
                  className={cn(
                    "flex min-w-[11rem] shrink-0 overflow-hidden rounded-2xl border text-left transition-colors md:min-w-0",
                    on
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <img src={item.image} alt="" className="h-20 w-16 object-cover" />
                  <span className="flex flex-col justify-center px-3 py-2">
                    <span className="text-sm font-semibold">
                      {item.flag} {item.country}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.city}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {dest && cities.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-medium">Город</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {cities.map((item) => {
                  const on = city === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() =>
                        go(
                          on ? { destination: dest.id } : { destination: dest.id, city: item.name },
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-12">
          <p className="text-sm font-medium text-primary">Шаг 2</p>
          <h2 className="mt-1 font-display text-2xl font-semibold md:text-3xl">
            Что нужно сделать?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Нажмите карточку. Текст заявки подставится сам, его можно поправить и надиктовать.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {needs.map((need) => (
              <button
                key={need.id}
                type="button"
                onClick={() => onNeed(need.wish(place || "поездке"))}
                className="hover-lift surface-card group flex flex-col items-start p-5 text-left"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <need.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{need.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{need.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Оставить заявку
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="gradient-ai mt-6 rounded-[1.75rem] p-6 text-primary-foreground md:flex md:items-center md:justify-between md:gap-6 md:p-8">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Sparkles className="size-5" />
              Своя задача
            </h2>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
              Напишите или надиктуйте: сколько вас, когда и что хотите. Компании предложат свои
              варианты.
            </p>
          </div>
          <Button size="lg" variant="secondary" className="mt-4 shrink-0 md:mt-0" asChild>
            <Link to="/request" search={requestSearch()}>
              Описать своими словами
            </Link>
          </Button>
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">Как это работает</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-3xl bg-secondary/50 p-5">
                <span className="font-display text-3xl font-semibold text-primary/35">{i + 1}</span>
                <h3 className="mt-3 font-display text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface-card mt-12 overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="p-6 md:p-8">
              <p className="text-sm font-medium text-primary">Пример</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Одна заявка, три цены</h2>
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-secondary/70 p-4 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                «Мы сейчас в Дубае. Нас пять человек. Завтра хотим мечеть в Абу-Даби и Ferrari
                World. Нужна машина с русскоговорящим водителем.»
              </p>
              <div className="mt-5 grid gap-3">
                {offers.map((o, i) => (
                  <div
                    key={o.company}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3",
                      i === 0 ? "border-success/40 bg-success/5" : "border-border",
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold">{o.company}</p>
                      <p className="text-xs text-muted-foreground">{o.note}</p>
                    </div>
                    <p className="font-display text-lg font-semibold">{formatPrice(o.price)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Вы сравниваете и выбираете. Оплата идёт выбранной компании, не TourGo.
              </p>
            </div>
            <div className="border-t border-border bg-secondary/40 p-6 md:p-8 lg:border-l lg:border-t-0">
              <h3 className="font-display text-lg font-semibold">Коротко по делу</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  Телефон видят только компании, которым вы отправили заявку.
                </li>
                <li className="flex gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                  Подходит, если нужно на сегодня, завтра или через пару дней.
                </li>
                <li className="flex gap-2">
                  <LifeBuoy className="mt-0.5 size-4 shrink-0 text-ai" />
                  Если не знаете, что выбрать, опишите задачу своими словами.
                </li>
              </ul>
              <Button className="mt-6 w-full" size="lg" asChild>
                <Link to="/request" search={requestSearch()}>
                  Оставить заявку
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
