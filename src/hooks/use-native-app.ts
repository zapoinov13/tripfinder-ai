import { useSyncExternalStore } from "react";

import { isCompactAppUi, isNativeApp } from "@/lib/native/app";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

export function useIsNativeApp() {
  return useSyncExternalStore(subscribe, isNativeApp, () => false);
}

export function useCompactAppUi() {
  return useSyncExternalStore(subscribe, isCompactAppUi, () => false);
}
