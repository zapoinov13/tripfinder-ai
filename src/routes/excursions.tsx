import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Search,
  Ship,
  Sparkles,
  Star,
  Ticket,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PhotoCount } from "@/components/media/photo-gallery";
import {
  MediaCardCaption,
  mediaBodyClass,
  mediaMetaClass,
  mediaTitleClass,
} from "@/components/media/media-card-overlay";
import { SafeImage } from "@/components/media/safe-image";
import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { destinations, formatPrice } from "@/data/demo";
import {
  categoryHints,
  excursionCategories,
  filterExcursions,
  getCityExcursions,
  getExcursionCities,
  getExcursionCountries,
  getExcursionStats,
  getFeaturedExcursions,
  sortExcursions,
  excursions,
  type Excursion,
  type ExcursionCategory,
  type ExcursionSort,
} from "@/data/excursions";
import { placeFromQuery } from "@/lib/scenario-router";
import { cn } from "@/lib/utils";

type Search = { destination?: string; city?: string; q?: string };

export const Route = createFileRoute("/excursions")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search["destination"] === "string" && search["destination"]
      ? { destination: search["destination"] }
      : {}),
    ...(typeof search["city"] === "string" && search["city"] ? { city: search["city"] } : {}),
    ...(typeof search["q"] === "string" && search["q"] ? { q: search["q"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Экскурсии и развлечения · TourGo" },
      {
        name: "description",
        content:
          "Сафари, яхты, обзорные туры, парки и трансферы. Сравните цены компаний в одном месте.",
      },
    ],
  }),
  component: ExcursionsPage,
});

