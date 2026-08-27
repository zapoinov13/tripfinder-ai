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
  user_suspend: "Пользователь заморожен",
  user_restore: "Пользователь разморожен",
  user_delete: "Пользователь удалён",
  user_role_change: "Смена роли пользователя",
  user_to_partner: "Пользователь переведён в партнёры",
  operator_status: "Смена статуса партнёра",
  operator_plan_admin: "Смена тарифа партнёра",
  organization_delete: "Компания удалена",
  tour_hide: "Тур скрыт",
  tour_block: "Тур заблокирован",
  tour_restore: "Тур восстановлен",
  tour_feature: "Тур выделен",
  tour_delete: "Тур удалён",
  booking_confirm: "Бронь подтверждена",
  booking_cancel: "Бронь отменена",
  premium_price_update: "Изменена цена Premium",
  promotion_prices_update: "Изменены цены продвижения",
  promotion_deactivate: "Продвижение снято",
  promotion_purchased: "Куплено продвижение",
  promotion_granted_by_admin: "Продвижение запущено админом",
  promotion_balance_topup_admin: "Начислен баланс продвижения",
  api_connection_saved: "Сохранено API-подключение",
  api_sync: "Синхронизация фида",
  api_auto_sync: "Автосинхронизация фидов",
  store_reset: "Сброс данных",
  seed: "Инициализация платформы",
  push_broadcast: "Push-рассылка",
  platform_config_update: "Изменены настройки платформы",
  service_request_confirmed: "Заявка клиента подтверждена",
  service_request_declined: "Заявка клиента отклонена",
  service_request_done: "Заявка клиента выполнена",
  service_request_cancelled: "Заявка клиента отменена",
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
  service_request: "заявка клиента",
};

// Ключи должны совпадать с типами, которые реально пишет trackEvent(...).
export const eventLabel: Record<string, string> = {
  LOGIN: "Входы",
  SEARCH_COMPLETED: "Поиски",
  AI_SEARCH_STARTED: "AI-поиски",
  TOUR_VIEWED: "Просмотры туров",
  TOUR_FAVORITED: "В избранное",
  TOUR_COMPARED: "В сравнение",
  BOOKING_STARTED: "Старт бронирования",
  BOOKING_CREATED: "Бронирование создано",
  PAYMENT_STARTED: "Оплата начата",
  PAYMENT_COMPLETED: "Оплата завершена",
  PREMIUM_VIEWED: "Просмотры Premium",
  PREMIUM_PURCHASED: "Покупки Premium",
  PROMOTION_PURCHASED: "Покупки продвижения",
  REQUEST_CREATED: "Заявки",
  OFFER_SENT: "Предложения",
  MESSAGE_SENT: "Сообщения",
  COMPANY_PAGE_VIEW: "Просмотры компаний",
  COMPANY_CONTACT_CLICK: "Клики по контактам",
  COMPANY_CHECKIN: "Визиты из приложения",
  SERVICE_REQUEST_CREATED: "Заявки в компании",
  SERVICE_MESSAGE_SENT: "Сообщения по заявкам",
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
