import type { NormalizedTourOffer, PaymentProvider, TourOperatorAdapter } from "@/lib/platform-contracts";
import { getTour } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";
import type { PlatformTour } from "./types";

export class MockOperatorAdapter implements TourOperatorAdapter {
  constructor(private organizationId: string) {}

  async connect(): Promise<void> {
    await delay(200);
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    await delay(300);
    // Simulate occasional failure for org ending with pending operator org
    const org = getState().organizations.find((o) => o.id === this.organizationId);
    if (org?.status === "SUSPENDED") {
      return { ok: false, message: "Organization suspended" };
    }
    return { ok: true, message: "Mock API connection OK" };
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
    return { available: tour.availability > 0 && tour.status === "active", seats: tour.availability };
  }

  async getPrices(externalTourId: string) {
    await delay(150);
    const tour = findByExternal(externalTourId);
    if (!tour) throw new Error("Tour not found");
    // slight price jitter for recheck realism
    const jitter = Math.round((Math.random() * 2 - 1) * 5000 / 1000) * 1000;
    return { price: Math.max(100000, tour.price + jitter), currency: tour.currency };
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

  /** Sync catalog from mock feed into platform store */
  async sync(options?: { fail?: boolean }) {
    await delay(500);
    if (options?.fail) {
      const log = {
        id: uid(),
        organizationId: this.organizationId,
        status: "error" as const,
        toursImported: 0,
        toursUpdated: 0,
        toursRemoved: 0,
        message: "Mock API timeout",
        createdAt: nowIso(),
      };
      setState((s) => ({
        ...s,
        syncLogs: [log, ...s.syncLogs],
        apiConnections: s.apiConnections.map((c) =>
          c.organizationId === this.organizationId
            ? { ...c, status: "error" as const, lastError: log.message, lastSyncAt: nowIso() }
            : c,
        ),
      }));
      return log;
    }

    let updated = 0;
    setState((s) => ({
      ...s,
      tours: s.tours.map((t) => {
        if (t.operatorOrgId !== this.organizationId) return t;
        updated += 1;
        return { ...t, lastSyncedAt: nowIso(), availability: Math.max(1, t.availability) };
      }),
        apiConnections: s.apiConnections.map((c) => {
          if (c.organizationId !== this.organizationId) return c;
          const { lastError: _drop, ...rest } = c;
          return { ...rest, status: "connected" as const, lastSyncAt: nowIso() };
        }),
    }));

    const log = {
      id: uid(),
      organizationId: this.organizationId,
      status: "success" as const,
      toursImported: 0,
      toursUpdated: updated,
      toursRemoved: 0,
      message: `Synced ${updated} tours`,
      createdAt: nowIso(),
    };
    setState((s) => ({ ...s, syncLogs: [log, ...s.syncLogs] }));
    return log;
  }
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
