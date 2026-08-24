import type { VerticalId, VerticalOfferDraft } from "./service-ingest";

const KEY = "tourgo:vertical-listings-v1";
const LEGACY_SPORT_KEY = "tourgo:sport-listings-v1";

export type VerticalListing = VerticalOfferDraft & {
  id: string;
  organizationId: string;
  companyName: string;
  status: "published" | "hidden";
  createdAt: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function migrateLegacySports(): VerticalListing[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(LEGACY_SPORT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      vertical: "sport" as const,
      id: String(item.id ?? `sport-${Date.now().toString(36)}`),
      organizationId: String(item.organizationId ?? ""),
      companyName: String(item.companyName ?? ""),
      name: String(item.name ?? ""),
      city: String(item.city ?? ""),
      destinationId: String(item.destinationId ?? "uae"),
      kind: String(item.kind ?? "gym"),
      price: Number(item.price) || 0,
      area: String(item.area ?? ""),
      detail: String(item.slot ?? item.detail ?? ""),
      sourceUrl: String(item.sourceUrl ?? ""),
      about: String(item.about ?? ""),
      photos: Array.isArray(item.photos) ? (item.photos as string[]) : [],
      status: item.status === "hidden" ? ("hidden" as const) : ("published" as const),
      createdAt: String(item.createdAt ?? new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

function readAll(): VerticalListing[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VerticalListing[];
      return Array.isArray(parsed) ? parsed : [];
    }
    const legacy = migrateLegacySports();
    if (legacy.length) writeAll(legacy);
    return legacy;
  } catch {
    return [];
  }
}

function writeAll(next: VerticalListing[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeVerticalListings(onChange: Listener) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function listPublishedVertical(vertical: VerticalId): VerticalListing[] {
  return readAll().filter((x) => x.vertical === vertical && x.status === "published");
}

export function listOrgVertical(organizationId: string, vertical?: VerticalId): VerticalListing[] {
  return readAll().filter(
    (x) => x.organizationId === organizationId && (!vertical || x.vertical === vertical),
  );
}

export function publishVerticalListing(input: {
  organizationId: string;
  companyName: string;
  draft: VerticalOfferDraft;
}): VerticalListing {
  const item: VerticalListing = {
    ...input.draft,
    id: `${input.draft.vertical}-${Date.now().toString(36)}`,
    organizationId: input.organizationId,
    companyName: input.companyName,
    status: "published",
    createdAt: new Date().toISOString(),
  };
  writeAll([item, ...readAll()]);
  return item;
}

export function hideVerticalListing(id: string, organizationId: string) {
  writeAll(
    readAll().map((x) =>
      x.id === id && x.organizationId === organizationId ? { ...x, status: "hidden" as const } : x,
    ),
  );
}

/** Back-compat wrappers for sport module imports */
export const subscribeSportListings = subscribeVerticalListings;
export function listPublishedSports() {
  return listPublishedVertical("sport");
}
export function listOrgSports(organizationId: string) {
  return listOrgVertical(organizationId, "sport");
}
export function publishSportListing(input: {
  organizationId: string;
  companyName: string;
  draft: { name: string; city: string; destinationId: string; kind: string; price: number; area: string; slot?: string; detail?: string; sourceUrl: string; about: string; photos: string[] };
}) {
  return publishVerticalListing({
    organizationId: input.organizationId,
    companyName: input.companyName,
    draft: {
      vertical: "sport",
      name: input.draft.name,
      city: input.draft.city,
      destinationId: input.draft.destinationId,
      kind: input.draft.kind,
      price: input.draft.price,
      area: input.draft.area,
      detail: input.draft.detail ?? input.draft.slot ?? "",
      sourceUrl: input.draft.sourceUrl,
      about: input.draft.about,
      photos: input.draft.photos,
    },
  });
}
export const hideSportListing = hideVerticalListing;
