import { useSyncExternalStore } from "react";

import { getServerSnapshot, getState, setState, subscribe } from "./store";
import type { PlatformState } from "./types";

export function usePlatformStore(): PlatformState {
  return useSyncExternalStore(subscribe, getState, getServerSnapshot);
}

export function usePlatformSelector<T>(selector: (s: PlatformState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(getServerSnapshot()),
  );
}

export { getState, setState };
