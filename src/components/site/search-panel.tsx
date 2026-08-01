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
  Users,
  Wallet,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { destinations, formatPrice } from "@/data/demo";
import { cn } from "@/lib/utils";

const originCities = ["Алматы", "Астана", "Шымкент", "Актау", "Атырау", "Караганда"];
const destinationCities = destinations.map((d) => `${d.city}, ${d.country}`);

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

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
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium">{value}</span>
      </span>
    </span>
  );
}

function CityField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="min-w-0">
          <FieldShell label={label} value={value} icon={MapPin} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                option === value && "font-semibold text-primary",
              )}
            >
              <span className="truncate">{option}</span>
              {option === value ? <Check className="size-4 shrink-0" /> : null}
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

export function SearchPanel() {
  const [tab, setTab] = useState<"classic" | "ai">("classic");
  const [from, setFrom] = useState("Алматы");
  const [to, setTo] = useState("Дубай, ОАЭ");
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 7, 10),
    to: new Date(2026, 7, 17),
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(2);
  const [budget, setBudget] = useState(1500000);
  const navigate = useNavigate();
  const goSearch = () => navigate({ to: "/search" });

  const dateLabel = range?.from
    ? range.to
      ? `${dateFormatter.format(range.from).replace(/\s\S+$/, "")}–${dateFormatter.format(range.to)}`
      : dateFormatter.format(range.from)
    : "Выберите даты";
  const guestsLabelText =
    children > 0 ? `${adults} взрослых + ${children} ${children === 1 ? "ребёнок" : "детей"}` : `${adults} взрослых`;

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
            tab === "ai" ? "gradient-ai text-primary-foreground shadow-card" : "text-muted-foreground",
          )}
        >
          ✨ Найти с AI
        </button>
      </div>

      {tab === "classic" ? (
        <div className="p-3 md:p-4">
          <div className="grid gap-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
            <CityField label="Откуда" value={from} options={originCities} onChange={setFrom} />
            <CityField label="Куда" value={to} options={destinationCities} onChange={setTo} />

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
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="min-w-0">
                  <FieldShell label="Бюджет" value={`до ${formatPrice(budget)}`} icon={Wallet} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-4">
                <p className="text-sm font-medium">до {formatPrice(budget)}</p>
                <Slider
                  className="mt-4"
                  value={[budget]}
                  min={300000}
                  max={5000000}
                  step={50000}
                  onValueChange={(v) => setBudget(v[0] ?? budget)}
                />
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>300 000 ₸</span>
                  <span>5 000 000 ₸</span>
                </div>
              </PopoverContent>
            </Popover>

            <Button size="lg" className="h-full min-h-13 rounded-2xl px-7" onClick={goSearch}>
              <Search className="size-4" />
              Найти туры
            </Button>
          </div>
          <button
            type="button"
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
              className="min-h-32 resize-none border-0 bg-transparent pr-12 text-base shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              aria-label="Голосовой ввод"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-card text-ai shadow-card"
            >
              <Mic className="size-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="gradient-ai mt-3 w-full rounded-2xl text-primary-foreground hover:opacity-90"
            onClick={goSearch}
          >
            <Sparkles className="size-4" />
            Найти подходящий тур
          </Button>
        </div>
      )}
    </div>
  );
}