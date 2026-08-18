import {
  filterTours,
  rankingScore,
  sortTours,
  type SearchParams,
  type SortKey,
  validateSearchParams,
} from "@/lib/search";
import type { Tour } from "@/data/demo";

import { getActiveTours, getHotel, trackEvent } from "./catalog";
import { getState } from "./store";
import type { PlatformTour } from "./types";

export type SearchResult = PlatformTour & { finalScore: number };

type SearchOptions = {
  track?: boolean;
};

export class SearchService {
  search(
    raw: Partial<SearchParams> | Record<string, unknown>,
    userId?: string,
    options: SearchOptions = {},
  ): SearchResult[] {
    const params = validateSearchParams(raw as Record<string, unknown>);
    if (options.track) trackEvent("SEARCH_STARTED", userId, { params });

    const weights = getState().config.rankingWeights;
    const source = getActiveTours().filter((t) => {
      // stale offers: older than 14 days sync not shown as active-fresh — keep but ok for MVP
      return t.status === "active";
    });

    // Apply flexible dates: if flexibleDates true (±7 already in filter); if false, exact-ish ±1
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

    // Expire promotions into tags
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

    const sorted = sortTours(withPromo as Tour[], params.sort as SortKey) as PlatformTour[];
    const results = sorted.map((t) => ({
      ...t,
      finalScore: rankingScore(t as Tour) * averageWeight(weights),
    }));

    if (options.track) trackEvent("SEARCH_COMPLETED", userId, { count: results.length });
    return results;
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

export { getHotel };
