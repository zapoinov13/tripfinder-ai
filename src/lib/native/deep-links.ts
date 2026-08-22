import type { Router } from "@tanstack/react-router";

import { isNativeApp } from "@/lib/native/app";

function normalizeDeepLink(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol === "tourgo:") {
      const path = url.pathname || url.host;
      return path.startsWith("/") ? path : `/${path}`;
    }
    const allowedHosts = ["tripfinder-ai.vercel.app", "tripfinder-ai.lovable.app", "localhost"];
    if (!allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    if (raw.startsWith("/")) return raw;
    return null;
  }
}

export async function bindNativeDeepLinks(router: Router) {
  if (!isNativeApp()) return () => {};

  try {
    const { App } = await import("@capacitor/app");
    const launch = await App.getLaunchUrl();
    const launchPath = launch?.url ? normalizeDeepLink(launch.url) : null;
    if (launchPath) {
      router.history.push(launchPath);
    }

    const openHandle = await App.addListener("appUrlOpen", ({ url }) => {
      const path = normalizeDeepLink(url);
      if (path) router.history.push(path);
    });

    const backHandle = await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void App.exitApp();
      }
    });

    return () => {
      void openHandle.remove();
      void backHandle.remove();
    };
  } catch {
    return () => {};
  }
}
