// @lovable.dev/vite-tanstack-config already includes the following. Do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const capacitorSsrExternals = [
  "@capacitor/core",
  "@capacitor/app",
  "@capacitor/network",
  "@capacitor/push-notifications",
  "@capacitor/splash-screen",
  "@capacitor/status-bar",
  "@capacitor/keyboard",
  "@capacitor-community/apple-sign-in",
  "leaflet",
];

/**
 * Штамп сборки в бандл.
 *
 * Vercel кладёт хэш коммита в VERCEL_GIT_COMMIT_SHA, но без префикса VITE_ он
 * до браузера не доедет — перекладываем сами. Локально переменной нет, и
 * приложение честно показывает «локальная сборка».
 */
const buildEnv = {
  "import.meta.env.VITE_BUILD_COMMIT": JSON.stringify(
    process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["BUILD_COMMIT"] ?? "",
  ),
  "import.meta.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: buildEnv,
    // Capacitor plugins touch `document` at module load: keep them out of the SSR bundle.
    ssr: {
      external: capacitorSsrExternals,
    },
    build: {
      rollupOptions: {
        external: capacitorSsrExternals,
      },
    },
  },
});
