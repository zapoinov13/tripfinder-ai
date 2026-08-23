import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  LayoutGrid,
  MapPin,
  Rows3,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { TourCard } from "@/components/tours/tour-card";
import { TourCardSkeleton } from "@/components/tours/tour-card-skeleton";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  AMENITIES,
  amenityLabels,
  destinations,
  formatPrice,
  mealOptions,
  offerCategoryLabels,
  type OfferCategory,
} from "@/data/demo";
import { useAuth } from "@/lib/platform/auth";
import { searchService } from "@/lib/platform/search-service";
import {
  guestsSummary,
  originCities,
  PRICE_MAX,
  PRICE_MIN,
  validateSearchParams,
  type SearchParams,
  type SortKey,
} from "@/lib/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  validateSearch: validateSearchParams,
  head: () => ({
    meta: [
      { title: "Каталог туров: цены от разных компаний · TourGo" },
      {
        name: "description",
        content:
          "Сравнивайте туры: страна, даты, отель и цена от проверенных турфирм. Выбираете лучшее. Платите компании напрямую.",
      },
      { property: "og:title", content: "Каталог туров: цены от разных компаний · TourGo" },
      {
        property: "og:description",
        content: "Фильтры по стране, датам, питанию и бюджету. Несколько компаний в одной витрине.",
      },
    ],
  }),
  component: SearchPage,
});

type Update = (patch: Partial<SearchParams>) => void;
type LayoutMode = "grid" | "row";

const nightBuckets = [
  { value: "1-3", label: "1-3 ночи" },
  { value: "4-7", label: "4-7 ночей" },
  { value: "8-14", label: "8-14 ночей" },
  { value: "14+", label: "14+ ночей" },
];
const offerOptions = [
  { value: "hot", label: "Горящие" },
  { value: "premium", label: "Выгодная цена" },
  { value: "sponsored", label: "Рекомендуем" },
];
const categoryTabs: Array<{ value: "" | OfferCategory; label: string }> = [
  { value: "", label: "Все" },
  { value: "tour", label: "Туры" },
  { value: "hotel", label: "Отели" },
  { value: "excursion", label: "Экскурсии" },
  { value: "transfer", label: "Трансферы" },
];
const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "recommended", label: "Сначала выгодные" },
  { value: "price-asc", label: "Дешевле" },
  { value: "price-desc", label: "Дороже" },
  { value: "rating", label: "Выше рейтинг" },
  { value: "popular", label: "Популярные" },
  { value: "hot", label: "Горящие" },
];

function ChipGroup({
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
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              {option.label}
            </button>
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
        <h3 className="text-sm font-semibold">Цена за тур</h3>
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

      <ChipGroup
        title="Длительность"
        options={nightBuckets}
        selected={params.nights}
        onToggle={(v) => toggle("nights", v)}
      />
      <ChipGroup
        title="Отель"
        options={[5, 4, 3].map((s) => ({ value: String(s), label: `${s} звёзд` }))}
        selected={params.stars.map(String)}
        onToggle={(v) => toggle("stars", Number(v))}
      />
      <ChipGroup
        title="Питание"
        options={mealOptions.map((m) => ({ value: m.code, label: m.label }))}
        selected={params.meals}
        onToggle={(v) => toggle("meals", v)}
      />
      <ChipGroup
        title="Удобства"
        options={AMENITIES.map((a) => ({ value: a, label: amenityLabels[a] ?? a }))}
        selected={params.amenities}
        onToggle={(v) => toggle("amenities", v)}
      />
      <ChipGroup
        title="Рейтинг отеля"
        options={[
          { value: "9", label: "9+ отлично" },
          { value: "8", label: "8+ очень хорошо" },
        ]}
        selected={params.rating ? [String(params.rating)] : []}
        onToggle={(v) => update({ rating: params.rating === Number(v) ? 0 : Number(v) })}
      />
      <ChipGroup
        title="Предложения"
        options={offerOptions}
        selected={params.offers}
        onToggle={(v) => toggle("offers", v)}
      />

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5">
        <span className="text-sm">Гибкие даты, ±7 дней</span>
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={params.flexibleDates !== false}
          onChange={(e) => update({ flexibleDates: e.target.checked })}
        />
      </label>
    </div>
  );
}

