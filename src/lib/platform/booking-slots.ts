import { getState } from "./store";
import type { BookingSchedule, Organization, ServiceRequest } from "./types";

export const WEEKDAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
export const WEEKDAY_FULL = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
] as const;

/** Слоты по умолчанию: будни 09:00–21:00, выходные 10:00–18:00. */
export function defaultSchedule(): BookingSchedule {
  return {
    enabled: true,
    slotMinutes: 60,
    capacity: 1,
    horizonDays: 30,
    days: {
      "0": { open: "10:00", close: "18:00" },
      "1": { open: "09:00", close: "21:00" },
      "2": { open: "09:00", close: "21:00" },
      "3": { open: "09:00", close: "21:00" },
      "4": { open: "09:00", close: "21:00" },
      "5": { open: "09:00", close: "21:00" },
      "6": { open: "10:00", close: "18:00" },
    },
  };
}

/** Расписание включено и хотя бы один день открыт. */
export function scheduleActive(org: Organization | undefined): boolean {
  const s = org?.bookingSchedule;
  if (!s?.enabled) return false;
  return Object.values(s.days ?? {}).some((d) => d && d.open && d.close);
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":");
  return (Number(h) || 0) * 60 + (Number(m) || 0);
};

const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** YYYY-MM-DD в локальной зоне (Date.toISOString сдвигает дату). */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Все слоты дня по расписанию, без учёта занятости. */
export function slotsForDate(schedule: BookingSchedule, date: string): string[] {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return [];
  const hours = schedule.days?.[String(parsed.getDay())];
  if (!hours?.open || !hours?.close) return [];

  const step = Math.max(15, schedule.slotMinutes || 60);
  const start = toMinutes(hours.open);
  const end = toMinutes(hours.close);
  const out: string[] = [];
  for (let t = start; t + step <= end; t += step) out.push(toHHMM(t));
  return out;
}

/** Занятость слота: активные заявки (новые и подтверждённые) на это время. */
function takenAt(requests: ServiceRequest[], date: string, time: string) {
  return requests.filter(
    (r) => r.date === date && r.time === time && (r.status === "NEW" || r.status === "CONFIRMED"),
  ).length;
}

export type SlotOption = { time: string; left: number; full: boolean };

/**
 * Слоты дня с остатком мест. Прошедшее время сегодня отсекаем:
 * записаться на 10:00, когда уже полдень, нельзя.
 */
export function availableSlots(
  org: Organization,
  date: string,
  now: Date = new Date(),
): SlotOption[] {
  const schedule = org.bookingSchedule;
  if (!schedule?.enabled) return [];

  const requests = getState().serviceRequests.filter((r) => r.organizationId === org.id);
  const capacity = Math.max(1, schedule.capacity || 1);
  const isToday = date === isoDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return slotsForDate(schedule, date)
    .filter((time) => !isToday || toMinutes(time) > nowMinutes)
    .map((time) => {
      const left = capacity - takenAt(requests, date, time);
      return { time, left: Math.max(0, left), full: left <= 0 };
    });
}

/** Ближайшие даты, когда компания работает и есть свободные слоты. */
export function bookableDates(org: Organization, now: Date = new Date()): string[] {
  const schedule = org.bookingSchedule;
  if (!schedule?.enabled) return [];
  const horizon = Math.min(120, Math.max(1, schedule.horizonDays || 30));
  const out: string[] = [];
  for (let i = 0; i < horizon; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const date = isoDate(day);
    if (availableSlots(org, date, now).some((s) => !s.full)) out.push(date);
  }
  return out;
}

/** Человеческое описание часов работы из расписания. */
export function scheduleSummary(schedule: BookingSchedule | undefined): string {
  if (!schedule?.enabled) return "";
  const parts: string[] = [];
  for (let day = 1; day <= 7; day++) {
    const key = String(day % 7);
    const hours = schedule.days?.[key];
    parts.push(
      hours?.open && hours?.close
        ? `${WEEKDAY_LABELS[day % 7]} ${hours.open}–${hours.close}`
        : `${WEEKDAY_LABELS[day % 7]} выходной`,
    );
  }
  return parts.join(" · ");
}
