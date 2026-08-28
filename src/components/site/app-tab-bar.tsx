import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Heart, Home, Search, User } from "lucide-react";

import { useOptionalAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";
import { cn } from "@/lib/utils";

import { TabBarShell, type TabItem } from "./tab-bar-shell";

/**
 * Нижняя навигация туриста.
 *
 * Рисует её лейаут, а не глобальный список путей: раньше бар жил в корне
 * приложения и решал по адресу, показываться ему или нет, — и оказывался
 * поверх кабинета партнёра с подсвеченной «Главной». Теперь бар принадлежит
 * тому, кому предназначен.
 */
const tabs: TabItem[] = [
  {
    id: "home",
    label: "Главная",
    to: "/",
    icon: Home,
    match: (path) => path === "/",
  },
  {
    id: "search",
    label: "Поиск",
    to: "/ai-search",
    icon: Search,
    match: (path) => path === "/ai-search" || path === "/search",
  },
  {
    id: "saved",
    label: "Избранное",
    to: "/favorites",
    icon: Heart,
    match: (path) => path === "/favorites" || path === "/profile/favorites",
  },
  {
    id: "alerts",
    label: "Уведомления",
    to: "/notifications",
    icon: Bell,
    match: (path) => path === "/notifications",
  },
  {
    id: "profile",
    label: "Профиль",
    to: "/profile",
    icon: User,
    match: (path) =>
      path === "/profile" ||
      (path.startsWith("/profile/") && path !== "/profile/favorites") ||
      path.startsWith("/request") ||
      path === "/premium",
  },
];

export function AppTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const auth = useOptionalAuth();
  const state = usePlatformStore();

  // Непрочитанные — единственная причина, по которой человек возвращается сам.
  const unread = auth?.user
    ? state.notifications.filter((n) => n.userId === auth.user?.id && !n.read).length
    : 0;

  return (
    <TabBarShell
      tabs={tabs.map((tab) => (tab.id === "alerts" ? { ...tab, badge: unread } : tab))}
      pathname={pathname}
    />
  );
}

/** Запас под фиксированный бар: контент не должен прятаться под ним. */
export const tabBarPaddingClass = "pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0";

/** @deprecated Используйте AppTabBar */
export const MobileNav = AppTabBar;

export { cn };
