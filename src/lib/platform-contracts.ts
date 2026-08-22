import type { MealCode, Tour } from "@/data/demo";

export type Role =
  | "TOURIST"
  | "PREMIUM_TOURIST"
  | "OPERATOR_ADMIN"
  | "OPERATOR_MANAGER"
  | "PLATFORM_ADMIN"
  | "PLATFORM_MANAGER";

export const rolePermissions: Record<Role, string[]> = {
  TOURIST: ["search:tours", "favorite:tours", "compare:tours", "booking:create"],
  PREMIUM_TOURIST: [
    "search:tours",
    "favorite:tours",
    "compare:tours",
    "booking:create",
    "premium:view",
  ],
  OPERATOR_ADMIN: ["operator:tours", "operator:billing", "operator:team", "operator:analytics"],
  OPERATOR_MANAGER: ["operator:tours", "operator:analytics", "operator:bookings"],
  PLATFORM_ADMIN: ["admin:all"],
  PLATFORM_MANAGER: ["admin:users", "admin:operators", "admin:tours", "admin:analytics"],
};

export type NormalizedTourOffer = Tour & {
  externalId: string;
  roomType: string;
  currency: "KZT" | "USD" | "EUR";
  availability: number;
  lastSyncedAt: string;
};

export interface TourOperatorAdapter {
  connect(): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  getDestinations(): Promise<Array<{ externalId: string; name: string }>>;
  getHotels(destinationExternalId: string): Promise<Array<{ externalId: string; name: string }>>;
  getTours(): Promise<NormalizedTourOffer[]>;
  getAvailability(externalTourId: string): Promise<{ available: boolean; seats: number }>;
  getPrices(externalTourId: string): Promise<{ price: number; currency: string }>;
  createBooking(externalTourId: string, payload: unknown): Promise<{ externalBookingId: string }>;
  getBookingStatus(externalBookingId: string): Promise<string>;
  cancelBooking(externalBookingId: string): Promise<{ cancelled: boolean }>;
}

export const normalizeMealType = (value: string): MealCode => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "ALL" || normalized === "ALL_INCLUSIVE") return "AI";
  if (normalized === "ULTRA_ALL_INCLUSIVE") return "UAI";
  if (["RO", "BB", "HB", "FB", "AI", "UAI"].includes(normalized)) return normalized as MealCode;
  return "RO";
};

export type NotificationType =
  | "booking"
  | "price_drop"
  | "premium_deal"
  | "trip_reminder"
  | "api_error"
  | "payment_failure"
  | "operator_approval";

export interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendPush(userId: string, title: string, body: string): Promise<void>;
  sendInApp(userId: string, type: NotificationType, payload: unknown): Promise<void>;
  sendSMS(phone: string, body: string): Promise<void>;
}

export interface PaymentProvider {
  createPayment(input: {
    amount: number;
    currency: string;
    type:
      | "premium_subscription"
      | "operator_subscription"
      | "tour_package"
      | "promotion"
      | "advertising"
      | "booking";
    metadata?: Record<string, unknown>;
  }): Promise<{ providerPaymentId: string; redirectUrl?: string }>;
  getPaymentStatus(providerPaymentId: string): Promise<"pending" | "paid" | "failed" | "cancelled">;
}

export type OperatorPlan = {
  code: "START" | "BUSINESS" | "PRO";
  activeTourLimit: number;
  features: string[];
};

/** Plan feature flags used by product copy and gates. */
export const operatorPlanFeatureLabels: Record<OperatorPlan["code"], string[]> = {
  START: ["manual", "url", "telegram"],
  BUSINESS: ["manual", "url", "telegram", "api_feed"],
  PRO: ["manual", "url", "telegram", "api_feed", "live_price", "priority"],
};

export const canCreateTour = (activeTours: number, plan: OperatorPlan, extraLimit = 0) =>
  activeTours < plan.activeTourLimit + extraLimit;
