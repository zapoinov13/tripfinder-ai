import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Luggage, Search, User } from "lucide-react";

import { useShowAppTabBar } from "@/hooks/use-native-app";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Главная", to: "/", icon: Home, match: (path: string) => path === "/" },
  {
    label: "Поиск",
    to: "/search",
    icon: Search,
    match: (path: string) =>
      path === "/search" ||
      path.startsWith("/tour/") ||
      path.startsWith("/destination/") ||
      path === "/hot" ||
      path === "/compare" ||
      path === "/excursions" ||
      path === "/destinations" ||
      path === "/experiences",
  },
  {
    label: "Поездки",
    to: "/profile/trips",
    icon: Luggage,
    match: (path: string) =>
      path === "/profile/trips" ||
      path.startsWith("/request") ||
      path === "/favorites" ||
      path === "/notifications",
  },
  {
    label: "Профиль",
    to: "/profile",
    icon: User,
    match: (path: string) =>
      (path === "/profile" || path.startsWith("/profile/")) && path !== "/profile/trips",
  },
] as const;

export function AppTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const show = useShowAppTabBar();

  if (!show) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden"
      aria-label="Основная навигация"
    >
      <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              search={tab.to === "/search" ? ({} as never) : undefined}
              className={cn(
                "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors active:scale-95",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <tab.icon className={cn("size-5", active && "stroke-[2.5px]")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** @deprecated Use AppTabBar */
export const MobileNav = AppTabBar;
