import { createSeedState, STORE_KEY } from "./seed";
import type { PlatformState, PlatformUser } from "./types";

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
    // Коллекции, появившиеся позже сохранённого состояния. Легаси-запись
    // владельца («user-owner-admin», пароль в исходниках) вычищаем из старых
    // снапшотов: прод-доступ владельца обеспечивает Supabase (npm run
    // ensure:admin), dev-доступ — admin@tourgo.demo или VITE_DEV_ADMIN_*.
    const users = (Array.isArray(parsed.users) ? parsed.users : []).filter(
      (u) => u.id !== "user-owner-admin",
    );
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

/**
 * Dev-вход админа без Supabase: email и пароль берутся только из локального
 * .env (VITE_DEV_ADMIN_EMAIL / VITE_DEV_ADMIN_PASSWORD), в репозиторий и
 * прод-сборку никакие креды не попадают.
 */
function withDevAdmin(base: PlatformState): PlatformState {
  if (!import.meta.env.DEV) return base;
  const email = import.meta.env.VITE_DEV_ADMIN_EMAIL?.trim().toLowerCase();
  const password = import.meta.env.VITE_DEV_ADMIN_PASSWORD;
  if (!email || !password) return base;
  const existing = base.users.find((u) => u.email.toLowerCase() === email);
  const admin: PlatformUser = {
    id: existing?.id ?? "user-dev-admin",
    email,
    password,
    name: existing?.name ?? "Администратор",
    city: existing?.city ?? "Алматы",
    role: "PLATFORM_ADMIN",
    status: "active",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  return {
    ...base,
    users: [...base.users.filter((u) => u.email.toLowerCase() !== email), admin],
  };
}

export function getState(): PlatformState {
  if (!state) {
    state = withDevAdmin(loadFromStorage() ?? createSeedState());
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
