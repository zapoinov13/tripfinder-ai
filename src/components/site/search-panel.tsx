import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  MapPin,
  Mic,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
  Users,
  Wallet,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { destinations, formatPrice, mealOptions, resortsByDestination } from "@/data/demo";
import {
  buildAiChips,
  parseTravelQuery,
  parsedQueryToSearch,
  type ParsedTravelQuery,
} from "@/lib/ai-search";
import { saveAiSearch } from "@/lib/platform/ai-services";
import { searchService } from "@/lib/platform/search-service";
import { getState } from "@/lib/platform/store";
import { originCities, PRICE_MAX, PRICE_MIN, toSearchLink } from "@/lib/search";
import { speechService } from "@/lib/speech-service";
import { cn } from "@/lib/utils";

type DestOption = { value: string; label: string; destination: string; city: string };

const destinationOptions: DestOption[] = destinations.flatMap((d) => [
  { value: `${d.id}|`, label: `${d.flag} ${d.country} — все курорты`, destination: d.id, city: "" },
  ...(resortsByDestination[d.id] ?? []).map((r) => ({
    value: `${d.id}|${r.name}`,
    label: `${r.name}, ${d.country}`,
    destination: d.id,
    city: r.name,
  })),
]);

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function FieldShell({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof MapPin;
}) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/40">
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
}: {
  defaultTab?: "classic" | "ai";
  initialAiQuery?: string;
}) {
  const [tab, setTab] = useState<"classic" | "ai">(defaultTab);
  const [from, setFrom] = useState("Алматы");
  const [to, setTo] = useState("uae|Дубай");
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 7, 10),
    to: new Date(2026, 7, 17),
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(2);
  const [childAges, setChildAges] = useState<number[]>([7, 10]);
  const [budget, setBudget] = useState<[number, number]>([PRICE_MIN, 2500000]);
  const [meals, setMeals] = useState<string[]>([]);
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
      }) as never,
    });
  };

  const dateLabel = range?.from
    ? range.to
      ? `${dateFormatter.format(range.from).replace(/\s\S+$/, "")}–${dateFormatter.format(range.to)}`
      : dateFormatter.format(range.from)
    : "Выберите даты";
  const guestsLabelText =
    children > 0
      ? `${adults} взрослых + ${children} ${children === 1 ? "ребёнок" : "детей"}`
      : `${adults} взрослых`;
  const mealLabelText = meals.length ? meals.join(", ") : "Любое";

  const parseAi = (query = aiQuery) => {
    const parsed = parseTravelQuery(
      query ||
        "Хочу из Алматы в Дубай на 7 дней. Нас двое взрослых и ребёнок 5 лет. Бюджет до 1 200 000 ₸. Хотим хороший семейный отель рядом с морем и всё включено.",
    );
    setAiQuery(parsed.originalQuery);
    setParsedAi(parsed);
  };

  const goAiSearch = () => {
    const parsed = parsedAi ?? parseTravelQuery(aiQuery);
    const userId = getState().session?.userId;
    const results = searchService.search(parsedQueryToSearch(parsed));
    if (userId) saveAiSearch(userId, parsed.originalQuery, parsed, results.length);
    navigate({ to: "/search", search: parsedQueryToSearch(parsed) as never });
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
    <div className="surface-card overflow-hidden p-2 shadow-lift">
      <div className="flex gap-1 rounded-2xl bg-secondary/70 p-1">
        <button
          type="button"
          onClick={() => setTab("classic")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
            tab === "classic" ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
          )}
        >
          Найти тур
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
            tab === "ai"
              ? "gradient-ai text-primary-foreground shadow-card"
              : "text-muted-foreground",
          )}
        >
          ✨ Найти с AI
        </button>
      </div>

      {tab === "classic" ? (
        <div className="p-3 md:p-4">
          <div className="grid gap-2 lg:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
            <SelectField
              label="Откуда"
              value={from}
              options={originCities.map((c) => ({ value: c, label: c }))}
              onChange={setFrom}
            />
            <SelectField label="Куда" value={to} options={destinationOptions} onChange={setTo} />

            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="min-w-0">
                  <FieldShell label="Дата" value={dateLabel} icon={CalendarDays} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="min-w-0">
                  <FieldShell label="Туристы" value={guestsLabelText} icon={Users} />
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

            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="min-w-0">
                  <FieldShell
                    label="Бюджет"
                    value={`${formatPrice(budget[0])} – ${formatPrice(budget[1])}`}
                    icon={Wallet}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-4">
                <p className="text-sm font-medium">
                  {formatPrice(budget[0])} – {formatPrice(budget[1])}
                </p>
                <Slider
                  className="mt-4"
                  value={budget}
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={50000}
                  onValueChange={(v) => setBudget([v[0] ?? PRICE_MIN, v[1] ?? PRICE_MAX])}
                />
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>300 000 ₸</span>
                  <span>5 000 000 ₸</span>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="min-w-0">
                  <FieldShell label="Питание" value={mealLabelText} icon={UtensilsCrossed} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1.5">
                {mealOptions.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() =>
                      setMeals((prev) =>
                        prev.includes(m.code)
                          ? prev.filter((x) => x !== m.code)
                          : [...prev, m.code],
                      )
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                      meals.includes(m.code) && "font-semibold text-primary",
                    )}
                  >
                    <span className="truncate">
                      {m.code} · {m.label}
                    </span>
                    {meals.includes(m.code) ? <Check className="size-4 shrink-0" /> : null}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <Button size="lg" className="h-full min-h-13 rounded-2xl px-7" onClick={goSearch}>
              <Search className="size-4" />
              Найти туры
            </Button>
          </div>
          <button
            type="button"
            onClick={goSearch}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
            Расширенные фильтры
          </button>
        </div>
      ) : (
        <div className="p-3 md:p-4">
          <div className="relative rounded-2xl border border-ai/25 bg-ai/[0.04] p-3">
            <Textarea
              placeholder="Например: хочу из Алматы в Дубай на неделю с женой и двумя детьми. Бюджет до 1,5 млн ₸, всё включено, рядом с морем..."
              value={aiQuery}
              onChange={(e) => {
                setAiQuery(e.target.value);
                setParsedAi(null);
              }}
              className="min-h-32 resize-none border-0 bg-transparent pr-12 text-base shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              aria-label={recording ? "Идёт запись" : "Голосовой ввод"}
              onClick={runVoiceSearch}
              className={cn(
                "absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-card text-ai shadow-card transition-colors",
                recording && "bg-ai text-primary-foreground",
              )}
            >
              <Mic className="size-4" />
            </button>
          </div>
          {parsedAi ? (
            <div className="mt-3 rounded-2xl border border-ai/20 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Я правильно понял ваш запрос?</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => parseAi(aiQuery)}>
                  Обновить parsing
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {buildAiChips(parsedAi).map((chip) => (
                  <button
                    key={`${chip.label}-${chip.value}`}
                    type="button"
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary-soft hover:text-primary"
                    onClick={() => {
                      if (chip.key === "adults") {
                        patchParsedAi({ adults: Math.min(9, parsedAi.adults + 1) });
                      } else if (chip.key === "children") {
                        const childrenNext = Math.min(6, parsedAi.children + 1);
                        patchParsedAi({
                          children: childrenNext,
                          childAges: [...parsedAi.childAges, 7].slice(0, childrenNext),
                        });
                      } else if (chip.key === "budgetMax") {
                        patchParsedAi({
                          budgetMax: Math.max(PRICE_MIN, parsedAi.budgetMax - 100000),
                        });
                      } else if (chip.key === "duration") {
                        patchParsedAi({ duration: parsedAi.duration + 1 });
                      } else if (chip.key === "meals") {
                        patchParsedAi({ meals: parsedAi.meals.includes("AI") ? ["UAI"] : ["AI"] });
                      }
                    }}
                  >
                    <span className="text-muted-foreground">{chip.label}:</span> {chip.value}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <Button
            size="lg"
            className="gradient-ai mt-3 w-full rounded-2xl text-primary-foreground hover:opacity-90"
            onClick={parsedAi ? goAiSearch : () => parseAi()}
          >
            <Sparkles className="size-4" />
            {parsedAi ? "Показать варианты" : "Найти подходящие туры"}
          </Button>
        </div>
      )}
    </div>
  );
}
