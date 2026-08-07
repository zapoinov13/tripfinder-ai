import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { usePlatformStore } from "@/lib/platform/hooks";
import type { PriceAlert } from "@/lib/platform/types";
import {
  COMPARE_LIMIT,
  clearCompare as clearCompareStore,
  getCompare,
  getFavorites,
  getPriceAlerts,
  removeCompare as removeCompareStore,
  removePriceAlert as removePriceAlertStore,
  toggleCompare as toggleCompareStore,
  toggleFavorite as toggleFavoriteStore,
  upsertPriceAlert as upsertPriceAlertStore,
} from "@/lib/platform/user-data";

export { COMPARE_LIMIT };
export type { PriceAlert };

type Ctx = {
  favorites: string[];
  compare: string[];
  priceAlerts: PriceAlert[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isCompared: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  getPriceAlert: (tourId: string) => PriceAlert | undefined;
  upsertPriceAlert: (
    alert: Omit<PriceAlert, "id" | "userId" | "currency" | "status" | "createdAt">,
  ) => void;
  removePriceAlert: (tourId: string) => void;
};

const TourStateContext = createContext<Ctx | null>(null);

export function TourStateProvider({ children }: { children: ReactNode }) {
  usePlatformStore();

  const favorites = getFavorites();
  const compare = getCompare();
  const priceAlerts = getPriceAlerts();

  const toggleFavorite = useCallback((id: string) => {
    toggleFavoriteStore(id);
  }, []);

  const toggleCompare = useCallback((id: string) => {
    toggleCompareStore(id);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      favorites,
      compare,
      priceAlerts,
      isFavorite: (id) => favorites.includes(id),
      toggleFavorite,
      isCompared: (id) => compare.includes(id),
      toggleCompare,
      removeCompare: (id) => removeCompareStore(id),
      clearCompare: () => clearCompareStore(),
      getPriceAlert: (tourId) => priceAlerts.find((alert) => alert.tourId === tourId),
      upsertPriceAlert: (alert) => upsertPriceAlertStore(alert),
      removePriceAlert: (tourId) => removePriceAlertStore(tourId),
    }),
    [favorites, compare, priceAlerts, toggleFavorite, toggleCompare],
  );

  return <TourStateContext.Provider value={value}>{children}</TourStateContext.Provider>;
}

export function useTourState() {
  const ctx = useContext(TourStateContext);
  if (!ctx) throw new Error("useTourState must be used within TourStateProvider");
  return ctx;
}
