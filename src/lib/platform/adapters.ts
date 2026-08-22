import type {
  NormalizedTourOffer,
  PaymentProvider,
  TourOperatorAdapter,
} from "@/lib/platform-contracts";
import { getTour } from "./catalog";
import { planAllowsLivePrice } from "./plans";
import {
  applySupplierFeed,
  parseSupplierFeed,
  parseSupplierFeedJson,
  SUPPLIER_FEED_EXAMPLE,
} from "./supplier-feed";
import { getState, nowIso, setState, uid } from "./store";
import type { PlatformTour } from "./types";

export class MockOperatorAdapter implements TourOperatorAdapter {
  constructor(private organizationId: string) {}

  async connect(): Promise<void> {
    await delay(200);
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    await delay(300);
    const org = getState().organizations.find((o) => o.id === this.organizationId);
    if (org?.status === "SUSPENDED") {
      return { ok: false, message: "Поставщик приостановлен" };
    }
    return { ok: true, message: "API поставщика доступен" };
  }

  async getDestinations() {
    await delay(100);
    return getState().destinations.map((d) => ({
      externalId: d.id,
      name: `${d.country} · ${d.city}`,
    }));
  }

  async getHotels(destinationExternalId: string) {
    await delay(100);
    return getState()
      .hotels.filter((h) => h.destinationId === destinationExternalId)
      .map((h) => ({ externalId: h.id, name: h.name }));
  }

  async getTours(): Promise<NormalizedTourOffer[]> {
    await delay(250);
    return getState()
      .tours.filter((t) => t.operatorOrgId === this.organizationId)
      .map(toNormalized);
  }

  async getAvailability(externalTourId: string) {
    await delay(150);
    const tour = findByExternal(externalTourId);
    if (!tour) return { available: false, seats: 0 };
    return {
      available: tour.availability > 0 && tour.status === "active",
      seats: tour.availability,
    };
  }

  async getPrices(externalTourId: string) {
    await delay(150);
    const tour = findByExternal(externalTourId);
    if (!tour) throw new Error("Tour not found");
    const org = getState().organizations.find((o) => o.id === this.organizationId);
    // Live reprice (Pro): slight jitter simulates supplier quote. Otherwise return cached price.
    if (planAllowsLivePrice(org?.planCode)) {
      const jitter = Math.round(((Math.random() * 2 - 1) * 5000) / 1000) * 1000;
      return { price: Math.max(100000, tour.price + jitter), currency: tour.currency };
    }
    return { price: tour.price, currency: tour.currency };
  }

  async createBooking(externalTourId: string, _payload: unknown) {
    await delay(400);
    const tour = findByExternal(externalTourId);
    if (!tour || tour.availability <= 0) throw new Error("Not available");
    setState((s) => ({
      ...s,
      tours: s.tours.map((t) =>
        t.id === tour.id ? { ...t, availability: Math.max(0, t.availability - 1) } : t,
      ),
    }));
    return { externalBookingId: uid() };
  }

  async getBookingStatus(externalBookingId: string) {
    await delay(100);
    const booking = getState().bookings.find((b) => b.externalBookingId === externalBookingId);
    return booking?.status ?? "UNKNOWN";
  }

