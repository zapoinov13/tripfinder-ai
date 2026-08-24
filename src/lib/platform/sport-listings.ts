import type { SportOfferDraft } from "./service-ingest";

const KEY = "tourgo:sport-listings-v1";

export type SportListing = SportOfferDraft & {
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

function readAll(): SportListing[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SportListing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(next: SportListing[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeSportListings(onChange: Listener) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function listPublishedSports(): SportListing[] {
  return readAll().filter((x) => x.status === "published");
}

export function listOrgSports(organizationId: string): SportListing[] {
  return readAll().filter((x) => x.organizationId === organizationId);
}

export function publishSportListing(input: {
  organizationId: string;
  companyName: string;
  draft: SportOfferDraft;
}): SportListing {
  const item: SportListing = {
    ...input.draft,
    id: `sport-${Date.now().toString(36)}`,
    organizationId: input.organizationId,
    companyName: input.companyName,
    status: "published",
    createdAt: new Date().toISOString(),
  };
  writeAll([item, ...readAll()]);
  return item;
}

export function hideSportListing(id: string, organizationId: string) {
  writeAll(
    readAll().map((x) =>
      x.id === id && x.organizationId === organizationId ? { ...x, status: "hidden" as const } : x,
    ),
  );
}
