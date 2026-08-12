import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SearchX, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { TourCardSkeleton } from "@/components/tours/tour-card-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AMENITIES, amenityLabels, destinations, formatPrice, mealOptions } from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { searchService } from "@/lib/platform/search-service";
import {
  formatSearchDates,
  guestsSummary,
  PRICE_MAX,
  PRICE_MIN,
  validateSearchParams,
  type SearchParams,
  type SortKey,
} from "@/lib/search";

export const Route = createFileRoute("/search")({
  validateSearch: validateSearchParams,
  head: () => ({
    meta: [
      { title: "Поиск туров — сравните предложения операторов | TourGo" },
      {
        name: "description",
        content:
          "Туры от проверенных операторов: фильтры по цене, питанию, отелю, рейтингу и удобствам.",
      },
      { property: "og:title", content: "Поиск туров — TourGo" },
      { property: "og:description", content: "Сравните туры от разных операторов в одном месте." },
    ],
  }),
  component: SearchPage,
});

const nightBuckets = [
  { value: "1-3", label: "1–3 ночи" },
  { value: "4-7", label: "4–7 ночей" },
  { value: "8-14", label: "8–14 ночей" },
  { value: "14+", label: "14+ ночей" },
];
const offerOptions = [
  { value: "hot", label: "Hot Deal" },
  { value: "premium", label: "Premium" },
  { value: "sponsored", label: "Sponsored" },
];

type Update = (patch: Partial<SearchParams>) => void;

function CheckGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <Separator className="mb-6" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">
        {options.map((option) => {
          const id = `${title}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-3">
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <Label htmlFor={id} className="text-sm font-normal">
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Filters({ params, update }: { params: SearchParams; update: Update }) {
  const [price, setPrice] = useState<[number, number]>([params.priceMin, params.priceMax]);
  useEffect(() => {
    setPrice([params.priceMin, params.priceMax]);
  }, [params.priceMin, params.priceMax]);

  const toggle = (key: keyof SearchParams, value: string | number) => {
    const current = params[key] as Array<string | number>;
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next } as Partial<SearchParams>);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Цена</h3>
        <Slider
          className="mt-4"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={50000}
          value={price}
          onValueChange={(v) => setPrice([v[0] ?? PRICE_MIN, v[1] ?? PRICE_MAX])}
          onValueCommit={(v) =>
            update({ priceMin: v[0] ?? PRICE_MIN, priceMax: v[1] ?? PRICE_MAX })
          }
        />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{formatPrice(price[0])}</span>
          <span>{formatPrice(price[1])}</span>
        </div>
      </div>

      <div>
        <Separator className="mb-6" />
        <h3 className="text-sm font-semibold">Направление</h3>
        <Select
          value={params.destination || "all"}
          onValueChange={(v) => update({ destination: v === "all" ? "" : v, city: "" })}
        >
          <SelectTrigger className="mt-3 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все направления</SelectItem>
            {destinations.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.flag} {d.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CheckGroup
        title="Длительность"
        options={nightBuckets}
        selected={params.nights}
        onToggle={(v) => toggle("nights", v)}
      />
      <CheckGroup
        title="Отель"
        options={[5, 4, 3].map((s) => ({ value: String(s), label: `${s}★` }))}
        selected={params.stars.map(String)}
        onToggle={(v) => toggle("stars", Number(v))}
      />
      <CheckGroup
        title="Питание"
        options={mealOptions.map((m) => ({ value: m.code, label: `${m.code} · ${m.label}` }))}
        selected={params.meals}
        onToggle={(v) => toggle("meals", v)}
      />
      <CheckGroup
        title="Удобства"
        options={AMENITIES.map((a) => ({ value: a, label: amenityLabels[a] ?? a }))}
        selected={params.amenities}
        onToggle={(v) => toggle("amenities", v)}
      />

      <div>
        <Separator className="mb-6" />
        <h3 className="text-sm font-semibold">Рейтинг</h3>
        <div className="mt-3 space-y-3">
          {[
            { value: 9, label: "9+ Превосходно" },
            { value: 8, label: "8+ Очень хорошо" },
          ].map((r) => (
            <div key={r.value} className="flex items-center gap-3">
              <Checkbox
                id={`rating-${r.value}`}
                checked={params.rating === r.value}
                onCheckedChange={() => update({ rating: params.rating === r.value ? 0 : r.value })}
              />
              <Label htmlFor={`rating-${r.value}`} className="text-sm font-normal">
                {r.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <CheckGroup
        title="Тип предложения"
        options={offerOptions}
        selected={params.offers}
        onToggle={(v) => toggle("offers", v)}
      />

      <div>
        <Separator className="mb-6" />
        <div className="flex items-center gap-3">
          <Checkbox
            id="flexible-dates"
            checked={params.flexibleDates !== false}
            onCheckedChange={(v) => update({ flexibleDates: v === true })}
          />
          <Label htmlFor="flexible-dates" className="text-sm font-normal">
            Гибкие даты (±7 дней)
          </Label>
        </div>
      </div>
    </div>
  );
}

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refinement, setRefinement] = useState("");

  const update: Update = (patch) => {
    navigate({ search: ((prev: SearchParams) => ({ ...prev, ...patch })) as never });
  };

  const results = useMemo(
    () => searchService.search(params as Record<string, unknown>, user?.id),
    [params, user?.id],
  );
  const cheapest = useMemo(
    () =>
      results.reduce<number | null>(
        (min, t) => (min === null || t.price < min ? t.price : min),
        null,
      ),
    [results],
  );

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [params]);

  const routeLabel = `${params.from || "Любой город"} → ${
    params.city ||
    (params.destination ? destinations.find((d) => d.id === params.destination)?.country : "") ||
    "Все направления"
  }`;

  const chips = [
    formatSearchDates(params.dateStart, params.dateEnd),
    guestsSummary(params.adults, params.children),
    params.meals.length ? `Питание: ${params.meals.join(", ")}` : null,
    `${formatPrice(params.priceMin)} – ${formatPrice(params.priceMax)}`,
  ].filter(Boolean) as string[];

  const reset = () =>
    navigate({
      search: {
        from: params.from,
        destination: params.destination,
        adults: params.adults,
        children: params.children,
      } as never,
    });

  const applyRefinement = () => {
    const text = refinement.toLowerCase();
    const patch: Partial<SearchParams> = {};
    if (/дешев/.test(text))
      patch.priceMax = Math.max(PRICE_MIN, Math.round(params.priceMax * 0.85));
    if (/5\s*зв|пять зв/.test(text)) patch.stars = [5];
    if (/рейтинг|отзыв/.test(text)) patch.sort = "rating";
    if (/премиум|premium/.test(text))
      patch.offers = Array.from(new Set([...params.offers, "premium"]));
    if (/горящ/.test(text)) patch.offers = Array.from(new Set([...params.offers, "hot"]));
    if (/центр|инфраструкт/.test(text))
      patch.amenities = Array.from(new Set([...params.amenities, "Wi-Fi"]));
    if (/2\s*(?:дня|дней|ночи|ночей)\s*(?:дольше|больше)/.test(text)) patch.nights = ["8-14"];
    if (Object.keys(patch).length > 0) update(patch);
    setRefinement("");
  };

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold md:text-3xl">
              {routeLabel}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal className="size-4" />
                Фильтры
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-display">Фильтры</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">
                <Filters params={params} update={update} />
                <Button className="mt-6 w-full" onClick={reset} variant="outline">
                  Сбросить фильтры
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="surface-card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">Фильтры</h2>
                <Button variant="ghost" size="sm" onClick={reset}>
                  Сбросить
                </Button>
              </div>
              <div className="mt-6">
                <Filters params={params} update={update} />
              </div>
            </div>
          </aside>

          <div>
            <div className="gradient-ai mb-5 rounded-3xl p-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-primary-foreground">
                    <Sparkles className="size-5" />
                    Уточнить AI-поиск
                  </h2>
                  <Textarea
                    value={refinement}
                    onChange={(e) => setRefinement(e.target.value)}
                    placeholder="Например: покажи дешевле, только 5 звёзд, ближе к центру или с лучшими отзывами"
                    className="mt-3 min-h-20 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/65"
                  />
                </div>
                <Button variant="secondary" onClick={applyRefinement} disabled={!refinement.trim()}>
                  Применить
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <p className="truncate text-sm font-medium text-muted-foreground">
                Найдено {results.length} туров
              </p>
              <Select value={params.sort} onValueChange={(v) => update({ sort: v as SortKey })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Рекомендуемые</SelectItem>
                  <SelectItem value="price-asc">Цена: сначала дешёвые</SelectItem>
                  <SelectItem value="price-desc">Цена: сначала дорогие</SelectItem>
                  <SelectItem value="match">Лучшее совпадение</SelectItem>
                  <SelectItem value="rating">Рейтинг</SelectItem>
                  <SelectItem value="popular">Популярные</SelectItem>
                  <SelectItem value="new">Новые</SelectItem>
                  <SelectItem value="premium">Premium Deals</SelectItem>
                  <SelectItem value="hot">Горящие</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="mt-5 space-y-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <TourCardSkeleton key={i} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="surface-card mt-5 p-10 text-center">
                <SearchX className="mx-auto size-10 text-muted-foreground" />
                <h2 className="mt-4 font-display text-xl font-semibold">
                  По вашему запросу ничего не найдено
                </h2>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li>Попробуйте увеличить бюджет</li>
                  <li>Измените даты</li>
                  <li>Выберите другое направление</li>
                </ul>
                <Button className="mt-6" onClick={reset}>
                  Сбросить фильтры
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {results.map((tour) => (
                  <TourCard key={tour.id} tour={tour} bestPrice={tour.price === cheapest} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
