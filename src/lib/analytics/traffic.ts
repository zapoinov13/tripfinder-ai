/**
 * Чтение посещаемости: цифры считает база, здесь только запрос и типы.
 *
 * Складывать десятки тысяч просмотров в браузере админа было бы медленно и
 * бессмысленно — за этим в `public.traffic_stats` уходит один запрос, который
 * возвращает уже готовую сводку.
 */
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type TrafficSlice = { key: string; sessions: number; source?: string };
export type TrafficPage = { key: string; visits: number; sessions: number };
export type TrafficDay = { day: string; visits: number; sessions: number };

export type TrafficStats = {
  days: number;
  /** Просмотры страниц. */
  visits: number;
  /** Уникальные браузеры за период. */
  visitors: number;
  /** Визиты: заходы с перерывом больше получаса считаются разными. */
  sessions: number;
  prevVisits: number;
  prevVisitors: number;
  prevSessions: number;
  /** Визиты, в которых человек посмотрел ровно одну страницу. */
  bounces: number;
  sources: TrafficSlice[];
  refs: TrafficSlice[];
  campaigns: TrafficSlice[];
  pages: TrafficPage[];
  entryPages: TrafficSlice[];
  devices: TrafficSlice[];
  byDay: TrafficDay[];
};

export type TrafficResult =
  | { state: "ok"; stats: TrafficStats }
  /** Запрос из supabase/TRAFFIC.sql ещё не применён к базе. */
  | { state: "needs-sql" }
  | { state: "offline" }
  | { state: "error"; reason: string };

/** Postgres: функции с таким именем нет. Это не поломка, а «SQL ещё не применён». */
const UNDEFINED_FUNCTION = "42883";

export async function fetchTrafficStats(days: number): Promise<TrafficResult> {
  if (!isSupabaseConfigured) return { state: "offline" };
  const sb = getSupabase();
  if (!sb) return { state: "offline" };

  const { data, error } = await sb.rpc("traffic_stats", { p_days: days });
  if (error) {
    if (error.code === UNDEFINED_FUNCTION || /traffic_stats/.test(error.message)) {
      return { state: "needs-sql" };
    }
    return { state: "error", reason: error.message };
  }
  if (!data) return { state: "error", reason: "База вернула пустой ответ" };
  return { state: "ok", stats: data as TrafficStats };
}

/** Русские названия источников: «direct» в отчёте владельцу не нужен. */
export const SOURCE_LABEL: Record<string, string> = {
  search: "Поисковики",
  social: "Соцсети",
  ad: "Реклама",
  referral: "Переходы с сайтов",
  direct: "Прямые заходы",
  internal: "Внутренние переходы",
};

export const DEVICE_LABEL: Record<string, string> = {
  mobile: "Телефон",
  tablet: "Планшет",
  desktop: "Компьютер",
};

/** Доля отказов, %. Без визитов доли нет — возвращаем null, а не ноль. */
export function bounceRate(stats: TrafficStats): number | null {
  if (stats.sessions === 0) return null;
  return Math.round((stats.bounces / stats.sessions) * 100);
}

/** Сколько страниц смотрят за визит. */
export function pagesPerSession(stats: TrafficStats): number | null {
  if (stats.sessions === 0) return null;
  return Math.round((stats.visits / stats.sessions) * 10) / 10;
}
