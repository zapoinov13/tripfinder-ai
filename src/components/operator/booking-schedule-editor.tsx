import { Button } from "@/components/ui/button";
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
import { WEEKDAY_FULL, defaultSchedule, scheduleSummary } from "@/lib/platform/booking-slots";
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

export function BookingScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: BookingSchedule | undefined;
  onChange: (next: BookingSchedule) => void;
  disabled?: boolean;
}) {
  const schedule = value ?? { ...defaultSchedule(), enabled: false };

  const patch = (next: Partial<BookingSchedule>) => onChange({ ...schedule, ...next });

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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/40 p-4">
            <p className="min-w-0 text-xs text-muted-foreground">{scheduleSummary(schedule)}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onChange(defaultSchedule())}
            >
              Сбросить к обычному
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
