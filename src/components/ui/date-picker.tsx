import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

export function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseIsoDate(iso?: string) {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function nightsBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000));
}

function nightsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ночь`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ночи`;
  return `${n} ночей`;
}

function formatRangeLabelCompact(from?: Date, to?: Date) {
  if (!from) return "Выберите даты";
  if (!to || toIsoDate(from) === toIsoDate(to)) return shortFmt.format(from);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) {
    const month = shortFmt.format(from).replace(/^\d+\s*/, "");
    return `${from.getDate()}–${to.getDate()} ${month}`;
  }
  return `${shortFmt.format(from)} – ${shortFmt.format(to)}`;
}

function formatRangeLabel(from?: Date, to?: Date) {
  if (!from) return "Выберите даты";
  if (!to || toIsoDate(from) === toIsoDate(to)) return dayFmt.format(from);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) return `${from.getDate()}–${dayFmt.format(to)}`;
  return `${shortFmt.format(from)} – ${shortFmt.format(to)}`;
}

const tripPresets = [
  { label: "7 ночей", nights: 7 },
  { label: "10 ночей", nights: 10 },
  { label: "14 ночей", nights: 14 },
];

const shortPresets = [
  { label: "Сегодня", days: 0 },
  { label: "Завтра", days: 1 },
  { label: "Через 3 дня", days: 3 },
];

type RangePreset = "trip" | "short" | "none";

export function DateRangePicker({
  from,
  to,
  onChange,
  label = "Даты",
  presets = "trip",
  months = 1,
  variant = "input",
  className,
  disabledBefore,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  label?: string;
  presets?: RangePreset;
  months?: 1 | 2;
  variant?: "input" | "field";
  className?: string;
  disabledBefore?: Date;
}) {
  const [open, setOpen] = useState(false);
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  const selected: DateRange | undefined = fromDate ? { from: fromDate, to: toDate } : undefined;
  const nights = fromDate && toDate ? nightsBetween(fromDate, toDate) : 0;
  const min = disabledBefore ?? startOfDay(new Date());

  const applyRange = (start: Date, end: Date) => {
    onChange({ from: toIsoDate(start), to: toIsoDate(end) });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn("min-w-0 w-full text-left", className)}>
          {variant === "field" ? (
            <span className="flex min-h-[3.5rem] w-full min-w-0 items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2.5 shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-md md:min-h-[3.25rem] md:rounded-2xl">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary/80 text-muted-foreground">
                <CalendarDays className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </span>
                <span className="block text-sm font-semibold leading-snug text-foreground">
                  {formatRangeLabelCompact(fromDate, toDate)}
                </span>
                {nights > 0 ? (
                  <span className="hidden text-xs font-medium text-muted-foreground sm:block">
                    {nightsWord(nights)}
                  </span>
                ) : null}
              </span>
            </span>
          ) : (
            <span className="flex h-11 w-full items-center gap-3 rounded-xl border border-input bg-background px-3 transition-colors hover:border-primary/40">
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] leading-none text-muted-foreground">{label}</span>
                <span className="mt-0.5 block truncate text-sm font-medium">
                  {formatRangeLabel(fromDate, toDate)}
                  {nights > 0 ? ` · ${nightsWord(nights)}` : ""}
                </span>
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(100vw-1.5rem,22rem)] max-h-[min(36rem,85vh)] overflow-x-hidden overflow-y-auto rounded-3xl border-border p-0 shadow-lift sm:w-auto"
      >
        <div className="border-b border-border bg-secondary/40 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DateChip title="Туда" date={fromDate} />
            <span className="text-muted-foreground">→</span>
            <DateChip title="Обратно" date={toDate} />
          </div>
          {nights > 0 ? (
            <p className="mt-2 text-xs font-medium text-primary">{nightsWord(nights)}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Сначала выберите дату вылета, затем возвращения</p>
          )}
        </div>

        {presets !== "none" ? (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {presets === "trip"
              ? tripPresets.map((p) => (
                  <PresetChip
                    key={p.label}
                    active={nights === p.nights}
                    onClick={() => {
                      const start = fromDate ?? addDays(min, 1);
                      applyRange(start, addDays(start, p.nights));
                    }}
                  >
                    {p.label}
                  </PresetChip>
                ))
              : shortPresets.map((p) => (
                  <PresetChip
                    key={p.label}
                    active={fromDate ? toIsoDate(fromDate) === toIsoDate(addDays(min, p.days)) : false}
                    onClick={() => {
                      const day = addDays(min, p.days);
                      applyRange(day, day);
                    }}
                  >
                    {p.label}
                  </PresetChip>
                ))}
          </div>
        ) : null}

        <div className="px-2 py-2 sm:px-3">
          <Calendar
            mode="range"
            selected={selected}
            onSelect={(range) => {
              if (!range?.from) return;
              applyRange(range.from, range.to ?? range.from);
            }}
            numberOfMonths={months}
            disabled={{ before: min }}
            defaultMonth={fromDate ?? min}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <button
            type="button"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              const start = addDays(min, 1);
              applyRange(start, addDays(start, 7));
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            onClick={() => setOpen(false)}
          >
            Готово
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DatePicker({
  value,
  onChange,
  label = "Дата",
  className,
  disabledBefore,
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  className?: string;
  disabledBefore?: Date;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const min = disabledBefore ?? startOfDay(new Date());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn("w-full min-w-0 text-left", className)}>
          <span className="flex h-11 w-full items-center gap-3 rounded-xl border border-input bg-background px-3 transition-colors hover:border-primary/40">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] leading-none text-muted-foreground">{label}</span>
              <span className="mt-0.5 block truncate text-sm font-medium">
                {selected
                  ? `${dayFmt.format(selected)}, ${weekdayFmt.format(selected)}`
                  : "Выберите дату"}
              </span>
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto overflow-hidden rounded-3xl border-border p-0 shadow-lift">
        <div className="px-2 py-2 sm:px-3">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (!day) return;
              onChange(toIsoDate(day));
              setOpen(false);
            }}
            disabled={{ before: min }}
            defaultMonth={selected ?? min}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <button
            type="button"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              onChange(toIsoDate(min));
              setOpen(false);
            }}
          >
            Сегодня
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
            onClick={() => setOpen(false)}
          >
            Готово
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DateChip({ title, date }: { title: string; date: Date | undefined }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-card px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="truncate text-sm font-semibold">{date ? dayFmt.format(date) : "не выбрано"}</p>
    </div>
  );
}

function PresetChip({
  children,
  active,
  onClick,
}: {
  children: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground hover:bg-secondary/70",
      )}
    >
      {children}
    </button>
  );
}