const categoryIcon: Record<ExcursionCategory, typeof Compass> = {
  Экскурсии: Compass,
  Развлечения: Sparkles,
  Море: Ship,
  Трансферы: Car,
};

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
    <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm">
      {items.map((item, i) => (
        <li key={item.n} className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-full text-xs font-semibold",
              step === item.n
                ? "bg-primary text-primary-foreground shadow-sm"
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
  const stats = getExcursionStats();
  const featured = getFeaturedExcursions(6);

  const [category, setCategory] = useState<ExcursionCategory | "Все">("Все");
  const [query, setQuery] = useState(search.q ?? "");
  const [sort, setSort] = useState<ExcursionSort>("recommended");
  const [selected, setSelected] = useState<Excursion | null>(null);

  useEffect(() => {
    setQuery(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    if (destination || !search.q) return;
    const place = placeFromQuery(search.q);
    if (!place.destination) return;
    void navigate({
      search: {
        destination: place.destination,
        ...(place.city ? { city: place.city } : {}),
        q: search.q,
      },
    });
  }, [destination, search.q, navigate]);

  const countries = getExcursionCountries();
  const dest = destinations.find((d) => d.id === destination);
  const cities = destination ? getExcursionCities(destination) : [];
  const cityOk = Boolean(city && cities.some((c) => c.city === city));
  const list = cityOk ? getCityExcursions(destination, city) : [];

  const queryHits = useMemo(
    () => (query ? sortExcursions(filterExcursions(excursions, query, category), sort) : []),
    [query, category, sort],
  );
  const visible = useMemo(
    () => sortExcursions(filterExcursions(list, query, category), sort),
    [list, query, category, sort],
  );

  const go = (patch: Partial<Search>) => {
    setCategory("Все");
    setSort("recommended");
    void navigate({
      search: {
        ...(patch.destination ? { destination: patch.destination } : {}),
        ...(patch.city ? { city: patch.city } : {}),
        ...(query ? { q: query } : {}),
      },
    });
  };

  const step: 1 | 2 | 3 = !dest ? 1 : cityOk ? 3 : 2;

  return (
    <SiteLayout>
      <div className="relative overflow-hidden border-b border-border/70 bg-secondary/25">
        <SafeImage
          src={dest?.image ?? featured[0]?.image ?? countries[0]?.image ?? ""}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70" />
        <div className="container-page relative py-8 md:py-10">
          <p className="text-sm font-medium text-primary">Экскурсии</p>
          <h1 className="mt-1 max-w-3xl font-display text-3xl font-semibold md:text-4xl">
            {step === 1
              ? "Где вы находитесь?"
              : step === 2
                ? `Города в ${dest?.country}`
                : `${city}, ${dest?.country}`}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-foreground/70">
            {step === 1
              ? "Определите местоположение или выберите страну. Потом — что хотите сделать."
              : step === 2
                ? "Где именно вы отдыхаете? Программы привязаны к городу."
                : `${countLabel(list.length)} в этом городе. Откройте карточку или оставьте заявку.`}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <StatPill label="Стран" value={String(stats.countries)} />
            <StatPill label="Городов" value={String(stats.cities)} />
            <StatPill label="Программ" value={String(stats.programs)} />
            <StatPill label="От" value={formatPrice(stats.minPrice)} />
          </div>

          {step === 1 ? (
            <div className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(() => {
                    go({ destination: "uae", city: "Дубай" });
                  });
                }}
              >
                <MapPin className="size-4" />
                Использовать моё местоположение
              </Button>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="text-sm font-semibold">Что хотите сделать?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "🏜 Сафари", q: "сафари" },
                { label: "🛥 Яхты", q: "яхт" },
                { label: "🏙 Обзорные экскурсии", q: "обзор" },
                { label: "🎢 Парки развлечений", q: "парк" },
                { label: "🎟 Билеты", q: "билет" },
                { label: "🌊 Водные развлечения", q: "яхт" },
                { label: "🚌 Поездки в другой город", q: "город" },
                { label: "🚁 Необычные развлечения", q: "сафари" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setQuery(item.q)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold",
                    query === item.q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

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
                  className={cn(
                    "font-medium",
                    cityOk ? "text-muted-foreground hover:text-foreground" : "text-foreground",
                  )}
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
          <>
            {queryHits.length ? (
              <section className="mb-10">
                <h2 className="font-display text-xl font-semibold">Под ваш запрос</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {queryHits.slice(0, 6).map((e) => (
                    <FeaturedCard key={e.id} excursion={e} onOpen={() => setSelected(e)} />
                  ))}
                </div>
              </section>
            ) : null}
            <section className="mb-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Популярное сейчас</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Часто выбирают туристы из Казахстана и СНГ
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((e) => (
                  <FeaturedCard key={e.id} excursion={e} onOpen={() => setSelected(e)} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">Выберите страну</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.countries} направлений · {stats.programs} программ
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {countries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go({ destination: item.id, city: "" })}
                    className="hover-lift group relative overflow-hidden rounded-3xl text-left"
                  >
                    <SafeImage
                      src={item.image}
                      alt={item.country}
                      className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 media-scrim-strong" />
                    <MediaCardCaption>
                      <h3 className={mediaTitleClass("md")}>
                        {item.flag} {item.country}
                      </h3>
                      <p className={mediaBodyClass()}>{item.blurb}</p>
                      <p className={mediaMetaClass()}>{countLabel(item.count)}</p>
                    </MediaCardCaption>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(excursionCategories as ExcursionCategory[]).map((cat) => {
                const Icon = categoryIcon[cat];
                const hint = categoryHints[cat];
                return (
                  <div
                    key={cat}
                    className="rounded-2xl border border-border bg-card p-4 shadow-card"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Icon className="size-4 text-primary" />
                      {cat}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">{hint.blurb}</p>
                  </div>
                );
              })}
            </section>
          </>
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
                  <SafeImage
                    src={item.image}
                    alt={item.city}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 media-scrim-strong" />
                  <p className={cn(mediaTitleClass("sm"), "absolute bottom-3 left-4 right-4 z-[1]")}>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск: сафари, яхта, музей…"
                  className="pl-9"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Очистить"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setQuery("")}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "recommended", label: "Рекомендуем" },
                    { value: "price-asc", label: "Дешевле" },
                    { value: "price-desc", label: "Дороже" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSort(opt.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      sort === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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
                  {c === "Все" ? c : `${categoryHints[c].emoji} ${c}`}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="surface-card mt-8 p-10 text-center">
                <h2 className="font-display text-xl font-semibold">Ничего не нашли</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Смените категорию или оставьте заявку, компании подберут вариант под ваши даты.
                </p>
                <Button className="mt-4" asChild>
                  <Link
                    to="/request"
                    search={{
                      kind: "assistance" as const,
                      ...(dest?.id ? { destination: dest.id } : {}),
                      city,
                      ...(query ? { wish: query } : {}),
                    }}
                  >
                    Оставить заявку
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((e) => (
                  <ExcursionCard key={e.id} excursion={e} onOpen={() => setSelected(e)} />
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
              Опишите, что хотите. Турфирмы в городе предложат варианты и цены под ваш состав и
              даты.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link
              to="/request"
              search={{
                kind: "assistance",
                ...(dest ? { destination: dest.id } : {}),
                ...(cityOk ? { city } : {}),
              }}
            >
              Оставить заявку
            </Link>
          </Button>
        </div>
      </div>

      <ExcursionSheet excursion={selected} onClose={() => setSelected(null)} />
    </SiteLayout>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm backdrop-blur-sm">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function FeaturedCard({
  excursion: e,
  onOpen,
}: {
  excursion: Excursion;
  onOpen: () => void;
}) {
  const dest = destinations.find((d) => d.id === e.destinationId);
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button type="button" onClick={onOpen} className="relative block w-full text-left">
        <SafeImage
          src={e.image}
          alt={e.title}
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <PhotoCount count={e.photos.length} />
        </div>
        <Badge className="absolute right-3 top-3 border-0 bg-card/90 text-foreground backdrop-blur-sm">
          {e.category}
        </Badge>
      </button>
      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          {dest?.flag} {e.city}
        </p>
        <h3 className="mt-1 font-display font-semibold leading-snug">{e.title}</h3>
        <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {e.duration}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-premium text-premium" />
            4.8
          </span>
        </p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="font-display text-lg font-semibold">{formatPrice(e.price)}</p>
          <Button size="sm" variant="outline" onClick={onOpen}>
            Подробнее
          </Button>
        </div>
      </div>
    </article>
  );
}

function ExcursionCard({
  excursion: e,
  onOpen,
}: {
  excursion: Excursion;
  onOpen: () => void;
}) {
  const Icon = categoryIcon[e.category];
  return (
    <article className="surface-card group overflow-hidden">
      <button type="button" onClick={onOpen} className="relative block w-full text-left">
        <SafeImage
          src={e.image}
          alt={e.title}
          className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 media-scrim p-4 pt-16">
          <Badge className="border-0 bg-primary/95 text-primary-foreground shadow-sm">
            <Icon className="mr-1 size-3" />
            {e.category}
          </Badge>
        </div>
        {e.photos.length > 1 ? (
          <div className="absolute left-3 top-3">
            <PhotoCount count={e.photos.length} />
          </div>
        ) : null}
      </button>
      <div className="p-5">
        <h2 className="font-display text-lg font-semibold leading-snug">{e.title}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {e.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {e.duration}
          </span>
        </p>
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.summary}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {e.includes.slice(0, 3).map((inc) => (
            <li
              key={inc}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {inc}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="font-display text-xl font-semibold">{formatPrice(e.price)}</p>
            <p className="text-xs text-muted-foreground">{e.company}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="sm" variant="outline" onClick={onOpen}>
              Подробнее
            </Button>
            <Button size="sm" asChild>
              <Link
                to="/request"
                search={{
                  kind: "assistance",
                  destination: e.destinationId,
                  city: e.city,
                  wish: `Экскурсия: ${e.title}`,
                }}
              >
                Заявка
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ExcursionSheet({
  excursion: e,
  onClose,
}: {
  excursion: Excursion | null;
  onClose: () => void;
}) {
  if (!e) return null;
  const dest = destinations.find((d) => d.id === e.destinationId);
  const Icon = categoryIcon[e.category];

  return (
    <Sheet open={Boolean(e)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-xl leading-snug">{e.title}</SheetTitle>
          <SheetDescription>
            {dest?.flag} {e.city}, {dest?.country} · {e.duration}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-1.5 overflow-hidden rounded-2xl">
            <SafeImage
              src={e.image}
              alt={e.title}
              className="col-span-4 aspect-[16/10] w-full object-cover"
            />
            {e.photos.slice(1, 5).map((img, i) => (
              <SafeImage
                key={`${e.id}-${i}`}
                src={img}
                alt=""
                className="aspect-square w-full object-cover"
              />
            ))}
          </div>

          <Badge variant="secondary" className="gap-1">
            <Icon className="size-3.5" />
            {e.category}
          </Badge>

          <p className="text-sm leading-relaxed text-muted-foreground">{e.summary}</p>

          <div>
            <p className="text-sm font-semibold">Что входит</p>
            <ul className="mt-2 space-y-2">
              {e.includes.map((inc) => (
                <li key={inc} className="flex items-start gap-2 text-sm">
                  <Ticket className="mt-0.5 size-4 shrink-0 text-primary" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">Организатор</p>
            <p className="mt-1 font-medium">{e.company}</p>
            <p className="mt-3 font-display text-2xl font-semibold">{formatPrice(e.price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Цена за программу. Точную стоимость под ваш состав уточнит компания.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button size="lg" asChild>
              <Link
                to="/request"
                search={{
                  kind: "assistance",
                  destination: e.destinationId,
                  city: e.city,
                  wish: `Экскурсия: ${e.title}. ${e.summary}`,
                }}
                onClick={onClose}
              >
                Получить предложения
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                to="/excursions"
                search={{ destination: e.destinationId, city: e.city, q: e.title }}
                onClick={onClose}
              >
                Другие программы в этом городе
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
