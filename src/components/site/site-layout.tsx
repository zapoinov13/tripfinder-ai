import type { ReactNode } from "react";

import { useAppTabBarPaddingClass, useCompactAppUi } from "@/hooks/use-native-app";
import { cn } from "@/lib/utils";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function SiteLayout({ children }: { children: ReactNode }) {
  const compactApp = useCompactAppUi();
  const tabPadding = useAppTabBarPaddingClass();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader compact={compactApp} />
      {/* Запас под фиксированный таб-бар живёт в футере (его тёмный фон закрашивает
          зазор); на main он нужен только в нативном приложении, где футера нет. */}
      <main className={cn("flex-1", compactApp ? tabPadding : undefined)}>{children}</main>
      {!compactApp ? <SiteFooter className={tabPadding} /> : null}
    </div>
  );
}
