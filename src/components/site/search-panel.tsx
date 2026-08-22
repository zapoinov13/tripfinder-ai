import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  MapPin,
  Mic,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DateRangePicker, parseIsoDate, toIsoDate } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { destinations, formatPrice, mealOptions, resortsByDestination } from "@/data/demo";
import { parseTravelQuery, parsedQueryToSearch, type ParsedTravelQuery } from "@/lib/ai-search";
import { saveAiSearch } from "@/lib/platform/ai-services";
import { searchService } from "@/lib/platform/search-service";
import { getState } from "@/lib/platform/store";
import { originCities, PRICE_MAX, PRICE_MIN, toSearchLink } from "@/lib/search";
import { speechService } from "@/lib/speech-service";
import { cn } from "@/lib/utils";

type DestOption = { value: string; label: string; destination: string; city: string };

const destinationOptions: DestOption[] = destinations.flatMap((d) => [
  { value: `${d.id}|`, label: `${d.flag} ${d.country}: все курорты`, destination: d.id, city: "" },
  ...(resortsByDestination[d.id] ?? []).map((r) => ({
    value: `${d.id}|${r.name}`,
    label: `${r.name}, ${d.country}`,
    destination: d.id,
    city: r.name,
  })),
]);

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Понятные пользователю удобства вместо кодов из каталога. */
const extraOptions = [
  { key: "Beach", label: "Отель у моря" },
  { key: "Transfer", label: "Трансфер включён" },
  { key: "Kids Club", label: "Отдых с детьми" },
  { key: "Pool", label: "Бассейн" },
];

