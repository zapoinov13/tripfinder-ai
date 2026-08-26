import {
  BarChart3,
  Bell,
  Building,
  Cable,
  CreditCard,
  Dumbbell,
  Gauge,
  HandCoins,
  Heart,
  Inbox,
  LayoutDashboard,
  Luggage,
  Megaphone,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  User,
  Users,
} from "lucide-react";

import { useOptionalAuth } from "@/lib/platform/auth";
import { usePlatformStore } from "@/lib/platform/hooks";

import type { DashItem } from "./dash-shell";

const operatorNavBase: DashItem[] = [
  { label: "Главная", to: "/operator", icon: LayoutDashboard },
  { label: "Заявки", to: "/operator/requests", icon: Inbox },
  { label: "Предложения", to: "/operator/offers", icon: HandCoins },
  { label: "Туры", to: "/operator/tours", icon: Luggage },
  { label: "Услуги", to: "/operator/services", icon: Dumbbell },
  { label: "Сообщения", to: "/operator/messages", icon: MessageSquare },
  { label: "Брони", to: "/operator/bookings", icon: Ticket },
  { label: "Компания", to: "/operator/company", icon: Building },
  { label: "Отзывы", to: "/operator/reviews", icon: Star },
  { label: "Продвижение", to: "/operator/promotion", icon: Megaphone },
  { label: "Статистика", to: "/operator/analytics", icon: BarChart3 },
  { label: "Тариф", to: "/operator/billing", icon: CreditCard },
  { label: "Настройки", to: "/operator/settings", icon: Settings },
];

/** Static nav (no live badges). Prefer `useOperatorNav()` inside the cabinet. */
export const operatorNav = operatorNavBase;

export function useOperatorNav(orgId?: string): DashItem[] {
  const state = usePlatformStore();
  if (!orgId) return operatorNavBase;

  const answered = new Set(
    state.requestOffers.filter((o) => o.organizationId === orgId).map((o) => o.requestId),
  );
  const open = state.tripRequests.filter(
    (r) =>
      r.status !== "CHOSEN" &&
      r.status !== "CLOSED" &&
      !r.declinedByOrgIds.includes(orgId) &&
      !answered.has(r.id),
  ).length;

  const unreadMessages = state.requestMessages.filter(
    (m) => m.organizationId === orgId && m.authorSide === "TOURIST" && !m.readByCompany,
  ).length;

  return operatorNavBase.map((item) => {
    if (item.to === "/operator/requests" && open > 0) return { ...item, badge: open };
    if (item.to === "/operator/messages" && unreadMessages > 0) {
      return { ...item, badge: unreadMessages };
    }
    return item;
  });
}

/** Страницы, требующие PLATFORM_ADMIN: менеджеру их не показываем. */
const adminOnlyRoutes = new Set([
  "/admin/payments",
  "/admin/promotions",
  "/admin/audit-logs",
  "/admin/ai-keys",
  "/admin/settings",
]);

const adminNavBase: DashItem[] = [
  { label: "Обзор платформы", to: "/admin", icon: Gauge },
  { label: "Пользователи", to: "/admin/users", icon: Users },
  { label: "Турфирмы", to: "/admin/operators", icon: Building },
  { label: "Туры", to: "/admin/tours", icon: Luggage },
  { label: "Бронирования", to: "/admin/bookings", icon: Ticket },
  { label: "Платежи", to: "/admin/payments", icon: Receipt },
  { label: "Продвижение", to: "/admin/promotions", icon: Megaphone },
  { label: "API", to: "/admin/api-monitoring", icon: Cable },
  { label: "Push", to: "/admin/push", icon: Bell },
  { label: "Аудит", to: "/admin/audit-logs", icon: ShieldCheck },
  { label: "Аналитика", to: "/admin/analytics", icon: BarChart3 },
  { label: "AI и ключи", to: "/admin/ai-keys", icon: Sparkles },
  { label: "Настройки", to: "/admin/settings", icon: Settings },
];

/** Static nav (no live badges). Prefer `useAdminNav()` in admin pages. */
export const adminNav = adminNavBase;

export function useAdminNav(): DashItem[] {
  const state = usePlatformStore();
  const auth = useOptionalAuth();
  const pendingOps = state.organizations.filter((o) => o.status === "PENDING_APPROVAL").length;
  // Бейдж — только текущие проблемы подключений; исторические error-логи
  // никогда не чистятся и держали бы бейдж красным вечно.
  const apiErrors = state.apiConnections.filter((c) => c.status === "error").length;

  const items =
    auth?.user?.role === "PLATFORM_MANAGER"
      ? adminNavBase.filter((item) => !adminOnlyRoutes.has(item.to))
      : adminNavBase;

  return items.map((item) => {
    if (item.to === "/admin/operators" && pendingOps > 0) return { ...item, badge: pendingOps };
    if (item.to === "/admin/api-monitoring" && apiErrors > 0) return { ...item, badge: apiErrors };
    return item;
  });
}

export const profileNav: DashItem[] = [
  { label: "Кабинет", to: "/profile", icon: User },
  { label: "Поездки", to: "/profile/trips", icon: Luggage },
  { label: "Заявки", to: "/profile/requests", icon: Inbox },
  { label: "Сообщения", to: "/profile/messages", icon: MessageSquare },
  { label: "Избранное", to: "/favorites", icon: Heart },
  { label: "Данные туриста", to: "/profile/settings", icon: Settings },
];
