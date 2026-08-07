import { useSyncExternalStore } from "react";

import { getState, setState, subscribe } from "./store";
import type { PlatformState } from "./types";

export function usePlatformStore(): PlatformState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function usePlatformSelector<T>(selector: (s: PlatformState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(getState()),
  );
}

export { getState, setState };