function FieldShell({
  label,
  value,
  valueDesktop,
  icon: Icon,
}: {
  label: string;
  value: string;
  valueDesktop?: string;
  icon: typeof MapPin;
}) {
  return (
    <span className="flex min-h-[3.5rem] w-full min-w-0 items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-left shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-md md:min-h-[3.25rem] md:rounded-2xl">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary/80 text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold leading-snug text-foreground">
          {valueDesktop ? (
            <>
              <span className="md:hidden">{value}</span>
              <span className="hidden md:inline">{valueDesktop}</span>
            </>
          ) : (
            value
          )}
        </span>
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
        <button type="button" className="min-w-0 w-full">
          <FieldShell label={label} value={current?.label ?? "Выберите"} icon={MapPin} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
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
          aria-label={`Уменьшить: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8 rounded-full"
          aria-label={`Увеличить: ${label}`}
          disabled={value >= 9}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function SearchPanel({
  defaultTab = "classic",
  initialAiQuery = "",
  tone = "default",
}: {
  defaultTab?: "classic" | "ai";
  initialAiQuery?: string;
  tone?: "default" | "hero";
}) {
  const [tab, setTab] = useState<"classic" | "ai">(defaultTab);
  const [from, setFrom] = useState("Алматы");
  const [to, setTo] = useState("uae|Дубай");
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 9, 10),
    to: new Date(2026, 9, 17),
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);
  const [childAges, setChildAges] = useState<number[]>([7]);
  const [budget, setBudget] = useState<[number, number]>([PRICE_MIN, 2500000]);
  const [meals, setMeals] = useState<string[]>([]);
  const [stars, setStars] = useState<number[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [aiQuery, setAiQuery] = useState(initialAiQuery);
  const [parsedAi, setParsedAi] = useState<ParsedTravelQuery | null>(null);
  const [recording, setRecording] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialAiQuery) setAiQuery(initialAiQuery);
  }, [initialAiQuery]);

  const goSearch = () => {
    const [destination = "", city = ""] = to.split("|");
    navigate({
      to: "/search",
      search: toSearchLink({
        from,
        destination,
        city,
        dateStart: range?.from ? toIso(range.from) : "",
        dateEnd: range?.to ? toIso(range.to) : "",
        adults,
        children,
        childAges: childAges.slice(0, children),
        priceMin: budget[0],
        priceMax: budget[1],
        meals,
        stars,
        amenities,
      }) as never,
    });
  };

  const guestsLabelText =
    children > 0
      ? `${adults} взр. · ${children} ${children === 1 ? "реб." : "дет."}`
      : `${adults} взрослых`;

  const guestsLabelDesktop =
    children > 0
      ? `${adults} взрослых · ${children} ${children === 1 ? "ребёнок" : "детей"}`
      : `${adults} взрослых`;

  const parseAi = (query = aiQuery) => {
    const parsed = parseTravelQuery(
      query ||
        "Хотим в Дубай на неделю, двое взрослых и ребёнок, хороший отель у моря, бюджет до 1 500 000 ₸.",
    );
    setAiQuery(parsed.originalQuery);
    setParsedAi(parsed);
  };

  const goAiSearch = () => {
    const parsed = parsedAi ?? parseTravelQuery(aiQuery);
    const userId = getState().session?.userId;
    const params = {
      ...parsedQueryToSearch(parsed),
      dateStart: range?.from ? toIso(range.from) : "",
      dateEnd: range?.to ? toIso(range.to) : "",
    };
    const results = searchService.search(params);
    if (userId) saveAiSearch(userId, parsed.originalQuery, parsed, results.length);
    navigate({ to: "/search", search: params as never });
  };

  const runVoiceSearch = async () => {
    setRecording(true);
    try {
      const transcript = await speechService.start();
      setAiQuery(transcript.text);
      parseAi(transcript.text);
    } finally {
      setRecording(false);
    }
  };

  const patchParsedAi = (patch: Partial<ParsedTravelQuery>) => {
    setParsedAi((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.35rem] border shadow-lift md:rounded-[1.75rem]",
        tone === "hero"
          ? "border-primary-foreground/15 bg-primary-foreground/94 backdrop-blur-xl"
          : "border-border/60 bg-card",
      )}
    >
      <div className="grid grid-cols-2 gap-1 border-b border-border/50 bg-secondary/40 p-1.5 md:p-2">
        <button
          type="button"
          onClick={() => setTab("classic")}
          className={cn(
            "rounded-xl px-3 py-2.5 text-sm font-semibold transition-all md:px-4",
            tab === "classic"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Найти туры
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all md:px-4",
            tab === "ai"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-4" />
          Умный поиск
        </button>
      </div>

      {tab === "classic" ? (
        <div className="space-y-3 px-3 pb-3 md:p-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
            <SelectField
              label="Откуда"
              value={from}
              options={originCities.map((c) => ({ value: c, label: c }))}
              onChange={setFrom}
            />
            <SelectField label="Куда" value={to} options={destinationOptions} onChange={setTo} />

            <div className="grid grid-cols-2 gap-2 md:contents">
              <DateRangePicker
                variant="field"
                label="Даты"
                from={range?.from ? toIsoDate(range.from) : ""}
                to={range?.to ? toIsoDate(range.to) : ""}
                onChange={({ from, to }) =>
                  setRange({ from: parseIsoDate(from), to: parseIsoDate(to) })
                }
              />

              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="min-w-0 w-full">
                    <FieldShell
                      label="Туристы"
                      value={guestsLabelText}
                      valueDesktop={guestsLabelDesktop}
                      icon={Users}
                    />
                  </button>
                </PopoverTrigger>
              <PopoverContent align="start" className="w-72 space-y-4 p-4">
                <Counter label="Взрослые" value={adults} min={1} onChange={setAdults} />
                <Counter label="Дети" value={children} min={0} onChange={setChildren} />
                {children > 0 ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Возраст детей
                    </p>
                    {Array.from({ length: children }).map((_, i) => (
                      <label key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span>Ребёнок {i + 1}</span>
                        <select
                          className="rounded-xl border border-border bg-card px-2 py-1.5 text-sm"
                          value={childAges[i] ?? 7}
                          onChange={(e) => {
                            const next = [...childAges];
                            next[i] = Number(e.target.value);
                            setChildAges(next);
                          }}
                        >
                          {Array.from({ length: 18 }).map((__, age) => (
                            <option key={age} value={age}>
                              {age} лет
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
            </div>

            <Button
              size="lg"
              className="col-span-2 h-12 w-full rounded-xl px-6 shadow-md md:col-span-2 xl:col-span-1 xl:h-[3.25rem] xl:rounded-2xl"
              onClick={goSearch}
            >
              <Search className="size-4" />
              Найти туры
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
            {showMore ? "Скрыть фильтры" : "Ещё фильтры"}
          </button>

          {showMore ? (
            <div className="mt-3 grid gap-5 rounded-2xl border border-border bg-secondary/30 p-4 md:grid-cols-2">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Бюджет
                </Label>
                <p className="mt-2 text-sm font-medium">
                  {formatPrice(budget[0])} – {formatPrice(budget[1])}
                </p>
                <Slider
                  className="mt-3"
                  value={budget}
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={50000}
                  onValueChange={(v) => setBudget([v[0] ?? PRICE_MIN, v[1] ?? PRICE_MAX])}
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Количество звёзд
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[3, 4, 5].map((s) => (
                    <Chip
                      key={s}
                      active={stars.includes(s)}
                      onClick={() =>
                        setStars((prev) =>
                          prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                        )
                      }
                    >
                      {s} звезды
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Питание
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {mealOptions.map((m) => (
                    <Chip
                      key={m.code}
                      active={meals.includes(m.code)}
                      onClick={() =>
                        setMeals((prev) =>
                          prev.includes(m.code)
                            ? prev.filter((x) => x !== m.code)
                            : [...prev, m.code],
                        )
                      }
                    >
                      {m.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Что важно
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {extraOptions.map((o) => (
                    <Chip
                      key={o.key}
                      active={amenities.includes(o.key)}
                      onClick={() =>
                        setAmenities((prev) =>
                          prev.includes(o.key) ? prev.filter((x) => x !== o.key) : [...prev, o.key],
                        )
                      }
                    >
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 px-3 pb-4 md:p-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-background to-ai/10 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="font-display text-base font-semibold leading-snug">
                  Не хотите заполнять всё вручную?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Просто расскажите, куда и как хотите поехать — AI подберёт параметры.
                </p>
              </div>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
              <Textarea
                placeholder="Например: хотим в Дубай на неделю, двое взрослых и ребёнок, хороший отель у моря, бюджет до 1 500 000 ₸."
                value={aiQuery}
                onChange={(e) => {
                  setAiQuery(e.target.value);
                  setParsedAi(null);
                }}
                className="min-h-[7.5rem] resize-none border-0 bg-transparent px-4 py-3.5 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 md:min-h-28"
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr]">
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "h-12 rounded-xl border-border/80 bg-background shadow-sm sm:px-5",
                  recording && "border-primary text-primary",
                )}
                onClick={runVoiceSearch}
              >
                <Mic className="size-4" />
                {recording ? "Слушаем…" : "Голосом"}
              </Button>
              <Button
                size="lg"
                className="h-12 rounded-xl bg-primary shadow-md hover:bg-primary/90"
                onClick={() => parseAi()}
              >
                <Sparkles className="size-4" />
                Найти для меня
              </Button>
            </div>
          </div>

          {parsedAi ? (
            <div className="mt-4 rounded-2xl border border-ai/25 bg-card p-4">
              <p className="font-display text-base font-semibold">Мы правильно поняли?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Проверьте детали, их можно изменить.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Откуда</Label>
                  <select
                    value={parsedAi.origin}
                    onChange={(e) => patchParsedAi({ origin: e.target.value })}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {originCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Куда</Label>
                  <select
                    value={parsedAi.destination}
                    onChange={(e) => patchParsedAi({ destination: e.target.value, city: "" })}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.flag} {d.city}, {d.country}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <DateRangePicker
                    label="Даты"
                    from={range?.from ? toIsoDate(range.from) : ""}
                    to={range?.to ? toIsoDate(range.to) : ""}
                    onChange={({ from, to }) =>
                      setRange({ from: parseIsoDate(from), to: parseIsoDate(to) })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Срок, ночей</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={parsedAi.duration}
                    onChange={(e) =>
                      patchParsedAi({ duration: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Взрослых</Label>
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    value={parsedAi.adults}
                    onChange={(e) =>
                      patchParsedAi({ adults: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Детей</Label>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    value={parsedAi.children}
                    onChange={(e) => {
                      const next = Math.max(0, Number(e.target.value) || 0);
                      patchParsedAi({
                        children: next,
                        childAges: Array.from(
                          { length: next },
                          (_, i) => parsedAi.childAges[i] ?? 7,
                        ),
                      });
                    }}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Бюджет, ₸ (до)</Label>
                  <MoneyInput
                    value={parsedAi.budgetMax}
                    onChange={(next) =>
                      patchParsedAi({ budgetMax: Math.max(PRICE_MIN, next) })
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Умный поиск не придумывает предложения: он ищет только реальные туры, которые есть
                в TourGo.
              </p>

              <Button size="lg" className="mt-4 w-full rounded-2xl" onClick={goAiSearch}>
                <Search className="size-4" />
                Найти туры
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
