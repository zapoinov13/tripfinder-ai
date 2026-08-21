import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Clock, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { destinations, formatPrice } from "@/data/demo";
import {
  excursionCategories,
  getCityExcursions,
  getExcursionCities,
  getExcursionCountries,
  type ExcursionCategory,
} from "@/data/excursions";
import { cn } from "@/lib/utils";

type Search = { destination?: string; city?: string };

export const Route = createFileRoute("/excursions")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" && search["destination"]
      ? { destination: search["destination"] }
      : {}),
    ...(typeof search["city"] === "string" && search["city"] ? { city: search["city"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Экскурсии и развлечения · TourGo" },
      {
        name: "description",
        content:
          "Сафари, яхты, обзорные туры, парки и билеты. Сравните цены компаний в одном месте.",
      },
    ],
  }),
  component: ExcursionsPage,
});

function countLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} программа`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} программы`;
  return `${n} программ`;
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = [
    { n: 1, label: "Страна" },
    { n: 2, label: "Город" },
    { n: 3, label: "Программы" },
  ] as const;
  return (
    <ol className="mt-5 flex flex-wrap items-center gap-2 text-sm">
      {items.map((item, i) => (
        <li key={item.n} className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-7 place-items-center rounded-full text-xs font-semibold",
              step === item.n
                ? "bg-primary text-primary-foreground"
                : step > item.n
                  ? "bg-success/15 text-success"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {item.n}
          </span>
          <span className={step === item.n ? "font-semibold" : "text-muted-foreground"}>
            {item.label}
          </span>
          {i < items.length - 1 ? (
            <ChevronRight className="size-4 text-muted-foreground" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function ExcursionsPage() {
  const search = Route.useSearch();
  const destination = search.destination ?? "";
  const city = search.city ?? "";
  const navigate = useNavigate({ from: "/excursions" });
  const [category, setCategory] = useState<ExcursionCategory | "Все">("Все");

  const countries = getExcursionCountries();
  const dest = destinations.find((d) => d.id === destination);
  const cities = destination ? getExcursionCities(destination) : [];
  const cityOk = Boolean(city && cities.some((c) => c.city === city));
  const list = cityOk ? getCityExcursions(destination, city) : [];
  const visible = list.filter((e) => category === "Все" || e.category === category);

  const go = (patch: Partial<Search>) => {
    setCategory("Все");
    void navigate({
      search: {
        ...(patch.destination ? { destination: patch.destination } : {}),
        ...(patch.city ? { city: patch.city } : {}),
      },
    });
  };

  const step: 1 | 2 | 3 = !dest ? 1 : cityOk ? 3 : 2;

  return (
    <SiteLayout>
      <div className="border-b border-border/70 bg-secondary/25">
        <div className="container-page py-6 md:py-8">
          <p className="text-sm font-medium text-primary">Экскурсии</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
            {step === 1
              ? "Что посмотреть и чем заняться"
              : step === 2
                ? `Город в стране ${dest?.country}`
                : `${city}, ${dest?.country}`}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            {step === 1
              ? "Сафари, яхты, обзор города, парки и билеты. Выберите страну."
              : step === 2
                ? "Выберите город, чтобы увидеть экскурсии и цены именно там."
                : "Что можно заказать в этом городе. Сравните цены и напишите компании."}
          </p>
          <Stepper step={step} />
        </div>
      </div>

      <div className="container-page py-8">
        {step > 1 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => go({ destination: "", city: "" })}
              className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Все страны
            </button>
            {dest ? (
              <>
                <ChevronRight className="size-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => go({ destination: dest.id, city: "" })}
                  className={cn("font-medium", cityOk ? "text-muted-foreground hover:text-foreground" : "text-foreground")}
                >
                  {dest.flag} {dest.country}
                </button>
              </>
            ) : null}
            {cityOk ? (
              <>
                <ChevronRight className="size-4 text-muted-foreground" />
                <span className="font-semibold">{city}</span>
              </>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go({ destination: item.id, city: "" })}
                className="hover-lift group relative overflow-hidden rounded-3xl text-left"
              >
                <img
                  src={item.image}
                  alt={item.country}
                  loading="lazy"
                  className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h2 className="font-display text-xl font-semibold text-primary-foreground">
                    {item.flag} {item.country}
                  </h2>
                  <p className="mt-1 text-sm text-primary-foreground/80">{item.blurb}</p>
                  <p className="mt-3 text-xs font-semibold text-primary-foreground/75">
                    {countLabel(item.count)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 && dest ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((item) => (
              <button
                key={item.city}
                type="button"
                onClick={() => go({ destination: dest.id, city: item.city })}
                className="hover-lift group overflow-hidden rounded-3xl border border-border bg-card text-left shadow-card"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.city}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                  <p className="absolute bottom-3 left-4 font-display text-lg font-semibold text-primary-foreground">
                    {item.city}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {item.blurb || `Программы в городе ${item.city}`}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">{countLabel(item.count)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {(["Все", ...excursionCategories] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="surface-card mt-8 p-10 text-center">
                <h2 className="font-display text-xl font-semibold">В этой категории пока пусто</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Выберите другую категорию или оставьте заявку, компании подберут вариант.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((e) => (
                  <article key={e.id} className="surface-card overflow-hidden">
                    <div className="relative">
                      <img src={e.image} alt={e.title} className="h-56 w-full object-cover" loading="lazy" />
                      {e.photos?.length > 1 ? (
                        <div className="absolute inset-x-3 bottom-3 flex gap-1.5">
                          {e.photos.slice(1, 4).map((img, i) => (
                            <img
                              key={`${e.id}-${i}`}
                              src={img}
                              alt=""
                              className="h-12 w-16 rounded-lg object-cover ring-1 ring-primary-foreground/50"
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="p-5">
                      <Badge className="bg-secondary text-muted-foreground">{e.category}</Badge>
                      <h2 className="mt-2 font-display text-lg font-semibold">{e.title}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {e.city}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {e.duration}
                        </span>
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">{e.summary}</p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {e.includes.slice(0, 3).map((inc) => (
                          <li key={inc}>· {inc}</li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="font-display text-xl font-semibold">{formatPrice(e.price)}</p>
                          <p className="text-xs text-muted-foreground">от {e.company}</p>
                        </div>
                        <Button size="sm" asChild>
                          <Link
                            to="/request"
                            search={{ kind: "assistance", destination: e.destinationId }}
                          >
                            Оставить заявку
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}

        <div className="surface-card mt-10 flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Sparkles className="size-5 text-ai" />
              Нужно что-то своё?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Опишите, что хотите. Туристические компании предложат варианты и цены под ваш состав и
              даты.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link
              to="/request"
              search={{
                kind: "assistance",
                ...(dest ? { destination: dest.id } : {}),
              }}
            >
              Оставить заявку
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
