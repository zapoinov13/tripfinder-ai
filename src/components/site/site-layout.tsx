import type { ReactNode } from "react";

import { useCompactAppUi } from "@/hooks/use-native-app";
import { cn } from "@/lib/utils";

import { AppTabBar, tabBarPaddingClass } from "./app-tab-bar";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Каркас страниц для туриста.
 *
 * Нижнюю навигацию рисует лейаут: раньше она жила в корне приложения и решала
 * по адресу, показываться ли, — и попадала в кабинет партнёра. Страницы, где
 * человек заполняет форму регистрации, просят её убрать: там нужен один путь
 * вперёд, а не четыре в стороны.
 */
export function SiteLayout({
  children,
  hideTabBar = false,
}: {
  children: ReactNode;
  hideTabBar?: boolean;
}) {
  const compactApp = useCompactAppUi();
  const tabPadding = hideTabBar ? "" : tabBarPaddingClass;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader compact={compactApp} />
      {/* Запас под фиксированный таб-бар живёт в футере (его тёмный фон закрашивает
          зазор); на main он нужен только в нативном приложении, где футера нет. */}
      <main className={cn("flex-1", compactApp ? tabPadding : undefined)}>{children}</main>
      {!compactApp ? <SiteFooter className={tabPadding} /> : null}
      {hideTabBar ? null : <AppTabBar />}
    </div>
  );
}
