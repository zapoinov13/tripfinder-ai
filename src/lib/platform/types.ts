import type { Destination, Hotel, MealCode, Operator, Tour, TourTag } from "@/data/demo";
import type { Role } from "@/lib/platform-contracts";
import type { SearchParams } from "@/lib/search";

export type Currency = "KZT" | "USD" | "EUR";

export type UserStatus = "active" | "suspended";

export type OrganizationStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type BookingStatus =
  | "PENDING"
  | "PRICE_CHECK"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "CONFIRMING"
  | "CONFIRMED"
  | "CANCELLED"
  | "FAILED"
  | "COMPLETED"
  | "Draft";

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export type PaymentType =
  | "premium_subscription"
  | "operator_subscription"
  | "tour_package"
  | "promotion"
  | "advertising"
  | "booking";

export type PromotionType =
  "BOOST" | "FEATURED" | "SPONSORED" | "PREMIUM_PLACEMENT" | "HOME_FEATURE";

export type OperatorPlanCode = "START" | "BUSINESS" | "PRO";

export type PlatformUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  city: string;
  role: Role;
  status: UserStatus;
  organizationId?: string;
  createdAt: string;
};

export type Organization = {
  id: string;
  name: string;
  legalName: string;
  registrationNumber: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  contactPerson: string;
  status: OrganizationStatus;
  planCode: OperatorPlanCode;
  additionalTourLimit: number;
  advertisingBalance: number;
  promotionBalance: number;
  createdAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: "OPERATOR_ADMIN" | "OPERATOR_MANAGER";
};

export type PlatformTour = Tour & {
  externalId: string;
  roomType: string;
  currency: Currency;
  availability: number;
  status: "active" | "inactive" | "expired" | "hidden" | "blocked";
  lastSyncedAt: string;
  operatorOrgId: string;
};

export type BookingPassenger = {
  firstName: string;
  lastName: string;
  birthDate?: string;
  type: "adult" | "child";
};

export type Booking = {
  id: string;
  userId: string;
  operatorId: string;
  organizationId: string;
  tourOfferId: string;
  externalBookingId?: string;
  status: BookingStatus;
  passengers: BookingPassenger[];
  price: number;
  currency: Currency;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  userId: string;
  organizationId?: string;
  amount: number;
  currency: Currency;
  type: PaymentType;
  provider: "mock";
  providerPaymentId: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type Subscription = {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  status: "active" | "expired" | "cancelled";
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  providerSubscriptionId?: string;
};

export type Favorite = {
  id: string;
  userId: string;
  tourId: string;
  createdAt: string;
};

export type Comparison = {
  userId: string;
  tourIds: string[];
};

export type PriceAlert = {
  id: string;
  userId: string;
  tourId: string;
  targetPrice: number;
  currentPrice: number;
  currency: Currency;
  status: "active" | "triggered";
  createdAt: string;
};

export type AiSearchRecord = {
  id: string;
  userId: string;
  originalQuery: string;
  parsed: Record<string, unknown>;
  searchParams: Partial<SearchParams>;
  resultsCount: number;
  createdAt: string;
};

export type PlatformNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type AuditLog = {
  id: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type AnalyticsEvent = {
  id: string;
  type: string;
  userId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type OperatorApiConnection = {
  id: string;
  organizationId: string;
  provider: string;
  endpoint: string;
  apiKeyMasked: string;
  secretMasked: string;
  apiKey: string;
  secret: string;
  authType: "api_key" | "basic" | "bearer";
  currency: Currency;
  syncIntervalMin: number;
  status: "connected" | "error" | "disconnected";
  lastSyncAt?: string;
  lastError?: string;
};

export type SyncLog = {
  id: string;
  organizationId: string;
  status: "success" | "error" | "partial";
  toursImported: number;
  toursUpdated: number;
  toursRemoved: number;
  message: string;
  createdAt: string;
};

export type PromotionOrder = {
  id: string;
  organizationId: string;
  tourOfferId: string;
  type: PromotionType;
  durationDays: number;
  price: number;
  currency: Currency;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startedAt: string;
  expiresAt: string;
};

export type PlatformConfig = {
  premiumMonthlyPrice: number;
  premiumCurrency: Currency;
  operatorPlans: Array<{
    code: OperatorPlanCode;
    name: string;
    price: number;
    currency: Currency;
    tourLimit: number;
    features: string[];
  }>;
  promotionPrices: Record<PromotionType, number>;
  rankingWeights: {
    relevance: number;
    price: number;
    quality: number;
    rating: number;
    availability: number;
    conversion: number;
    freshness: number;
    sponsored: number;
    premium: number;
  };
  supportedCurrencies: Currency[];
};

export type Session = {
  userId: string;
  createdAt: string;
};

export type PlatformState = {
  version: number;
  seededAt: string;
  config: PlatformConfig;
  users: PlatformUser[];
  organizations: Organization[];
  members: OrganizationMember[];
  destinations: Destination[];
  hotels: Hotel[];
  operators: Operator[];
  tours: PlatformTour[];
  bookings: Booking[];
  payments: Payment[];
  subscriptions: Subscription[];
  favorites: Favorite[];
  comparisons: Comparison[];
  priceAlerts: PriceAlert[];
  aiSearches: AiSearchRecord[];
  notifications: PlatformNotification[];
  auditLogs: AuditLog[];
  analyticsEvents: AnalyticsEvent[];
  apiConnections: OperatorApiConnection[];
  syncLogs: SyncLog[];
  promotions: PromotionOrder[];
  session: Session | null;
};

export type { Destination, Hotel, MealCode, Operator, Role, Tour, TourTag, SearchParams };
