import { getState } from "./store";
import type { Organization } from "./types";
import { listPublishedVertical } from "./vertical-listings";
import type { VerticalListing } from "./vertical-listings";
import { categoriesOfServices } from "./company-categories";
import { matchesQuery } from "@/lib/search-text";

export type BusinessHit = {
  company: Organization;
  /** Объявления компании, попавшие под запрос. */
  listings: VerticalListing[];
  /** Минимальная цена среди найденных услуг. */
  fromPrice: number;
};

const norm = (v: string) => v.toLowerCase().trim();

/** Все опубликованные объявления платформы. */
function allPublished(): VerticalListing[] {
  return [
    ...listPublishedVertical("sport"),
    ...listPublishedVertical("stay"),
    ...listPublishedVertical("car"),
  ];
}

/**
 * Поиск по компаниям и их услугам.
 *
 * Туровый поиск живёт отдельно и работает по своим правилам — здесь
 * только бизнесы: зал, прокат, посуточная аренда.
 */
export function searchBusinesses(query: string, city?: string): BusinessHit[] {
  const needle = norm(query ?? "");
  const cityNeedle = norm(city ?? "");
  if (!needle && !cityNeedle) return [];

  const state = getState();
  const approved = state.organizations.filter((o) => o.status === "APPROVED");
  const listings = allPublished();

  const hits = new Map<string, BusinessHit>();
  const add = (company: Organization, listing?: VerticalListing) => {
    const hit = hits.get(company.id) ?? { company, listings: [], fromPrice: 0 };
    if (listing && !hit.listings.some((l) => l.id === listing.id)) hit.listings.push(listing);
    hits.set(company.id, hit);
  };

  for (const listing of listings) {
    const company = approved.find((o) => o.id === listing.organizationId);
    if (!company) continue;
    if (cityNeedle && norm(listing.city) !== cityNeedle && norm(company.city) !== cityNeedle) {
      continue;
    }
    if (!needle) {
      add(company, listing);
      continue;
    }
    if (
      matchesQuery(
        `${listing.name} ${listing.kind} ${listing.city} ${listing.area} ${listing.companyName}`,
        needle,
      )
    ) {
      add(company, listing);
    }
  }

  // Компания могла совпасть названием или услугой, даже без подходящих карточек.
  for (const company of approved) {
    if (cityNeedle && norm(company.city) !== cityNeedle) continue;
    const services = company.services ?? [];
    const cats = categoriesOfServices(services);
    const isBusiness = cats.has("sport") || cats.has("stays") || cats.has("cars");
    if (!isBusiness) continue;
    if (!needle) continue;
    if (matchesQuery(`${company.name} ${services.join(" ")} ${company.city}`, needle)) {
      add(company);
    }
  }

  return [...hits.values()]
    .map((hit) => {
      const prices = hit.listings.map((l) => l.price).filter((p) => p > 0);
      return { ...hit, fromPrice: prices.length ? Math.min(...prices) : 0 };
    })
    .sort(
      (a, b) =>
        b.listings.length - a.listings.length || a.company.name.localeCompare(b.company.name),
    );
}
