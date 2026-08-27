import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  WEEKDAY_FULL,
  closedDateLabel,
  defaultSchedule,
  isoDate,
  scheduleSummary,
  upcomingClosedDates,
} from "@/lib/platform/booking-slots";
import type { BookingSchedule } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

const SLOT_OPTIONS = [30, 45, 60, 90, 120];

/**
 * Часы выбираем списком, а не <input type="time">: нативное поле рисует
 * AM/PM по локали браузера, а расписание должно читаться одинаково у всех.
 */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function TimeSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean | undefined;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled ?? false}>
      <SelectTrigger className="w-28" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
/** Порядок недели с понедельника: getDay() отдаёт 0 = воскресенье. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Все даты периода включительно; на всякий случай ограничиваем годом. */
function datesBetween(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return Number.isNaN(start.getTime()) ? [] : [from];
  }
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && out.length < 366) {
    out.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function BookingScheduleEditor({
  value,
  onChange,
  disabled,
  bookedOn,
}: {
  value: BookingSchedule | undefined;
  onChange: (next: BookingSchedule) => void;
  disabled?: boolean;
  /** Сколько записей уже стоит на дату: предупреждаем, прежде чем закрыть день. */
  bookedOn?: ((date: string) => number) | undefined;
}) {
  const schedule = value ?? { ...defaultSchedule(), enabled: false };
  const [closeFrom, setCloseFrom] = useState("");
  const [closeTo, setCloseTo] = useState("");

  const patch = (next: Partial<BookingSchedule>) => onChange({ ...schedule, ...next });

  const closed = upcomingClosedDates(schedule);
  // Сколько записей попадёт под закрытие выбранного периода.
  const affected = (() => {
    if (!closeFrom || !bookedOn) return 0;
    let total = 0;
    for (const date of datesBetween(closeFrom, closeTo || closeFrom)) total += bookedOn(date);
    return total;
  })();

  const addClosed = () => {
    if (!closeFrom) return;
    const next = new Set([
      ...(schedule.closedDates ?? []),
      ...datesBetween(closeFrom, closeTo || closeFrom),
    ]);
    patch({ closedDates: [...next].sort() });
    setCloseFrom("");
    setCloseTo("");
  };

  const removeClosed = (date: string) =>
    patch({ closedDates: (schedule.closedDates ?? []).filter((d) => d !== date) });

  const setDay = (day: number, hours: { open: string; close: string } | null) =>
    patch({ days: { ...schedule.days, [String(day)]: hours } });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
        <div className="min-w-0">
          <p className="font-medium">Запись по слотам</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {schedule.enabled
              ? "Клиент выбирает свободное время из вашего расписания."
              : "Выключено: клиент вписывает удобное время сам, вы подтверждаете вручную."}
          </p>
        </div>
        <Switch
          checked={schedule.enabled}
          disabled={disabled}
          onCheckedChange={(enabled) =>
            onChange(
              enabled ? { ...defaultSchedule(), ...schedule, enabled } : { ...schedule, enabled },
            )
          }
        />
      </div>

      {schedule.enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="slot-minutes">Длина слота</Label>
              <div className="flex flex-wrap gap-1.5">
                {SLOT_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    id={minutes === schedule.slotMinutes ? "slot-minutes" : undefined}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ slotMinutes: minutes })}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium",
                      minutes === schedule.slotMinutes
                        ? "bg-ink text-primary-foreground"
                        : "bg-secondary",
                    )}
                  >
                    {minutes} мин
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-capacity">Мест в одном слоте</Label>
              <Input
                id="slot-capacity"
                type="number"
                min={1}
                max={100}
                disabled={disabled}
                value={schedule.capacity}
                onChange={(e) => patch({ capacity: Math.max(1, Number(e.target.value) || 1) })}
              />
              <p className="text-xs text-muted-foreground">
                Сколько клиентов принимаете одновременно.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-horizon">Записывать на, дней вперёд</Label>
              <Input
                id="slot-horizon"
                type="number"
                min={1}
                max={120}
                disabled={disabled}
                value={schedule.horizonDays}
                onChange={(e) =>
                  patch({ horizonDays: Math.min(120, Math.max(1, Number(e.target.value) || 1)) })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Часы по дням</p>
            {WEEK_ORDER.map((day) => {
              const hours = schedule.days?.[String(day)] ?? null;
              const open = Boolean(hours);
              return (
                <div
                  key={day}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2.5"
                >
                  <span className="w-32 text-sm font-medium">{WEEKDAY_FULL[day]}</span>
                  <Switch
                    checked={open}
                    disabled={disabled}
                    aria-label={`${WEEKDAY_FULL[day]}: рабочий день`}
                    onCheckedChange={(on) =>
                      setDay(day, on ? { open: "09:00", close: "21:00" } : null)
                    }
                  />
                  {open ? (
                    <div className="flex items-center gap-2">
                      <TimeSelect
                        label={`${WEEKDAY_FULL[day]}: открытие`}
                        disabled={disabled}
                        value={hours!.open}
                        onChange={(open) => setDay(day, { ...hours!, open })}
                      />
                      <span className="text-muted-foreground">—</span>
                      <TimeSelect
                        label={`${WEEKDAY_FULL[day]}: закрытие`}
                        disabled={disabled}
                        value={hours!.close}
                        onChange={(close) => setDay(day, { ...hours!, close })}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">выходной</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Выходные и отпуск</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Закройте конкретные дни — праздник, отпуск или ремонт. В эти даты запись не
                предлагается, а на странице компании стоит «Закрыто».
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-52" data-testid="closed-from">
                <DatePicker
                  label="С какого дня"
                  value={closeFrom}
                  onChange={(next) => {
                    setCloseFrom(next);
                    if (closeTo && closeTo < next) setCloseTo("");
                  }}
                />
              </div>
              <div className="w-52" data-testid="closed-to">
                <DatePicker
                  label="По какой день"
                  value={closeTo}
                  onChange={setCloseTo}
                  {...(closeFrom ? { disabledBefore: new Date(`${closeFrom}T00:00:00`) } : {})}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={disabled || !closeFrom}
                onClick={addClosed}
              >
                Закрыть эти дни
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Один день — заполните только «с». Период — обе даты.
            </p>
            {affected > 0 ? (
              <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm">
                На эти даты уже есть записи: {affected}. Закрытие не отменит их — предупредите
                клиентов и перенесите в разделе «Заявки».
              </p>
            ) : null}
            {closed.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {closed.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium"
                  >
                    {closedDateLabel(date)}
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Открыть ${closedDateLabel(date)}`}
                      onClick={() => removeClosed(date)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Закрытых дней впереди нет.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/40 p-4">
            <p className="min-w-0 text-xs text-muted-foreground">{scheduleSummary(schedule)}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() =>
                onChange({ ...defaultSchedule(), closedDates: schedule.closedDates ?? [] })
              }
            >
              Сбросить к обычному
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
