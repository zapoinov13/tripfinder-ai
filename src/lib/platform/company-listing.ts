import { companyCategories, type CompanyCategoryId } from "./company-categories";
import { appendAudit } from "./catalog";
import { setState } from "./store";
import type { Organization } from "./types";
import { publishVerticalListing } from "./vertical-listings";
import type { VerticalOfferDraft } from "./service-ingest";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `org-${Date.now().toString(36)}`;

/**
 * Платформа заводит карточку компании сама.
 *
 * Витрины наполняются раньше, чем приходят партнёры: админ вставляет ссылку на
 * реальное место, и оно появляется в поиске. Компания создаётся сразу
 * одобренной — иначе её никто не увидит, — но с пометкой listedByPlatform:
 * туристу видно, что владелец страницу ещё не подтвердил, и что записи там
 * может никто не принять.
 */
export function listCompanyFromLink(input: {
  actorId: string;
  category: CompanyCategoryId;
  name: string;
  city: string;
  about?: string;
  phone?: string;
  website?: string;
  listing?: VerticalOfferDraft;
}): Organization {
  const now = new Date().toISOString();
  const category = companyCategories.find((c) => c.id === input.category);

  const organization: Organization = {
    id: uid(),
    name: input.name,
    legalName: input.name,
    registrationNumber: "",
    country: "ОАЭ",
    city: input.city,
    address: "",
    phone: input.phone ?? "",
    email: "",
    website: input.website ?? "",
    contactPerson: "",
    status: "APPROVED",
    planCode: "START",
    additionalTourLimit: 0,
    advertisingBalance: 0,
    promotionBalance: 0,
    createdAt: now,
    // Одна услуга из категории: партнёр уточнит список, когда заберёт страницу.
    services: category?.services.slice(0, 1) ?? [],
    countries: ["ОАЭ"],
    clientCountries: ["Казахстан"],
    languages: ["Русский"],
    about: input.about ?? "",
    photos: input.listing?.photos ?? [],
    listedByPlatform: true,
  };

  setState((s) => ({ ...s, organizations: [organization, ...s.organizations] }));

  if (input.listing) {
    publishVerticalListing({
      organizationId: organization.id,
      companyName: organization.name,
      draft: input.listing,
    });
  }

  appendAudit({
    actorId: input.actorId,
    action: "company_listed_by_platform",
    entityType: "organization",
    entityId: organization.id,
    meta: { category: input.category, withListing: Boolean(input.listing) },
  });

  return organization;
}

/** Карточки, заведённые платформой: владелец их ещё не подтвердил. */
export function isListedByPlatform(org: Organization | undefined): boolean {
  return org?.listedByPlatform === true;
}