function FieldButton({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof MapPin;
}) {
  return (
    <span className="flex h-[3.25rem] w-full min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 text-left transition-colors hover:border-primary/40">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-sm font-medium">{value}</span>
      </span>
    </span>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="min-w-0">
          <FieldButton label={label} value={current?.label ?? "Выберите"} icon={MapPin} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                option.value === value && "font-semibold text-primary",
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value ? <Check className="size-4 shrink-0" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Counter({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 rounded-full"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          -
        </Button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 rounded-full"
          disabled={value >= 9}
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </div>
    </div>
  );
}

function ToursSearchBar({ params, update }: { params: SearchParams; update: Update }) {
  const [query, setQuery] = useState(params.q);
  useEffect(() => {
    setQuery(params.q);
  }, [params.q]);

  const commitQuery = () => {
    if (query.trim() !== params.q) update({ q: query.trim() });
  };

  return (
    <div className="surface-card grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.1fr)] lg:items-center lg:p-2.5">
      <SelectField
        label="Откуда"
        value={params.from}
        options={[{ value: "", label: "Любой город" }, ...originCities.map((c) => ({ value: c, label: c }))]}
        onChange={(from) => update({ from })}
      />
      <SelectField
        label="Куда"
        value={params.destination}
        options={[
          { value: "", label: "Все страны" },
          ...destinations.map((d) => ({ value: d.id, label: `${d.flag} ${d.country}` })),
        ]}
        onChange={(destination) => update({ destination, city: "" })}
      />
      <DateRangePicker
        variant="field"
        label="Даты"
        from={params.dateStart}
        to={params.dateEnd}
        onChange={({ from, to }) => update({ dateStart: from, dateEnd: to })}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="min-w-0">
            <FieldButton
              label="Кто едет"
              value={guestsSummary(params.adults, params.children)}
              icon={Users}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-4 p-4">
          <Counter
            label="Взрослые"
            value={params.adults}
            min={1}
            onChange={(adults) => update({ adults })}
          />
          <Counter
            label="Дети"
            value={params.children}
            min={0}
            onChange={(children) => update({ children })}
          />
        </PopoverContent>
      </Popover>
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={commitQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitQuery();
          }}
          placeholder="Отель или город"
          className="h-[3.25rem] rounded-2xl border-border bg-card pl-10 text-sm shadow-none"
        />
      </div>
    </div>
  );
}

function activeFilterChips(params: SearchParams) {
  const chips: Array<{ key: string; label: string; clear: Partial<SearchParams> }> = [];
  if (params.q) chips.push({ key: "q", label: `«${params.q}»`, clear: { q: "" } });
  if (params.from) chips.push({ key: "from", label: `из ${params.from}`, clear: { from: "" } });
  if (params.city) chips.push({ key: "city", label: params.city, clear: { city: "" } });
  else if (params.destination) {
    const dest = destinations.find((d) => d.id === params.destination);
    chips.push({
      key: "destination",
      label: dest ? `${dest.flag} ${dest.country}` : params.destination,
      clear: { destination: "", city: "" },
    });
  }
  if (params.category) {
    chips.push({
      key: "category",
      label: offerCategoryLabels[params.category],
      clear: { category: "" },
    });
  }
  params.nights.forEach((n) =>
    chips.push({
      key: `nights-${n}`,
      label: nightBuckets.find((b) => b.value === n)?.label ?? n,
      clear: { nights: params.nights.filter((x) => x !== n) },
    }),
  );
  params.stars.forEach((s) =>
    chips.push({
      key: `stars-${s}`,
      label: `${s} звёзд`,
      clear: { stars: params.stars.filter((x) => x !== s) },
    }),
  );
  params.meals.forEach((m) =>
    chips.push({
      key: `meal-${m}`,
      label: mealOptions.find((x) => x.code === m)?.label ?? m,
      clear: { meals: params.meals.filter((x) => x !== m) },
    }),
  );
  params.offers.forEach((o) =>
    chips.push({
      key: `offer-${o}`,
      label: offerOptions.find((x) => x.value === o)?.label ?? o,
      clear: { offers: params.offers.filter((x) => x !== o) },
    }),
  );
  if (params.rating) {
    chips.push({ key: "rating", label: `${params.rating}+ рейтинг`, clear: { rating: 0 } });
  }
  if (params.priceMin !== PRICE_MIN || params.priceMax !== PRICE_MAX) {
    chips.push({
      key: "price",
      label: `${formatPrice(params.priceMin)} - ${formatPrice(params.priceMax)}`,
      clear: { priceMin: PRICE_MIN, priceMax: PRICE_MAX },
    });
  }
  return chips;
}

function filterCount(params: SearchParams) {
  return (
    params.nights.length +
    params.stars.length +
    params.meals.length +
    params.amenities.length +
    params.offers.length +
    (params.rating ? 1 : 0) +
    (params.priceMin !== PRICE_MIN || params.priceMax !== PRICE_MAX ? 1 : 0)
  );
}

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refinement, setRefinement] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>("grid");

  const update: Update = (patch) => {
    navigate({ search: ((prev: SearchParams) => ({ ...prev, ...patch })) as never });
  };

  const results = useMemo(() => searchService.search(params as Record<string, unknown>), [params]);
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
    const timer = setTimeout(() => setLoading(false), 280);
    return () => clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    searchService.trackSearch(params as Record<string, unknown>, results.length, user?.id);
  }, [params, results.length, user?.id]);

  const chips = activeFilterChips(params);
  const extraFilters = filterCount(params);
  const heading = params.destination
    ? `Туры в ${destinations.find((d) => d.id === params.destination)?.country ?? "выбранную страну"}`
    : "Туры";

  const reset = () =>
    navigate({
      search: {
        from: params.from,
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
    if (/премиум|premium|выгодн/.test(text))
      patch.offers = Array.from(new Set([...params.offers, "premium"]));
    if (/горящ/.test(text)) patch.offers = Array.from(new Set([...params.offers, "hot"]));
    if (/центр|инфраструкт/.test(text))
      patch.amenities = Array.from(new Set([...params.amenities, "Wi-Fi"]));
    if (/2\s*(?:дня|дней|ночи|ночей)\s*(?:дольше|больше)/.test(text)) patch.nights = ["8-14"];
    if (Object.keys(patch).length > 0) update(patch);
    setRefinement("");
  };

  const quickFilters: Array<{
    label: string;
    active: boolean;
    patch: Partial<SearchParams>;
  }> = [
    {
      label: "Горящие",
      active: params.offers.includes("hot"),
      patch: {
        offers: params.offers.includes("hot")
          ? params.offers.filter((o) => o !== "hot")
          : [...params.offers, "hot"],
      },
    },
    {
      label: "All Inclusive",
      active: params.meals.includes("AI") && params.meals.includes("UAI"),
      patch: {
        meals:
          params.meals.includes("AI") && params.meals.includes("UAI")
            ? params.meals.filter((m) => m !== "AI" && m !== "UAI")
            : Array.from(new Set([...params.meals, "AI", "UAI"])),
      },
    },
    {
      label: "5 звёзд",
      active: params.stars.includes(5),
      patch: {
        stars: params.stars.includes(5)
          ? params.stars.filter((s) => s !== 5)
          : [...params.stars, 5],
      },
    },
    {
      label: "7 ночей",
      active: params.nights.includes("4-7"),
      patch: {
        nights: params.nights.includes("4-7")
          ? params.nights.filter((n) => n !== "4-7")
          : [...params.nights, "4-7"],
      },
    },
    {
      label: "До 1 200 000 ₸",
      active: params.priceMax === 1_200_000,
      patch: { priceMax: params.priceMax === 1_200_000 ? PRICE_MAX : 1_200_000 },
    },
  ];

  return (
    <SiteLayout>
      <div className="border-b border-border/70 bg-secondary/25">
        <div className="container-page py-6 md:py-8">
          <p className="text-sm font-medium text-primary">Каталог</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">{heading}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Сравните отели, питание и цену. Выберите тур и напишите компании напрямую.
          </p>
        </div>
      </div>

      <div className="border-b border-border/70 bg-background/90 md:sticky md:top-[72px] md:z-30 md:backdrop-blur-xl">
        <div className="container-page py-3">
          <ToursSearchBar params={params} update={update} />
        </div>
      </div>

      <div className="container-page py-5 md:py-8">
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
          <button
            type="button"
            onClick={() => update({ destination: "", city: "" })}
            className={cn(
              "shrink-0 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
              !params.destination
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            Все страны
          </button>
          {destinations.map((dest) => {
            const on = params.destination === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() =>
                  update({
                    destination: on ? "" : dest.id,
                    city: "",
                  })
                }
                className={cn(
                  "flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl border pr-4 text-left transition-colors",
                  on
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <img src={dest.image} alt="" className="h-16 w-24 object-cover" />
                <span>
                  <span className="block text-sm font-semibold">
                    {dest.flag} {dest.country}
                  </span>
                  <span className="block text-xs text-muted-foreground">{dest.city}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {categoryTabs.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => update({ category: tab.value })}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                params.category === tab.value
                  ? "bg-ink text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/70",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickFilters.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => update(item.patch)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                item.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="surface-card sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">Фильтры</h2>
                {extraFilters > 0 ? (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Сбросить
                  </Button>
                ) : null}
              </div>
              <div className="mt-5">
                <Filters params={params} update={update} />
              </div>
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="mr-auto text-sm font-medium text-muted-foreground">
                {loading ? "Ищем варианты" : `Найдено ${results.length} предложений`}
              </p>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="size-4" />
                    Фильтры{extraFilters > 0 ? ` · ${extraFilters}` : ""}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="max-h-[88svh] overflow-y-auto rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
                >
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
              <Select value={params.sort} onValueChange={(v) => update({ sort: v as SortKey })}>
                <SelectTrigger className="w-[11.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="hidden rounded-xl border border-border p-0.5 sm:flex">
                <button
                  type="button"
                  aria-label="Сеткой"
                  onClick={() => setLayout("grid")}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg",
                    layout === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground",
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Списком"
                  onClick={() => setLayout("row")}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg",
                    layout === "row" ? "bg-secondary text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Rows3 className="size-4" />
                </button>
              </div>
            </div>

            {chips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => update(chip.clear)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium"
                  >
                    {chip.label}
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Сбросить всё
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowAi((v) => !v)}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="size-4 text-ai" />
              {showAi ? "Скрыть умный поиск" : "Уточнить словами"}
            </button>
            {showAi ? (
              <div className="gradient-ai mt-3 rounded-3xl p-4">
                <Textarea
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  placeholder="Например: покажи дешевле, только 5 звёзд, ближе к морю"
                  className="min-h-20 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/65"
                />
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={applyRefinement}
                  disabled={!refinement.trim()}
                >
                  Применить
                </Button>
              </div>
            ) : null}

            {loading ? (
              <div
                className={
                  layout === "grid"
                    ? "mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                    : "mt-5 space-y-4"
                }
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <TourCardSkeleton key={i} layout={layout} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="surface-card mt-5 p-10 text-center">
                <SearchX className="mx-auto size-10 text-muted-foreground" />
                <h2 className="mt-4 font-display text-xl font-semibold">
                  Под эти условия туров нет
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Снимите пару фильтров или выберите другую страну. Варианты появятся сразу.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {destinations.slice(0, 4).map((dest) => (
                    <Button
                      key={dest.id}
                      variant="outline"
                      size="sm"
                      onClick={() => update({ destination: dest.id, city: "", q: "" })}
                    >
                      {dest.flag} {dest.country}
                    </Button>
                  ))}
                </div>
                <Button className="mt-4" onClick={reset} variant="outline">
                  Сбросить фильтры
                </Button>
              </div>
            ) : (
              <div
                className={
                  layout === "grid"
                    ? "mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                    : "mt-5 space-y-4"
                }
              >
                {results.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    layout={layout}
                    bestPrice={tour.price === cheapest}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
