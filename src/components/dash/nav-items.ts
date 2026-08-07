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

export const adminNav: DashItem[] = [
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
