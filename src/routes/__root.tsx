import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { NativeBootstrap } from "@/components/native/native-bootstrap";
import { NativeNetworkBanner } from "@/components/native/network-banner";
import { reportRuntimeError } from "../lib/editor-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/platform/auth";
import { TourStateProvider } from "@/lib/tour-state";
import { hydrateVerticalListingsFromSupabase } from "@/lib/platform/vertical-listings";
import { hydrateCatalogFromSupabase } from "@/lib/supabase/hydrate";
import { isSupabaseConfigured } from "@/lib/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Такой страницы нет или она переехала. Начните с главной — оттуда открывается всё.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportRuntimeError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Страница не открылась
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Это на нашей стороне. Обновите страницу или вернитесь на главную — данные не потерялись.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Попробовать снова
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Обложка для ссылок в мессенджерах и соцсетях.
 *
 * Абсолютный адрес нужен Twitter/X; остальные площадки разрешают путь от корня.
 * Домен берём из VITE_SITE_URL — пока его нет, отдаём путь, и превью работает
 * везде, кроме X.
 */
const siteUrl = (import.meta.env["VITE_SITE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";
const ogImage = `${siteUrl}/og-cover.png`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f172a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "TourGo" },
      { title: "TourGo: всё для путешествия в одном месте" },
      {
        name: "description",
        content:
          "Всё для путешествия в одном месте: туры, экскурсии, жильё, авто, спорт и помощь в поездке.",
      },
      {
        property: "og:title",
        content: "TourGo: всё для путешествия в одном месте",
      },
      {
        property: "og:description",
        content:
          "Туры, экскурсии, жильё, авто, спорт и помощь в поездке. Платите напрямую выбранной компании.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "TourGo: всё для путешествия в одном месте",
      },
      {
        name: "twitter:description",
        content:
          "Туры, экскурсии, жильё, авто, спорт и помощь в поездке. Платите напрямую выбранной компании.",
      },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: "ru_RU" },
      { property: "og:site_name", content: "TourGo" },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        // media="print" делает загрузку шрифтов неблокирующей: страница
        // рендерится системными шрифтами сразу, а на медленной сети или
        // офлайн (нативный бандл) первый кадр не ждёт fonts.googleapis.com.
        // Скрипт в RootDocument переключает media на all после загрузки.
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap",
        media: "print",
        id: "gf-stylesheet",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
        {/* Включаем шрифты после их загрузки; до этого рендер не блокируется. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'var l=document.getElementById("gf-stylesheet");if(l){l.addEventListener("load",function(){l.media="all"});if(l.sheet)l.media="all";}',
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (isSupabaseConfigured) {
      void hydrateCatalogFromSupabase().then((res) => {
        if (res.ok) {
          console.info("[supabase] catalog hydrated", res);
        } else {
          console.warn("[supabase] catalog hydrate skipped", res.reason);
        }
      });
      // Объявления бизнесов (спорт, жильё, авто) — общие для всех устройств.
      void hydrateVerticalListingsFromSupabase();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TourStateProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <NativeBootstrap />
          <NativeNetworkBanner />
          <Toaster position="top-center" />
        </TourStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
