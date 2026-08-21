import { createSeedState, STORE_KEY } from "./seed";
import type { PlatformState } from "./types";

type Listener = () => void;
type MutationObserver = (prev: PlatformState, next: PlatformState) => void;

let state: PlatformState | null = null;
const listeners = new Set<Listener>();
let observer: MutationObserver | null = null;

/**
 * Единственная точка, откуда изменения стора уходят в бэкенд.
 * Экраны продолжают вызывать setState, ничего про Supabase не зная.
 */
export function observeMutations(next: MutationObserver | null) {
  observer = next;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function persist(next: PlatformState) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode: keep in-memory
  }
}

function loadFromStorage(): PlatformState | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlatformState;
    if (!parsed?.version || !Array.isArray(parsed.tours) || !Array.isArray(parsed.users)) {
      return null;
    }
    // Коллекции, появившиеся позже сохранённого состояния.
    const users = Array.isArray(parsed.users) ? [...parsed.users] : [];
    const ownerEmail = "zapoinov@bk.ru";
    const ownerIdx = users.findIndex((u) => u.email.toLowerCase() === ownerEmail);
    const owner = {
      id: ownerIdx >= 0 ? users[ownerIdx]!.id : "user-owner-admin",
      email: ownerEmail,
      password: "zapoinov@bk.ru",
      name: "Юрий Запойнов",
      city: "Алматы",
      role: "PLATFORM_ADMIN" as const,
      status: "active" as const,
      createdAt: ownerIdx >= 0 ? users[ownerIdx]!.createdAt : new Date().toISOString(),
    };
    if (ownerIdx >= 0) users[ownerIdx] = { ...users[ownerIdx]!, ...owner };
    else users.push(owner);
    return {
      ...parsed,
      users,
      tripRequests: parsed.tripRequests ?? [],
      requestOffers: parsed.requestOffers ?? [],
      requestMessages: parsed.requestMessages ?? [],
      companyReviews: parsed.companyReviews ?? [],
    };
  } catch {
    return null;
  }
}

export function getState(): PlatformState {
  if (!state) {
    state = loadFromStorage() ?? createSeedState();
    persist(state);
  }
  return state;
}

let serverSnapshot: PlatformState | null = null;

/**
 * Снимок для SSR и первого рендера в браузере: сид без localStorage и без сессии.
 * Разметка сервера и клиента совпадает, а реальное состояние React подставляет
 * сразу после гидрации.
 */
export function getServerSnapshot(): PlatformState {
  if (!serverSnapshot) serverSnapshot = createSeedState();
  return serverSnapshot;
}

export function setState(
  updater: (prev: PlatformState) => PlatformState,
  options?: { silent?: boolean },
) {
  const prev = getState();
  const next = updater(prev);
  state = { ...next, version: prev.version + 1 };
  persist(state);
  listeners.forEach((l) => l());
  if (observer && !options?.silent) {
    try {
      observer(prev, state);
    } catch (e) {
      console.warn("[store] mutation observer failed", e);
    }
  }
  return state;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetPlatformStore() {
  state = createSeedState();
  persist(state);
  listeners.forEach((l) => l());
  return state;
}

/** UUID, а не читаемый префикс: тот же id уходит в Postgres, где PK это uuid. */
export function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += "-";
    else if (i === 14) out += "4";
    else out += hex[Math.floor(Math.random() * 16)];
  }
  return out;
}

export function nowIso() {
  return new Date().toISOString();
}
