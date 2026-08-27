import { ChevronDown, Clock } from "lucide-react";
import { useState } from "react";

import {
  WEEKDAY_FULL,
  closedDateLabel,
  isClosedDate,
  isoDate,
  openState,
  upcomingClosedDates,
} from "@/lib/platform/booking-slots";
import type { BookingSchedule } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

/** Неделя с понедельника: getDay() отдаёт 0 = воскресенье. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Часы работы: сегодня видно сразу, вся неделя — по клику.
 * Простыня «Пн 08:00–22:00 · Вт 08:00–22:00 · …» не читается.
 */
export function WorkingHours({
  schedule,
  fallbackText,
}: {
  schedule: BookingSchedule | undefined;
  fallbackText?: string;
}) {
  const [open, setOpen] = useState(false);

  const hasSchedule = Boolean(schedule?.enabled && schedule.days);
  if (!hasSchedule) {
    if (!fallbackText) return null;
    return (
      <li className="flex items-start gap-2 text-foreground">
        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>{fallbackText}</span>
      </li>
    );
  }

  const now = new Date();
  const todayIndex = now.getDay();
  // Разовый выходной (праздник, отпуск) перекрывает обычные часы дня.
  const closedToday = isClosedDate(schedule, isoDate(now));
  const todayHours = closedToday ? null : schedule!.days[String(todayIndex)];
  const state = openState(schedule);
  const closedAhead = upcomingClosedDates(schedule, now).filter((d) => d !== isoDate(now));

  return (
    <li className="text-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 text-left"
      >
        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="font-medium">
              {todayHours?.open && todayHours?.close
                ? `Сегодня ${todayHours.open}–${todayHours.close}`
                : closedToday
                  ? "Сегодня закрыто"
                  : "Сегодня выходной"}
            </span>
            {state.open ? <span className="text-xs font-medium text-success">открыто</span> : null}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {open ? "Скрыть неделю" : "Показать всю неделю"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul className="mt-2 space-y-1 border-l border-border pl-4 text-sm">
          {WEEK_ORDER.map((day) => {
            const hours = schedule!.days[String(day)];
            const isToday = day === todayIndex;
            return (
              <li
                key={day}
                className={cn(
                  "flex items-center justify-between gap-3",
                  isToday ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                <span>{WEEKDAY_FULL[day]}</span>
                <span className="tabular-nums">
                  {hours?.open && hours?.close ? `${hours.open}–${hours.close}` : "выходной"}
                </span>
              </li>
            );
          })}
          {closedAhead.length > 0 ? (
            <li className="pt-1 text-xs text-muted-foreground">
              Закрыто: {closedAhead.slice(0, 5).map(closedDateLabel).join(", ")}
              {closedAhead.length > 5 ? ` и ещё ${closedAhead.length - 5}` : ""}
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}
