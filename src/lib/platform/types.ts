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
  /** Какие уведомления получать: пустое поле = все. */
  notifyPrefs?: NotifyPrefs;
  createdAt: string;
};

/** Тумблеры уведомлений партнёра. */
export type NotifyPrefs = {
  requests: boolean;
  messages: boolean;
  reviews: boolean;
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
  /** Чем занимается компания: туры, отели, экскурсии, трансферы и т. д. */
  services?: string[];
  /** Страны, в которых компания работает. */
  countries?: string[];
  /** Страны, из которых принимает клиентов. */
  clientCountries?: string[];
  languages?: string[];
  about?: string;
  logoUrl?: string;
  coverUrl?: string;
  /** Ссылки на фотографии компании и туров, которые видит турист. */
  photos?: string[];
  videos?: string[];
  whatsapp?: string;
  instagram?: string;
  telegram?: string;
  /** Часы работы: показываются на публичной странице. */
  workingHours?: string;
  bookingSchedule?: BookingSchedule;
  /** Текущая акция и срок её действия (ISO-дата). */
  promoText?: string;
  promoUntil?: string;
  /**
   * Карточку завела платформа по ссылке, владелец её ещё не подтвердил.
   * Такие компании честно помечены в витрине: на записи там никто не ответит.
   */
  listedByPlatform?: boolean;
  /**
   * Когда админ платформы подтвердил документы.
   *
   * Знак «Проверена» рисуется только по этому полю. На статус его вешать
   * нельзя: компании открываются автоматически, и знак оказался бы у всех —
   * турист видел бы «проверена» там, где никто ничего не проверял.
   */
  documentsVerifiedAt?: string;
  /** Названия загруженных документов для проверки компании. */
  documents?: string[];
  /** Загруженные файлы для проверки (хранятся локально / в профиле). */
  verificationFiles?: CompanyVerificationFile[];
  verificationSubmittedAt?: string;
};

export type VerificationDocumentId =
  "registration" | "tourism_license" | "liability_insurance" | "commercial_license";

export type CompanyVerificationFile = {
  type: VerificationDocumentId;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  dataUrl: string;
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
  provider: "mock" | "balance";
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

/** «Заявка туриста»: подбор тура или помощь во время поездки. */
export type TripRequestKind = "tour" | "assistance";

export type TripRequestStatus = "NEW" | "IN_REVIEW" | "OFFERS_RECEIVED" | "CHOSEN" | "CLOSED";

export type TripRequest = {
  id: string;
  userId: string;
  kind: TripRequestKind;
  fromCity: string;
  destinationId: string;
  destinationLabel: string;
  dateStart: string;
  dateEnd: string;
  adults: number;
  children: number;
  budget: number;
  currency: Currency;
  wishes: string;
  contactName: string;
  contactPhone: string;
  status: TripRequestStatus;
  chosenOfferId?: string;
  declinedByOrgIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type RequestOfferStatus = "SENT" | "CHOSEN" | "DECLINED";

export type RequestOffer = {
  id: string;
  requestId: string;
  organizationId: string;
  tourId?: string;
  hotelName: string;
  nights: number;
  meal: string;
  flightIncluded: boolean;
  transferIncluded: boolean;
  insuranceIncluded: boolean;
  price: number;
  currency: Currency;
  includes: string;
  comment: string;
  status: RequestOfferStatus;
  createdAt: string;
};

/**
 * Заявка клиента бизнесу: запись в зал, бронь квартиры или авто.
 * Это не туровая заявка — здесь нет отелей, ночей и питания, только
 * дата, время и контакт. Живёт параллельно с TripRequest.
 */
export type ServiceRequestStatus = "NEW" | "CONFIRMED" | "DECLINED" | "DONE" | "CANCELLED";

export type ServiceRequest = {
  id: string;
  organizationId: string;
  /** Пусто, если заявку оставил гость без аккаунта. */
  userId?: string;
  /** Объявление, из которого пришла заявка (если пришла со страницы компании — пусто). */
  listingId?: string;
  listingName: string;
  contactName: string;
  contactPhone: string;
  /** Желаемая дата в формате YYYY-MM-DD. */
  date: string;
  /** Желаемое время, например «19:00». */
  time: string;
  people: number;
  comment: string;
  status: ServiceRequestStatus;
  /** Ответ компании клиенту при подтверждении или отказе. */
  replyComment?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Расписание записи: часы по дням недели, длина слота и вместимость.
 * Ключ дня — номер по Date.getDay(): 0 = воскресенье.
 */
export type BookingDayHours = { open: string; close: string };

export type BookingSchedule = {
  enabled: boolean;
  slotMinutes: number;
  /** Сколько записей компания принимает в один слот. */
  capacity: number;
  /** На сколько дней вперёд можно записаться. */
  horizonDays: number;
  days: Record<string, BookingDayHours | null>;
  /** Разовые закрытые даты (YYYY-MM-DD): праздники, отпуск, ремонт. */
  closedDates?: string[];
};

/** Переписка клиента и компании по заявке на запись. */
export type ServiceMessage = {
  id: string;
  requestId: string;
  organizationId: string;
  /** Автор сообщения: клиент или сотрудник компании. */
  userId: string;
  authorSide: "CLIENT" | "COMPANY";
  authorName: string;
  text: string;
  readByClient: boolean;
  readByCompany: boolean;
  createdAt: string;
};

/** Переписка туриста и турфирмы по конкретной заявке. */
export type RequestMessage = {
  id: string;
  requestId: string;
  organizationId: string;
  userId: string;
  authorSide: "TOURIST" | "COMPANY";
  authorName: string;
  text: string;
  readByTourist: boolean;
  readByCompany: boolean;
  createdAt: string;
};

export type CompanyReview = {
  id: string;
  organizationId: string;
  userId: string;
  authorName: string;
  requestId?: string;
  rating: number;
  text: string;
  createdAt: string;
  /** Публичный ответ турфирмы на отзыв. */
  reply?: string;
  replyAt?: string;
  replyByUserId?: string;
  replyByName?: string;
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

/**
 * Заявка владельца на карточку, которую завела платформа.
 * Решение принимает админ: он и проверяет, что человек — действительно
 * владелец бизнеса, а не тот, кто первым нашёл страницу.
 */
export type CompanyClaimStatus = "NEW" | "APPROVED" | "DECLINED";

export type CompanyClaim = {
  id: string;
  organizationId: string;
  userId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  /** Чем подтверждает: сайт, почта на домене, документы. */
  proof: string;
  status: CompanyClaimStatus;
  decidedBy?: string;
  decidedAt?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
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
  tripRequests: TripRequest[];
  requestOffers: RequestOffer[];
  requestMessages: RequestMessage[];
  serviceRequests: ServiceRequest[];
  serviceMessages: ServiceMessage[];
  companyClaims: CompanyClaim[];
  companyReviews: CompanyReview[];
  session: Session | null;
};

export type { Destination, Hotel, MealCode, Operator, Role, Tour, TourTag, SearchParams };
