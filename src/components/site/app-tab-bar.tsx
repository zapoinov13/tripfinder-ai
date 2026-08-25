import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, Search, User } from "lucide-react";

import { useShowAppTabBar } from "@/hooks/use-native-app";
import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "home",
    label: "Главная",
    to: "/",
    icon: Home,
    match: (path: string) => path === "/",
  },
  {
    id: "saved",
    label: "Избранное",
    to: "/favorites",
    icon: Heart,
    match: (path: string) => path === "/favorites" || path === "/profile/favorites",
  },
  {
    id: "search",
    label: "Поиск",
    to: "/ai-search",
    icon: Search,
    featured: true,
    match: (path: string) => path === "/ai-search",
  },
  {
    id: "profile",
    label: "Профиль",
    to: "/profile",
    icon: User,
    match: (path: string) =>
      path === "/profile" ||
      path === "/profile/" ||
      path.startsWith("/profile/") ||
      path.startsWith("/request") ||
      path === "/notifications" ||
      path === "/premium",
  },
] as const;

export function AppTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const show = useShowAppTabBar();

  if (!show) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 overflow-visible border-t border-border bg-background/95 pt-3 backdrop-blur-xl md:hidden"
      aria-label="Основная навигация"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4 items-end">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const featured = "featured" in tab && tab.featured;
          return (
            <Link
              key={tab.id}
              to={tab.to}
              search={{} as never}
              className={cn(
                "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors active:opacity-70",
                featured && "relative",
                !featured && (active ? "text-primary" : "text-muted-foreground"),
                featured && !active && "text-muted-foreground",
                featured && active && "text-primary",
              )}
            >
              {featured ? (
                <span
                  className={cn(
                    "-mt-5 grid size-12 place-items-center rounded-full shadow-md",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-ink text-primary-foreground",
                  )}
                >
                  <tab.icon className="size-5" aria-hidden />
                </span>
              ) : (
                <tab.icon className={cn("size-[22px]", active && "stroke-[2.35px]")} aria-hidden />
              )}
              <span className={cn(active && "font-semibold")}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** @deprecated Use AppTabBar */
export const MobileNav = AppTabBar;
