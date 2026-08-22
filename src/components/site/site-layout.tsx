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
      <main className={cn("flex-1", tabPadding)}>{children}</main>
      {!compactApp ? <SiteFooter /> : null}
    </div>
  );
}
