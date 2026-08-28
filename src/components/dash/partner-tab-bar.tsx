import { useRouterState } from "@tanstack/react-router";
import { CalendarClock, Inbox, LayoutGrid, Luggage, MoreHorizontal } from "lucide-react";

import { TabBarShell, type TabItem } from "@/components/site/tab-bar-shell";
import { useAuth } from "@/lib/platform/auth";
import { isBusinessOnlyServices } from "@/lib/platform/company-categories";
import { usePlatformStore } from "@/lib/platform/hooks";

/**
 * Нижняя навигация партнёра.
 *
 * Партнёр работает с телефона между клиентами, а не за компьютером: раньше
 * ему доставались туристические «Избранное» и «Поиск», а свои разделы прятались
 * под гамбургером. Здесь четыре его собственных: день, входящие, витрина и всё
 * остальное. «Ещё» открывает то же меню, что и гамбургер, — тупика нет.
 */
export function PartnerTabBar({ onMore }: { onMore: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const state = usePlatformStore();

  const orgId = user?.organizationId;
  const org = state.organizations.find((o) => o.id === orgId);
  const isBusiness = isBusinessOnlyServices(org?.services);

  // Записи, которые ждут ответа, и непрочитанные сообщения клиентов.
  const newRequests = orgId
    ? isBusiness
      ? state.serviceRequests.filter((r) => r.organizationId === orgId && r.status === "NEW").length
      : state.tripRequests.filter(
          (r) =>
            r.status !== "CHOSEN" &&
            r.status !== "CLOSED" &&
            !r.declinedByOrgIds.includes(orgId) &&
            !state.requestOffers.some((o) => o.organizationId === orgId && o.requestId === r.id),
        ).length
    : 0;

  const unread = orgId
    ? state.serviceMessages.filter(
        (m) => m.organizationId === orgId && m.authorSide === "CLIENT" && !m.readByCompany,
      ).length +
      state.requestMessages.filter(
        (m) => m.organizationId === orgId && m.authorSide === "TOURIST" && !m.readByCompany,
      ).length
    : 0;

  const tabs: TabItem[] = [
    {
      id: "today",
      label: isBusiness ? "Сегодня" : "Главная",
      to: "/operator",
      icon: CalendarClock,
      match: (p) => p === "/operator",
    },
    {
      id: "requests",
      label: "Заявки",
      to: "/operator/requests",
      icon: Inbox,
      match: (p) => p === "/operator/requests" || p === "/operator/offers",
      badge: newRequests,
    },
    isBusiness
      ? {
          id: "listings",
          label: "Объявления",
          to: "/operator/services",
          icon: LayoutGrid,
          match: (p) => p === "/operator/services",
        }
      : {
          id: "tours",
          label: "Туры",
          to: "/operator/tours",
          icon: Luggage,
          match: (p) => p === "/operator/tours" || p === "/operator/bookings",
        },
    {
      id: "more",
      label: "Ещё",
      to: "/operator",
      icon: MoreHorizontal,
      match: (p) =>
        p.startsWith("/operator/") &&
        ![
          "/operator/requests",
          "/operator/offers",
          "/operator/services",
          "/operator/tours",
          "/operator/bookings",
        ].includes(p),
      badge: unread,
      action: onMore,
    },
  ];

  return <TabBarShell tabs={tabs} pathname={pathname} />;
}
