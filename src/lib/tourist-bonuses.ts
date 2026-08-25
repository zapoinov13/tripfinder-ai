import { useEffect, useState } from "react";

const BONUS_KEY = "tourgo.bonusPoints";
const PROMO_KEY = "tourgo.redeemedPromos";

const PROMO_CODES: Record<string, number> = {
  TOURGO500: 500,
  WELCOME1000: 1000,
  KZ2026: 750,
};

function readPoints(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(BONUS_KEY));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function writePoints(n: number) {
  window.localStorage.setItem(BONUS_KEY, String(Math.max(0, Math.floor(n))));
}

function readPromos(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(PROMO_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export function getBonusPoints() {
  return readPoints();
}

export function redeemPromoCode(
  code: string,
): { ok: true; points: number } | { ok: false; reason: "empty" | "unknown" | "used" } {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return { ok: false, reason: "empty" };
  const reward = PROMO_CODES[normalized];
  if (!reward) return { ok: false, reason: "unknown" };
  const used = readPromos();
  if (used.includes(normalized)) return { ok: false, reason: "used" };
  writePoints(readPoints() + reward);
  window.localStorage.setItem(PROMO_KEY, JSON.stringify([...used, normalized]));
  return { ok: true, points: reward };
}

export function useBonusPoints() {
  const [points, setPoints] = useState(0);
  useEffect(() => {
    setPoints(readPoints());
    const onStorage = () => setPoints(readPoints());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    points,
    refresh: () => setPoints(readPoints()),
    redeem: (code: string) => {
      const result = redeemPromoCode(code);
      if (result.ok) setPoints(readPoints());
      return result;
    },
  };
}
