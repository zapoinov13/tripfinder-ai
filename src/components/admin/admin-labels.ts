import type { Role } from "@/lib/platform-contracts";
import type {
  BookingStatus,
  OrganizationStatus,
  PaymentStatus,
  PaymentType,
  PromotionType,
  UserStatus,
} from "@/lib/platform/types";

export const roleLabel: Record<Role, string> = {
  TOURIST: "Турист",
  PREMIUM_TOURIST: "Premium-турист",
  OPERATOR_ADMIN: "Админ поставщика",
  OPERATOR_MANAGER: "Менеджер поставщика",
  PLATFORM_ADMIN: "Админ платформы",
  PLATFORM_MANAGER: "Менеджер платформы",
};

export const userStatusLabel: Record<UserStatus, string> = {
  active: "Активен",
  suspended: "Заморожен",
};

export const orgStatusLabel: Record<OrganizationStatus, string> = {
  PENDING_APPROVAL: "Ожидает одобрения",
  APPROVED: "Одобрен",
  REJECTED: "Отклонён",
  SUSPENDED: "Приостановлен",
};

export const tourStatusLabel: Record<string, string> = {
  active: "Активен",
  inactive: "Неактивен",
  expired: "Истёк",
  hidden: "Скрыт",
  blocked: "Заблокирован",
  draft: "Черновик",
};

export const bookingStatusLabel: Record<BookingStatus, string> = {
  PENDING: "Ожидает",
  PRICE_CHECK: "Проверка цены",
  AWAITING_PAYMENT: "Ожидает оплату",
  PAID: "Оплачено",
  CONFIRMING: "Подтверждается",
  CONFIRMED: "Подтверждено",
  CANCELLED: "Отменено",
  FAILED: "Ошибка",
  COMPLETED: "Завершено",
  Draft: "Черновик",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Ожидает",
  paid: "Оплачен",
  failed: "Ошибка",
  cancelled: "Отменён",
};

export const paymentTypeLabel: Record<PaymentType, string> = {
  premium_subscription: "Premium-подписка",
  operator_subscription: "Подписка поставщика",
  tour_package: "Пакет туров",
  promotion: "Продвижение",
  advertising: "Реклама",
  booking: "Бронирование",
};

export const promoTypeLabel: Record<PromotionType, string> = {
  BOOST: "Буст",
  FEATURED: "В топе",
  SPONSORED: "Спонсорский",
  PREMIUM_PLACEMENT: "Premium-размещение",
  HOME_FEATURE: "На главной",
};

export const promoStatusLabel: Record<string, string> = {
  ACTIVE: "Активно",
  active: "Активно",
  pending: "Ожидает",
  EXPIRED: "Истекло",
  expired: "Истекло",
  CANCELLED: "Отменено",
  cancelled: "Отменено",
};

export const connectionStatusLabel: Record<string, string> = {
  connected: "Подключено",
  disconnected: "Отключено",
  error: "Ошибка",
  syncing: "Синхронизация",
};

export const syncStatusLabel: Record<string, string> = {
  success: "Успех",
  error: "Ошибка",
  partial: "Частично",
};

export const auditActionLabel: Record<string, string> = {
  user_suspend: "Блокировка пользователя",
  user_restore: "Восстановление пользователя",
  user_role_change: "Смена роли",
  operator_status: "Статус поставщика",
  operator_plan_admin: "Тариф поставщика",
  tour_hide: "Скрытие тура",
  tour_block: "Блокировка тура",
  tour_restore: "Восстановление тура",
  tour_feature: "Выделение тура",
  booking_confirm: "Подтверждение брони",
  booking_cancel: "Отмена брони",
  premium_price_update: "Цена Premium",
  promotion_prices_update: "Цены продвижения",
  promotion_deactivate: "Деактивация промо",
  api_connection_saved: "Сохранение API",
  api_sync: "Синхронизация API",
  store_reset: "Сброс данных",
};

export const auditEntityLabel: Record<string, string> = {
  user: "пользователь",
  organization: "организация",
  tour: "тур",
  config: "настройки",
  booking: "бронирование",
  promotion: "продвижение",
  api_connection: "API-подключение",
  store: "хранилище",
};

export const eventLabel: Record<string, string> = {
  page_view: "Просмотры страниц",
  search: "Поиски",
  tour_view: "Просмотры туров",
  favorite_add: "В избранное",
  booking_start: "Старт бронирования",
  booking_complete: "Бронирование завершено",
  premium_click: "Клики Premium",
  login: "Входы",
  register: "Регистрации",
};

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "premium";

export function toneForUserStatus(status: UserStatus): BadgeTone {
  return status === "active" ? "success" : "danger";
}

export function toneForOrgStatus(status: OrganizationStatus): BadgeTone {
  if (status === "APPROVED") return "success";
  if (status === "PENDING_APPROVAL") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export function toneForTourStatus(status: string): BadgeTone {
  if (status === "active") return "success";
  if (status === "hidden" || status === "inactive") return "neutral";
  if (status === "blocked" || status === "expired") return "danger";
  return "info";
}

export function toneForBookingStatus(status: BookingStatus): BadgeTone {
  if (status === "CONFIRMED" || status === "COMPLETED" || status === "PAID") return "success";
  if (status === "CANCELLED" || status === "FAILED") return "danger";
  if (status === "PENDING" || status === "AWAITING_PAYMENT" || status === "PRICE_CHECK")
    return "warning";
  return "info";
}

export function toneForPaymentStatus(status: PaymentStatus): BadgeTone {
  if (status === "paid") return "success";
  if (status === "failed" || status === "cancelled") return "danger";
  return "warning";
}

export function toneForConnectionStatus(status: string): BadgeTone {
  if (status === "connected") return "success";
  if (status === "error") return "danger";
  if (status === "syncing") return "info";
  return "neutral";
}
