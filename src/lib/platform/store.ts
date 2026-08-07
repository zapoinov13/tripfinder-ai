import { createSeedState, STORE_KEY } from "./seed";
import type { PlatformState } from "./types";

type Listener = () => void;

let state: PlatformState | null = null;
const listeners = new Set<Listener>();

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function persist(next: PlatformState) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — keep in-memory
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
    return parsed;
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

export function setState(updater: (prev: PlatformState) => PlatformState) {
  const prev = getState();
  const next = updater(prev);
  state = { ...next, version: prev.version + 1 };
  persist(state);
  listeners.forEach((l) => l());
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

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
