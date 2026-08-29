/**
 * Сборка ЛОКАЛЬНОГО бандла для Capacitor (App Store / Google Play).
 *
 * Обычный `vite build` собирает SSR-приложение для Vercel/Cloudflare — у него
 * нет index.html, поэтому нативная оболочка грузила продовый сайт по URL.
 * Apple регулярно отклоняет такие «обёртки над сайтом» (Guideline 4.2).
 *
 * Здесь включён SPA-режим TanStack Start: в бандл кладётся пререндеренный
 * shell (index.html) + клиентские ассеты, роутер работает на устройстве.
 * Server functions (AI-чат, premium) ходят на продовый бэкенд — базовый URL
 * подменяется через define TSS_SERVER_FN_BASE. Всё остальное (каталог,
 * авторизация, заявки) говорит с Supabase напрямую и работает без сервера.
 *
 *   npm run cap:build   # vite build --config vite.capacitor.config.ts
 *   npx cap sync
 */
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
];

/** Продовый origin, на который SPA-бандл шлёт server-function RPC. */
// Боевой адрес деплоя: сюда мобильное приложение ходит за серверными
// функциями (AI-подбор, Premium). Прежний адрес без «-swart» не существует —
// в приложении эти вызовы уходили в никуда. При переезде на свой домен
// достаточно задать CAPACITOR_SERVER_ORIGIN в окружении сборки.
const SERVER_ORIGIN =
  process.env.CAPACITOR_SERVER_ORIGIN ?? "https://tripfinder-ai-swart.vercel.app";

export default defineConfig({
  // Nitro (deploy-таргет Cloudflare/Vercel) в мобильном бандле не нужен.
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
      // Пререндеренный shell кладётся в index.html — его грузит WebView.
      prerender: { outputPath: "/index.html" },
    },
  },
  vite: {
    // Пререндер shell поднимает vite preview; в окружениях без IPv6 дефолтный
    // host "::" падает с EAFNOSUPPORT.
    preview: { host: "127.0.0.1" },
    define: {
      // RPC server functions уходят на прод, а не на capacitor://localhost.
      "process.env.TSS_SERVER_FN_BASE": JSON.stringify(`${SERVER_ORIGIN}/_serverFn/`),
    },
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
