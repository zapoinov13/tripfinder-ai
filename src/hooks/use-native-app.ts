import { useRouterState } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { isCompactAppUi, isNativeApp } from "@/lib/native/app";
import { shouldShowAppTabBar } from "@/lib/native/routes";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getPathname() {
  return window.location.pathname;
}

export function useIsNativeApp() {
  return useSyncExternalStore(subscribe, isNativeApp, () => false);
}

export function useCompactAppUi() {
  return useSyncExternalStore(subscribe, isCompactAppUi, () => false);
}

export function useShowAppTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return shouldShowAppTabBar(pathname);
}

export function useAppTabBarPaddingClass() {
  const show = useShowAppTabBar();
  return show ? "pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0" : "";
}
