import {
  applyAiRefinement,
  buildAiChips,
  parseTravelQuery,
  parsedQueryToSearch,
  type ParsedTravelQuery,
} from "@/lib/ai-search";
import type { Hotel, Tour } from "@/data/demo";

import { trackEvent } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";

export class AIParserService {
  parse(query: string): ParsedTravelQuery {
    trackEvent("AI_SEARCH_STARTED", getState().session?.userId, { query });
    return parseTravelQuery(query);
  }

  toSearchParams(parsed: ParsedTravelQuery) {
    return parsedQueryToSearch(parsed);
  }

  chips(parsed: ParsedTravelQuery) {
    return buildAiChips(parsed);
  }
}

export class AIConciergeService {
  refine(parsed: ParsedTravelQuery, message: string): ParsedTravelQuery {
    return applyAiRefinement(parsed, message);
  }
}

export class AIExplanationService {
  explain(tour: Tour, hotel: Hotel, criteria?: Partial<ParsedTravelQuery>): string[] {
    const reasons: string[] = [];
    if (criteria?.budgetMax && tour.price <= criteria.budgetMax) {
      reasons.push("Подходит под ваш бюджет");
    } else if (tour.price <= 1500000) {
      reasons.push("Подходит под средний бюджет");
    }
    if (tour.mealCode === "AI" || tour.mealCode === "UAI") {
      reasons.push(`Питание ${tour.meal}`);
    }
    if (hotel.beachLine === 1) reasons.push("Первая линия у моря");
    if (hotel.distanceToSea <= 150) reasons.push(`${hotel.distanceToSea} м до моря`);
    if (hotel.amenities.includes("Kids Club") || (criteria?.children ?? 0) > 0) {
      reasons.push("Подходит для семьи");
    }
    if (hotel.amenities.includes("Pool")) reasons.push("Есть бассейн");
    if (hotel.amenities.includes("Spa")) reasons.push("Spa на территории");
    if (tour.transfer) reasons.push("Трансфер включён");
    if (hotel.rating >= 9) reasons.push(`Рейтинг ${hotel.rating.toFixed(1)}`);
    if (!reasons.length) {
      reasons.push("Не удалось подтвердить дополнительные преимущества по доступным данным.");
    }
    return reasons.slice(0, 6);
  }
}

export class AIRecommendationService {
  summarizeCompare(tours: Array<{ tour: Tour; hotel: Hotel }>) {
    if (!tours.length) return [];
    const byPrice = [...tours].sort((a, b) => a.tour.price - b.tour.price)[0]!;
    const byHotel = [...tours].sort((a, b) => b.hotel.rating - a.hotel.rating)[0]!;
    const byFamily = [...tours].sort((a, b) => {
      const score = (h: Hotel) =>
        (h.amenities.includes("Kids Club") ? 2 : 0) + (h.amenities.includes("Pool") ? 1 : 0);
      return score(b.hotel) - score(a.hotel);
    })[0]!;
    const byValue = [...tours].sort((a, b) => {
      const va = a.hotel.rating / (a.tour.price / 1000000);
      const vb = b.hotel.rating / (b.tour.price / 1000000);
      return vb - va;
    })[0]!;

    return [
      { label: "Лучший по цене", tourId: byPrice.tour.id, hotel: byPrice.hotel.name },
      { label: "Лучший для семьи", tourId: byFamily.tour.id, hotel: byFamily.hotel.name },
      { label: "Лучший отель", tourId: byHotel.tour.id, hotel: byHotel.hotel.name },
      {
        label: "Лучшее соотношение цена/качество",
        tourId: byValue.tour.id,
        hotel: byValue.hotel.name,
      },
    ];
  }
}

export function saveAiSearch(
  userId: string,
  originalQuery: string,
  parsed: ParsedTravelQuery,
  resultsCount: number,
) {
  setState((s) => ({
    ...s,
    aiSearches: [
      {
        id: uid(),
        userId,
        originalQuery,
        parsed: parsed as unknown as Record<string, unknown>,
        searchParams: parsedQueryToSearch(parsed),
        resultsCount,
        createdAt: nowIso(),
      },
      ...s.aiSearches,
    ].slice(0, 100),
  }));
}

export const aiParserService = new AIParserService();
export const aiConciergeService = new AIConciergeService();
export const aiExplanationService = new AIExplanationService();
export const aiRecommendationService = new AIRecommendationService();
