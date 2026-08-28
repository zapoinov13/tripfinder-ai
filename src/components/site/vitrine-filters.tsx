import type { LucideIcon } from "lucide-react";

import { openState, scheduleActive } from "@/lib/platform/booking-slots";
import type { Organization } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

/**
 * Шапка витрины: город, категории и порядок показа.
 *
 * Раньше до первой услуги нужно было проскроллить чипы восьми городов и десять
 * плиток категорий — два экрана прежде, чем турист увидит цену. Здесь всё это
 * ужато в две строки: город показываем, только когда есть из чего выбирать,
 * категории идут лентой, а фильтры отвечают на живые вопросы — «открыто
 * сейчас» и «где дешевле».
 */

/**
 * Шапка раздела: одна и та же во всех витринах.
 *
 * Разделы открывались по-разному — где-то тёмная обложка во весь экран,
 * где-то счётчики с нулями, где-то просто заголовок. Человек не должен
 * заново понимать, где он оказался: раздел, вопрос, одна строка объяснения.
 */
export function VitrineHeader({
  section,
  title,
  subtitle,
}: {
  section: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header>
      <p className="text-sm font-medium text-primary">{section}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground/70">{subtitle}</p>
    </header>
  );
}

export type VitrineKind = { id: string; label: string; emoji?: string; icon?: LucideIcon };

/** Города, в которых на витрине реально что-то есть. */
export function citiesWithOffers(items: { city: string }[]): string[] {
  const seen = new Map<string, number>();
  for (const item of items) {
    const city = item.city.trim();
    if (!city) continue;
    seen.set(city, (seen.get(city) ?? 0) + 1);
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([city]) => city);
}

export function CityRow({
  cities,
  value,
  onChange,
}: {
  cities: string[];
  value: string | undefined;
  onChange: (city: string) => void;
}) {
  // Пока город один — это факт, а не выбор: не притворяемся фильтром.
  if (cities.length <= 1) {
    return cities[0] ? (
      <p className="mt-4 text-sm text-foreground/70">
        Компании в городе <span className="font-semibold text-foreground">{cities[0]}</span>. Другие
        города открываем по мере подключения партнёров.
      </p>
    ) : null;
  }

  return (
    <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
      {cities.map((city) => (
        <button
          key={city}
          type="button"
          onClick={() => onChange(value === city ? "" : city)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            value === city
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card",
          )}
        >
          {city}
        </button>
      ))}
    </div>
  );
}

export function KindRow({
  kinds,
  value,
  onChange,
}: {
  kinds: readonly VitrineKind[];
  value: string | undefined;
  onChange: (kind: string) => void;
}) {
  return (
    <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
      {kinds.map((kind) => {
        const active = value === kind.id;
        return (
          <button
            key={kind.id}
            type="button"
            onClick={() => onChange(active ? "" : kind.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card",
            )}
          >
            {kind.emoji ? <span aria-hidden>{kind.emoji}</span> : null}
            {kind.icon ? <kind.icon className="size-4" aria-hidden /> : null}
            <span className="whitespace-nowrap">{kind.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export type VitrineSort = "default" | "cheap" | "open";

export function SortRow({
  value,
  onChange,
  openCount,
}: {
  value: VitrineSort;
  onChange: (sort: VitrineSort) => void;
  openCount: number;
}) {
  const options: { id: VitrineSort; label: string }[] = [
    { id: "default", label: "Рекомендуем" },
    { id: "cheap", label: "Сначала дешевле" },
    ...(openCount > 0 ? [{ id: "open" as const, label: `Открыто сейчас · ${openCount}` }] : []),
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            value === option.id ? "bg-secondary text-foreground" : "text-muted-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Компания принимает клиентов прямо сейчас. */
export function isOpenNow(company: Organization | undefined): boolean {
  if (!company || !scheduleActive(company)) return false;
  return openState(company.bookingSchedule).open;
}
