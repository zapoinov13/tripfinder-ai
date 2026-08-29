import {
  BarChart3,
  Bell,
  Building,
  Cable,
  CreditCard,
  Dumbbell,
  FileCheck,
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

import { useEffect, useSyncExternalStore } from "react";

import { useOptionalAuth } from "@/lib/platform/auth";
import { isListingBusiness } from "@/lib/platform/company-categories";
import {
  pendingDocumentsCount,
  refreshPendingDocuments,
  subscribePendingDocuments,
} from "@/lib/platform/company-documents";
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

/** Разделы турфирмы, бессмысленные для «бизнеса без туров» (зал, прокат, жильё). */
const tourOnlyRoutes = new Set([
  "/operator/offers",
  "/operator/tours",
  "/operator/messages",
  "/operator/bookings",
]);

export function useOperatorNav(orgId?: string): DashItem[] {
  const state = usePlatformStore();
  if (!orgId) return operatorNavBase;

  const org = state.organizations.find((o) => o.id === orgId);
  if (org && isListingBusiness(org.category, org.services)) {
    // «Заявки» у бизнеса — записи клиентов, а не туровые заявки туристов.
    const newRequests = state.serviceRequests.filter(
      (r) => r.organizationId === orgId && r.status === "NEW",
    ).length;
    return operatorNavBase
      .filter((item) => !tourOnlyRoutes.has(item.to))
      .map((item) => {
        if (item.to === "/operator/services") return { ...item, label: "Объявления" };
        if (item.to === "/operator/requests" && newRequests > 0) {
          return { ...item, badge: newRequests };
        }
        return item;
      });
  }

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
  { label: "Партнёры", to: "/admin/operators", icon: Building },
  { label: "Документы", to: "/admin/documents", icon: FileCheck },
  { label: "Заявки и брони", to: "/admin/bookings", icon: Ticket },
  { label: "Деньги", to: "/admin/payments", icon: Receipt },
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
  // Заявки «это наша компания» ждут ручного решения — иначе владелец не дождётся.
  const openClaims = state.companyClaims.filter((c) => c.status === "NEW").length;
  const pendingDocs = usePendingDocuments();

  const items =
    auth?.user?.role === "PLATFORM_MANAGER"
      ? adminNavBase.filter((item) => !adminOnlyRoutes.has(item.to))
      : adminNavBase;

  return items.map((item) => {
    if (item.to === "/admin/operators" && pendingOps + openClaims > 0)
      return { ...item, badge: pendingOps + openClaims };
    if (item.to === "/admin/api-monitoring" && apiErrors > 0) return { ...item, badge: apiErrors };
    if (item.to === "/admin/documents" && pendingDocs > 0) return { ...item, badge: pendingDocs };
    return item;
  });
}

/** Сколько документов ждёт проверки. Число живёт на сервере, не в сторе. */
function usePendingDocuments() {
  useEffect(() => {
    void refreshPendingDocuments();
  }, []);
  return useSyncExternalStore(subscribePendingDocuments, pendingDocumentsCount, () => 0);
}

export const profileNav: DashItem[] = [
  { label: "Кабинет", to: "/profile", icon: User },
  { label: "Поездки", to: "/profile/trips", icon: Luggage },
  { label: "Заявки", to: "/profile/requests", icon: Inbox },
  { label: "Сообщения", to: "/profile/messages", icon: MessageSquare },
  { label: "Избранное", to: "/favorites", icon: Heart },
  { label: "Данные туриста", to: "/profile/settings", icon: Settings },
];
