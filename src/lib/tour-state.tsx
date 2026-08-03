import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

const FAV_KEY = "voyago:favorites";
const CMP_KEY = "voyago:compare";
export const COMPARE_LIMIT = 4;

type Ctx = {
  favorites: string[];
  compare: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isCompared: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
};

const TourStateContext = createContext<Ctx | null>(null);

const read = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

export function TourStateProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFavorites(read(FAV_KEY));
    setCompare(read(CMP_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }, [favorites, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(CMP_KEY, JSON.stringify(compare));
  }, [compare, hydrated]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      if (prev.includes(id)) {
        toast("Удалено из избранного");
        return prev.filter((x) => x !== id);
      }
      toast.success("Добавлено в избранное");
      return [...prev, id];
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompare((prev) => {
      if (prev.includes(id)) {
        toast("Убрано из сравнения");
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= COMPARE_LIMIT) {
        toast.error("Можно сравнить максимум 4 тура.");
        return prev;
      }
      toast.success("Добавлено к сравнению");
      return [...prev, id];
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      favorites,
      compare,
      isFavorite: (id) => favorites.includes(id),
      toggleFavorite,
      isCompared: (id) => compare.includes(id),
      toggleCompare,
      removeCompare: (id) => setCompare((prev) => prev.filter((x) => x !== id)),
      clearCompare: () => setCompare([]),
    }),
    [favorites, compare, toggleFavorite, toggleCompare],
  );

  return <TourStateContext.Provider value={value}>{children}</TourStateContext.Provider>;
}

export function useTourState() {
  const ctx = useContext(TourStateContext);
  if (!ctx) throw new Error("useTourState must be used within TourStateProvider");
  return ctx;
}