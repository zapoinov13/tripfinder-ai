import { formatPrice } from "@/data/demo";
import type { VerticalListing } from "@/lib/platform/vertical-listings";
import { seo, type SeoInput } from "@/lib/seo";
import { VERTICAL_SEO, vitrineDescription, vitrineTitle, type Vertical } from "@/lib/seo-keywords";

/**
 * Мета-теги витрины считаются от того, что на ней реально лежит.
 *
 * Раздел с фильтрами — это десятки адресов с одинаковым заголовком:
 * `/sport`, `/sport?city=Дубай`, `/sport?kind=padel&city=Дубай`. Поисковик
 * видит дубли и выбирает из них сам — обычно не ту, что нужна. Здесь у каждой
 * комбинации свой заголовок с городом, категорией и живым числом предложений.
 *
 * И обратное правило, важнее первого: комбинация, под которой почти ничего
 * нет, в индекс не идёт. Страницы «под запрос», собранные из пустоты, —
 * это дорвеи, за них понижают весь сайт. Такие адреса помечаются noindex, а
 * canonical ведёт на чистый раздел, где предложения есть.
 */

/** Ниже этого числа фильтр не образует самостоятельной страницы. */
const MIN_INDEXABLE = 3;

export type VitrineFilters = {
  city?: string | undefined;
  kind?: string | undefined;
  destination?: string | undefined;
};

export type VitrineSeoInput = {
  vertical: Vertical;
  /** Чистый адрес раздела: «/sport». */
  path: string;
  listings: Pick<VerticalListing, "city" | "destinationId" | "kind" | "price">[];
  filters: VitrineFilters;
  /** Человеческое имя категории: «Падел» вместо «padel». */
  kindLabel?: string | undefined;
};

/** Адрес с фильтрами: тот же порядок параметров, что строит навигация. */
function filteredPath(path: string, filters: VitrineFilters): string {
  const query = new URLSearchParams();
  if (filters.destination) query.set("destination", filters.destination);
  if (filters.city) query.set("city", filters.city);
  if (filters.kind) query.set("kind", filters.kind);
  const tail = query.toString();
  return tail ? `${path}?${tail}` : path;
}

export function vitrineSeo(input: VitrineSeoInput): ReturnType<typeof seo> {
  const { vertical, path, listings, filters, kindLabel } = input;

  const matching = listings.filter((item) => {
    if (filters.destination && item.destinationId !== filters.destination) return false;
    if (filters.city && item.city !== filters.city) return false;
    if (filters.kind && item.kind !== filters.kind) return false;
    return true;
  });

  const prices = matching.map((item) => item.price).filter((price) => price > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;

  const hasFilters = Boolean(filters.city || filters.kind || filters.destination);
  const thin = hasFilters && matching.length < MIN_INDEXABLE;

  const meta = VERTICAL_SEO[vertical];
  const base = vitrineTitle(vertical, filters.city, matching.length);
  const title = kindLabel && filters.kind ? `${kindLabel}: ${base.toLowerCase()}` : base;

  const seoInput: SeoInput = {
    title,
    description: vitrineDescription(
      vertical,
      filters.city,
      minPrice > 0 ? formatPrice(minPrice) : undefined,
    ),
    // Тонкая комбинация ведёт весом на чистый раздел, а не размывает его.
    path: thin ? path : filteredPath(path, filters),
    ...(thin ? { noindex: true } : {}),
  };

  return seo(seoInput);
}

/** Ключевые слова раздела — для внутреннего поиска и подсказок. */
export function verticalKeywords(vertical: Vertical): string[] {
  return VERTICAL_SEO[vertical].keywords;
}
