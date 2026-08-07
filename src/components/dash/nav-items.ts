import {
  BarChart3,
  Bell,
  Building,
  Cable,
  CreditCard,
  Gauge,
  Gem,
  Heart,
  LayoutDashboard,
  Luggage,
  Megaphone,
  Receipt,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  Users,
} from "lucide-react";

import { usePlatformStore } from "@/lib/platform/hooks";

import type { DashItem } from "./dash-shell";

export const operatorNav: DashItem[] = [
  { label: "Обзор", to: "/operator", icon: LayoutDashboard },
  { label: "Мои туры", to: "/operator/tours", icon: Luggage },
  { label: "Бронирования", to: "/operator/bookings", icon: Ticket },
  { label: "Продвижение", to: "/operator/promotion", icon: Megaphone },
  { label: "Аналитика", to: "/operator/analytics", icon: BarChart3 },
  { label: "API интеграции", to: "/operator/api", icon: Cable },
  { label: "Тариф", to: "/operator/billing", icon: CreditCard },
  { label: "Компания", to: "/operator/company", icon: Building },
  { label: "Настройки", to: "/operator/settings", icon: Settings },
];

const adminNavBase: DashItem[] = [
  { label: "Обзор", to: "/admin", icon: Gauge },
  { label: "Пользователи", to: "/admin/users", icon: Users },
  { label: "Операторы", to: "/admin/operators", icon: Building },
  { label: "Туры", to: "/admin/tours", icon: Luggage },
  { label: "Бронирования", to: "/admin/bookings", icon: Ticket },
  { label: "Платежи", to: "/admin/payments", icon: Receipt },
  { label: "Premium", to: "/admin/premium", icon: Gem },
  { label: "Продвижение", to: "/admin/promotions", icon: Megaphone },
  { label: "Мониторинг API", to: "/admin/api-monitoring", icon: Cable },
  { label: "Журнал аудита", to: "/admin/audit-logs", icon: ShieldCheck },
  { label: "Аналитика", to: "/admin/analytics", icon: BarChart3 },
  { label: "Настройки", to: "/admin/settings", icon: Settings },
];

/** Static nav (no live badges). Prefer `useAdminNav()` in admin pages. */
export const adminNav = adminNavBase;

export function useAdminNav(): DashItem[] {
  const state = usePlatformStore();
  const pendingOps = state.organizations.filter((o) => o.status === "PENDING_APPROVAL").length;
  const apiErrors =
    state.apiConnections.filter((c) => c.status === "error").length +
    state.syncLogs.filter((l) => l.status === "error").length;

  return adminNavBase.map((item) => {
    if (item.to === "/admin/operators" && pendingOps > 0) return { ...item, badge: pendingOps };
    if (item.to === "/admin/api-monitoring" && apiErrors > 0) return { ...item, badge: apiErrors };
    return item;
  });
}

export const profileNav: DashItem[] = [
  { label: "Мой профиль", to: "/profile", icon: User },
  { label: "Мои поездки", to: "/profile/trips", icon: Luggage },
  { label: "Избранное", to: "/profile/favorites", icon: Heart },
  { label: "Сравнение", to: "/compare", icon: Scale },
  { label: "AI-поиски", to: "/profile/ai", icon: Sparkles },
  { label: "Уведомления", to: "/notifications", icon: Bell },
  { label: "Premium", to: "/premium", icon: Gem },
  { label: "Настройки", to: "/profile/settings", icon: Settings },
];
