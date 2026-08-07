import { toast } from "sonner";

import { appendAudit, trackEvent } from "./catalog";
import { getState, nowIso, setState, uid } from "./store";

export const COMPARE_LIMIT = 4;

const ANON = "anonymous";

function userKey() {
  return getState().session?.userId ?? ANON;
}

export function getFavorites(userId = userKey()) {
  return getState()
    .favorites.filter((f) => f.userId === userId)
    .map((f) => f.tourId);
}

export function toggleFavorite(tourId: string, userId = userKey()) {
  const existing = getState().favorites.find((f) => f.userId === userId && f.tourId === tourId);
  if (existing) {
    setState((s) => ({
      ...s,
      favorites: s.favorites.filter((f) => f.id !== existing.id),
    }));
    toast("Удалено из избранного");
    return false;
  }
  setState((s) => ({
    ...s,
    favorites: [
      ...s.favorites,
      { id: uid("fav"), userId, tourId, createdAt: nowIso() },
    ],
  }));
  trackEvent("TOUR_FAVORITED", userId === ANON ? undefined : userId, { tourId });
  toast.success("Добавлено в избранное");
  return true;
}

export function getCompare(userId = userKey()) {
  return getState().comparisons.find((c) => c.userId === userId)?.tourIds ?? [];
}

export function toggleCompare(tourId: string, userId = userKey()) {
  const current = getCompare(userId);
  if (current.includes(tourId)) {
    setState((s) => ({
      ...s,
      comparisons: s.comparisons.map((c) =>
        c.userId === userId ? { ...c, tourIds: c.tourIds.filter((id) => id !== tourId) } : c,
      ),
    }));
    toast("Убрано из сравнения");
    return;
  }
  if (current.length >= COMPARE_LIMIT) {
    toast.error("Можно сравнить максимум 4 тура.");
    return;
  }
  setState((s) => {
    const has = s.comparisons.some((c) => c.userId === userId);
    return {
      ...s,
      comparisons: has
        ? s.comparisons.map((c) =>
            c.userId === userId ? { ...c, tourIds: [...c.tourIds, tourId] } : c,
          )
        : [...s.comparisons, { userId, tourIds: [tourId] }],
    };
  });
  trackEvent("TOUR_COMPARED", userId === ANON ? undefined : userId, { tourId });
  toast.success("Добавлено к сравнению");
}

export function removeCompare(tourId: string, userId = userKey()) {
  setState((s) => ({
    ...s,
    comparisons: s.comparisons.map((c) =>
      c.userId === userId ? { ...c, tourIds: c.tourIds.filter((id) => id !== tourId) } : c,
    ),
  }));
}

export function clearCompare(userId = userKey()) {
  setState((s) => ({
    ...s,
    comparisons: s.comparisons.map((c) => (c.userId === userId ? { ...c, tourIds: [] } : c)),
  }));
}

export function getPriceAlerts(userId = userKey()) {
  return getState().priceAlerts.filter((a) => a.userId === userId);
}

export function upsertPriceAlert(
  alert: { tourId: string; targetPrice: number; currentPrice: number },
  userId = userKey(),
) {
  setState((s) => ({
    ...s,
    priceAlerts: [
      ...s.priceAlerts.filter((a) => !(a.userId === userId && a.tourId === alert.tourId)),
      {
        id: uid("alert"),
        userId,
        tourId: alert.tourId,
        targetPrice: alert.targetPrice,
        currentPrice: alert.currentPrice,
        currency: "KZT" as const,
        status: alert.currentPrice <= alert.targetPrice ? ("triggered" as const) : ("active" as const),
        createdAt: nowIso(),
      },
    ],
  }));
  toast.success("Price alert создан");
}

export function removePriceAlert(tourId: string, userId = userKey()) {
  setState((s) => ({
    ...s,
    priceAlerts: s.priceAlerts.filter((a) => !(a.userId === userId && a.tourId === tourId)),
  }));
  toast("Price alert удалён");
}

export function migrateAnonymousToUser(userId: string) {
  setState((s) => {
    const anonFavs = s.favorites.filter((f) => f.userId === ANON);
    const anonCmp = s.comparisons.find((c) => c.userId === ANON);
    const anonAlerts = s.priceAlerts.filter((a) => a.userId === ANON);
    return {
      ...s,
      favorites: [
        ...s.favorites.filter((f) => f.userId !== ANON),
        ...anonFavs.map((f) => ({ ...f, userId, id: uid("fav") })),
      ],
      comparisons: [
        ...s.comparisons.filter((c) => c.userId !== ANON && c.userId !== userId),
        {
          userId,
          tourIds: Array.from(
            new Set([
              ...(s.comparisons.find((c) => c.userId === userId)?.tourIds ?? []),
              ...(anonCmp?.tourIds ?? []),
            ]),
          ).slice(0, COMPARE_LIMIT),
        },
      ],
      priceAlerts: [
        ...s.priceAlerts.filter((a) => a.userId !== ANON),
        ...anonAlerts.map((a) => ({ ...a, userId, id: uid("alert") })),
      ],
    };
  });
  appendAudit({ actorId: userId, action: "migrate_anonymous_state", entityType: "user", entityId: userId });
}