  async cancelBooking(externalBookingId: string) {
    await delay(200);
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) =>
        b.externalBookingId === externalBookingId
          ? { ...b, status: "CANCELLED" as const, updatedAt: nowIso() }
          : b,
      ),
    }));
    return { cancelled: true };
  }

  /**
   * Sync catalog from TourGo Supplier Feed (JSON URL or pasted body).
   * Prefer Edge Function proxy when CORS blocks direct fetch.
   */
  async sync(options?: { fail?: boolean; feedJson?: string; useExample?: boolean }) {
    await delay(200);
    const conn = getState().apiConnections.find((c) => c.organizationId === this.organizationId);

    const failLog = (message: string) => {
      const log = {
        id: uid(),
        organizationId: this.organizationId,
        status: "error" as const,
        toursImported: 0,
        toursUpdated: 0,
        toursRemoved: 0,
        message,
        createdAt: nowIso(),
      };
      setState((s) => ({
        ...s,
        syncLogs: [log, ...s.syncLogs],
        apiConnections: s.apiConnections.map((c) =>
          c.organizationId === this.organizationId
            ? { ...c, status: "error" as const, lastError: message, lastSyncAt: nowIso() }
            : c,
        ),
      }));
      return log;
    };

    if (options?.fail) {
      return failLog("Поставщик не ответил за отведённое время");
    }

    let parsed =
      options?.feedJson !== undefined
        ? parseSupplierFeedJson(options.feedJson)
        : options?.useExample
          ? parseSupplierFeed(SUPPLIER_FEED_EXAMPLE)
          : null;

    if (!parsed && conn?.endpoint) {
      try {
        const raw = await fetchSupplierFeed(conn.endpoint, conn.apiKey, conn.secret, conn.authType);
        parsed = parseSupplierFeed(raw);
      } catch (err) {
        return failLog(err instanceof Error ? err.message : "Не удалось загрузить feed");
      }
    }

    if (!parsed) {
      return failLog("Укажите URL feed или вставьте JSON каталога");
    }

    if (!parsed.doc.tours.length) {
      return failLog(parsed.errors[0] ?? "В feed нет валидных туров");
    }

    const result = applySupplierFeed(this.organizationId, parsed.doc);
    const status =
      result.errors.length && (result.imported || result.updated) ? "partial" : "success";
    const message = [
      `Импорт: +${result.imported}, обновлено ${result.updated}`,
      result.archived ? `снято ${result.archived}` : null,
      result.errors.length ? `замечаний: ${result.errors.length}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const log = {
      id: uid(),
      organizationId: this.organizationId,
      status: status as "success" | "partial",
      toursImported: result.imported,
      toursUpdated: result.updated,
      toursRemoved: result.archived,
      message,
      createdAt: nowIso(),
    };

    setState((s) => ({
      ...s,
      syncLogs: [log, ...s.syncLogs],
      apiConnections: s.apiConnections.map((c) => {
        if (c.organizationId !== this.organizationId) return c;
        const { lastError: _drop, ...rest } = c;
        return {
          ...rest,
          status: "connected" as const,
          lastSyncAt: nowIso(),
          ...(result.errors.length ? { lastError: result.errors[0] } : {}),
        };
      }),
    }));
    return log;
  }
}

async function fetchSupplierFeed(
  endpoint: string,
  apiKey: string,
  secret: string,
  authType: "api_key" | "basic" | "bearer",
): Promise<unknown> {
  const resolved =
    endpoint.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${endpoint}`
      : endpoint;

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (base && anon && /^https?:\/\//i.test(resolved)) {
    try {
      const res = await fetch(`${base}/functions/v1/sync-supplier-feed`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anon}`,
          apikey: anon,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: resolved, apiKey, secret, authType }),
      });
      if (res.ok) {
        const body = (await res.json()) as { ok?: boolean; data?: unknown; error?: string };
        if (body.ok && body.data !== undefined) return body.data;
        if (body.error) throw new Error(body.error);
      }
    } catch {
      /* fall through to direct fetch */
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (authType === "bearer" && apiKey) headers.Authorization = `Bearer ${apiKey}`;
  else if (authType === "basic" && apiKey) {
    headers.Authorization = `Basic ${btoa(`${apiKey}:${secret}`)}`;
  } else if (apiKey) {
    headers["X-Api-Key"] = apiKey;
    if (secret) headers["X-Api-Secret"] = secret;
  }

  const res = await fetch(resolved, { headers });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  return res.json();
}

function findByExternal(externalTourId: string): PlatformTour | undefined {
  return (
    getState().tours.find((t) => t.externalId === externalTourId) ||
    getState().tours.find((t) => t.id === externalTourId)
  );
}

function toNormalized(t: PlatformTour): NormalizedTourOffer {
  return {
    ...t,
    externalId: t.externalId,
    roomType: t.roomType,
    currency: t.currency,
    availability: t.availability,
    lastSyncedAt: t.lastSyncedAt,
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: {
    amount: number;
    currency: string;
    type:
      | "premium_subscription"
      | "operator_subscription"
      | "tour_package"
      | "promotion"
      | "advertising"
      | "booking";
    metadata?: Record<string, unknown>;
  }) {
    await delay(250);
    const providerPaymentId = uid();
    return { providerPaymentId };
  }

  async getPaymentStatus(providerPaymentId: string) {
    await delay(100);
    const payment = getState().payments.find((p) => p.providerPaymentId === providerPaymentId);
    return payment?.status ?? "paid";
  }
}

export const mockPaymentProvider = new MockPaymentProvider();

export function getAdapterForOrg(organizationId: string) {
  return new MockOperatorAdapter(organizationId);
}

export function getAdapterForTour(tourId: string) {
  const tour = getTour(tourId);
  if (!tour) throw new Error("Tour not found");
  return new MockOperatorAdapter(tour.operatorOrgId);
}
