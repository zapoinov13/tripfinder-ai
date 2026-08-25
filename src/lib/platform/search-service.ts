import { useMemo } from "react";

import {
  buildTourSearchHaystack,
  filterTours,
  rankingScore,
  sortTours,
  textRelevanceScore,
  type SearchParams,
  type SortKey,
  validateSearchParams,
} from "@/lib/search";
import type { Tour } from "@/data/demo";

import { getActiveTours, getHotel, trackEvent } from "./catalog";
import { usePlatformSelector } from "./hooks";
import { expireStalePromotions } from "./promotions";
import { getState } from "./store";
import type { PlatformTour } from "./types";

export type SearchResult = PlatformTour & { finalScore: number };

export class SearchService {
  /** Чистая функция: вызывается во время рендера, поэтому стор здесь не меняем. */
  search(raw: Partial<SearchParams> | Record<string, unknown>): SearchResult[] {
    const params = validateSearchParams(raw as Record<string, unknown>);

    const weights = getState().config.rankingWeights;
    const source = getActiveTours().filter((t) => t.status === "active");

    const flexible = (raw as { flexibleDates?: boolean }).flexibleDates !== false;
    let filtered = filterTours(params, source as Tour[]);
    if (!flexible && params.dateStart) {
      filtered = filtered.filter((t) => {
        const dep = t.departure;
        const start = params.dateStart;
        const end = params.dateEnd || params.dateStart;
        return dep >= shift(start, -1) && dep <= shift(end, 1);
      });
    }

    expireStalePromotions();
    const now = Date.now();
    const promos = getState().promotions.filter(
      (p) => p.status === "ACTIVE" && new Date(p.expiresAt).getTime() > now,
    );

    const withPromo = filtered.map((tour) => {
      const promo = promos.find((p) => p.tourOfferId === tour.id);
      if (!promo) return tour;
      const tags = new Set(tour.tags);
      if (promo.type === "SPONSORED" || promo.type === "HOME_FEATURE") tags.add("sponsored");
      if (promo.type === "PREMIUM_PLACEMENT" || promo.type === "FEATURED") tags.add("premium");
      if (promo.type === "BOOST") tags.add("best");
      return { ...tour, tags: Array.from(tags) } as PlatformTour;
    });

    const query = params.q.trim();
    const useTextRank =
      query.length > 0 && (params.sort === "match" || params.sort === "recommended");

    const scored = withPromo.map((t) => {
      const hotel = getHotel(t.hotelId);
      const haystack = buildTourSearchHaystack(t as Tour, hotel);
      const base = rankingScore(t as Tour) * averageWeight(weights);
      const textBoost = query ? textRelevanceScore(haystack, query) : 0;
      return {
        tour: t as PlatformTour,
        finalScore: base + (useTextRank ? textBoost * 1.4 : 0),
      };
    });

    if (useTextRank) {
      return scored
        .sort((a, b) => b.finalScore - a.finalScore)
        .map(({ tour, finalScore }) => ({ ...tour, finalScore }));
    }

    const sorted = sortTours(
      scored.map((s) => s.tour) as Tour[],
      params.sort as SortKey,
    ) as PlatformTour[];

    return sorted.map((t) => {
      const hit = scored.find((s) => s.tour.id === t.id);
      return { ...t, finalScore: hit?.finalScore ?? rankingScore(t as Tour) };
    });
  }

  /** Аналитика поиска: отдельным вызовом из эффекта или обработчика. */
  trackSearch(
    raw: Partial<SearchParams> | Record<string, unknown>,
    count: number,
    userId?: string,
  ) {
    trackEvent("SEARCH_COMPLETED", userId, {
      params: validateSearchParams(raw as Record<string, unknown>),
      count,
    });
  }

  getById(id: string) {
    return getActiveTours().find((t) => t.id === id);
  }
}

function averageWeight(w: Record<string, number>) {
  const vals = Object.values(w);
  return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
}

function shift(isoDate: string, days: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const searchService = new SearchService();

/** Реактивный поиск: пересчитывается после hydrate Supabase и правок каталога. */
export function useTourSearch(raw: Partial<SearchParams> | Record<string, unknown>) {
  const catalogKey = usePlatformSelector(
    (s) => `${s.tours.length}:${s.tours.map((t) => `${t.id}:${t.price}:${t.status}`).join("|")}`,
  );
  // Вызывающие пересоздают raw на каждом рендере, поэтому сравниваем по
  // сериализации; парсим ключ обратно, чтобы список зависимостей был полным.
  const rawKey = JSON.stringify(raw);
  return useMemo(
    () => searchService.search(JSON.parse(rawKey) as Partial<SearchParams>),
    // catalogKey намеренно в зависимостях: search() читает каталог из стора
    // напрямую, и ключ форсирует пересчёт после hydrate/правок каталога.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogKey, rawKey],
  );
}

export { getHotel };
