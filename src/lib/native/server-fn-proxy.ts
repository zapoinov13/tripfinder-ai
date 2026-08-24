import { isNativeApp } from "@/lib/native/app";

/**
 * В нативном бандле (сборка `vite.capacitor.config.ts`) страница живёт на
 * capacitor://localhost, а server functions TanStack Start зовутся по
 * относительному пути `/_serverFn/...` — то есть в никуда.
 *
 * Переопределить базу на этапе сборки нельзя: define плагина TanStack Start
 * затирает пользовательский `TSS_SERVER_FN_BASE`. Поэтому дооборачиваем
 * fetch: только в нативной оболочке и только для RPC server functions
 * дописываем продовый origin. Обращения к Supabase и статике не трогаем.
 */
const SERVER_FN_PREFIX = "/_serverFn/";
const PROD_ORIGIN = "https://tripfinder-ai.vercel.app";

let installed = false;

export function installNativeServerFnProxy(): void {
  if (installed || typeof window === "undefined" || !isNativeApp()) return;
  // Оболочка live-reload (CAPACITOR_SERVER_URL) грузит страницу с настоящего
  // сервера — там относительные URL и так работают.
  if (window.location.protocol.startsWith("http") && window.location.hostname !== "localhost") {
    return;
  }
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(SERVER_FN_PREFIX)) {
      return originalFetch(input as RequestInfo, init);
    }
    const absolute = `${PROD_ORIGIN}${url}`;
    if (typeof input === "string" || input instanceof URL) {
      return originalFetch(absolute, init);
    }
    return originalFetch(new Request(absolute, input), init);
  }) as typeof window.fetch;
}
