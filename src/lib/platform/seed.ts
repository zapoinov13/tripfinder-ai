import {
  destinations,
  hotels,
  mealLabel,
  operators,
  type MealCode,
  type TourTag,
} from "@/data/demo";
import type {
  Organization,
  PlatformConfig,
  PlatformState,
  PlatformTour,
  PlatformUser,
} from "./types";

export const DEMO_PASSWORD = "demo1234";
export const STORE_KEY = "voyago:platform-v1";

const cities = ["Алматы", "Астана", "Шымкент", "Актау"];
const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const mealCycle: MealCode[] = ["AI", "UAI", "BB", "HB", "FB", "AI", "UAI", "RO", "BB", "AI"];

const fmtDay = (d: Date) => `${d.getDate()} ${monthNames[d.getMonth()]}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

export const defaultConfig = (): PlatformConfig => ({
  premiumMonthlyPrice: 4990,
  premiumCurrency: "KZT",
  operatorPlans: [
    {
      code: "START",
      name: "Start",
      price: 49000,
      currency: "KZT",
      tourLimit: 100,
      features: ["basic analytics", "API", "basic support"],
    },
    {
      code: "BUSINESS",
      name: "Business",
      price: 149000,
      currency: "KZT",
      tourLimit: 1000,
      features: ["advanced analytics", "promotion tools", "featured placements"],
    },
    {
      code: "PRO",
      name: "Pro",
      price: 349000,
      currency: "KZT",
      tourLimit: 5000,
      features: ["advanced promotion", "priority placement", "Premium placements"],
    },
  ],
  promotionPrices: {
    BOOST: 15000,
    FEATURED: 35000,
    SPONSORED: 55000,
    PREMIUM_PLACEMENT: 45000,
    HOME_FEATURE: 75000,
  },
  rankingWeights: {
    relevance: 1,
    price: 1,
    quality: 1,
    rating: 1,
    availability: 1,
    conversion: 1,
    freshness: 1,
    sponsored: 1,
    premium: 1,
  },
  supportedCurrencies: ["KZT", "USD", "EUR"],
});

function buildTours(count: number): PlatformTour[] {
  return Array.from({ length: count }, (_, i) => {
    const hotel = hotels[i % hotels.length]!;
    const nights = [3, 5, 7, 9, 10, 12, 14, 16][i % 8]!;
    const start = new Date(2026, 7, 3 + ((i * 5) % 55));
    const end = new Date(start.getTime() + nights * 86400000);
    const mealCode = mealCycle[i % mealCycle.length]!;
    const mealBonus =
      mealCode === "UAI" ? 180000 : mealCode === "AI" ? 120000 : mealCode === "FB" ? 70000 : 0;
    const base =
      360000 + ((i * 137) % 17) * 62000 + hotel.stars * 95000 + nights * 21000 + mealBonus;
    const price = Math.round(base / 1000) * 1000;
    const isHot = i % 5 === 0;
    const isPremium = i % 7 === 3;
    const isSponsored = i % 9 === 2;
    const tags: TourTag[] = [];
    if (isHot) tags.push("hot");
    if (isPremium) tags.push("premium");
    if (isSponsored) tags.push("sponsored");
    if (i % 11 === 1) tags.push("best");
    const op = operators[i % operators.length]!;

    return {
      id: `tour-${i + 1}`,
      hotelId: hotel.id,
      operatorId: op.id,
      operatorOrgId: `org-${op.id}`,
      from: cities[(i + Math.floor(i / hotels.length)) % cities.length]!,
      nights,
      dateStart: fmtDay(start),
      dateEnd: fmtDay(end),
      departure: iso(start),
      mealCode,
      meal: mealLabel(mealCode),
      price,
      ...(isHot ? { oldPrice: Math.round((price * 1.28) / 1000) * 1000 } : {}),
      ...(isPremium ? { premiumPrice: Math.round((price * 0.82) / 1000) * 1000 } : {}),
      tags,
      adults: [2, 2, 1, 3, 2, 4][i % 6]!,
      children: [0, 2, 1, 0, 2, 1][i % 6]!,
      transfer: hotel.amenities.includes("Transfer") || i % 3 !== 0,
      views: 1200 + ((i * 371) % 9000),
      bookings: 3 + ((i * 7) % 40),
      createdAt: iso(new Date(2026, 5, 1 + ((i * 11) % 60))),
      externalId: `ext-${op.id}-${i + 1}`,
      roomType: hotel.stars >= 5 ? "Deluxe Double" : "Standard Double",
      currency: "KZT" as const,
      availability: 4 + (i % 12),
      status: "active" as const,
      lastSyncedAt: nowIso(),
    };
  });
}

function buildOrgs(): Organization[] {
  const ts = nowIso();
  return operators.map((op, i) => ({
    id: `org-${op.id}`,
    name: op.name,
    legalName: `${op.name} LLP`,
    registrationNumber: `BIN-${100000 + i}`,
    country: "Казахстан",
    city: i % 2 === 0 ? "Алматы" : "Астана",
    address: `ул. Туристов ${i + 1}`,
    phone: `+7 701 000 00${i}`,
    email: `ops@${op.id}.demo`,
    website: `https://${op.id}.demo`,
    contactPerson: `Manager ${i + 1}`,
    status: i === 4 ? ("PENDING_APPROVAL" as const) : ("APPROVED" as const),
    planCode: (i === 0 ? "BUSINESS" : i === 1 ? "PRO" : "START") as Organization["planCode"],
    additionalTourLimit: 0,
    advertisingBalance: 100000,
    promotionBalance: 50000,
    createdAt: ts,
  }));
}

function buildUsers(orgs: Organization[]): PlatformUser[] {
  const ts = nowIso();
  return [
    {
      id: "user-tourist",
      email: "tourist@voyago.demo",
      password: DEMO_PASSWORD,
      name: "Айгерим Турист",
      city: "Алматы",
      role: "TOURIST",
      status: "active",
      createdAt: ts,
    },
    {
      id: "user-premium",
      email: "premium@voyago.demo",
      password: DEMO_PASSWORD,
      name: "Данияр Premium",
      city: "Астана",
      role: "PREMIUM_TOURIST",
      status: "active",
      createdAt: ts,
    },
    {
      id: "user-operator",
      email: "operator@voyago.demo",
      password: DEMO_PASSWORD,
      name: "Алишер Оператор",
      city: "Алматы",
      role: "OPERATOR_ADMIN",
      status: "active",
      organizationId: orgs[0]!.id,
      createdAt: ts,
    },
    {
      id: "user-pending",
      email: "pending@voyago.demo",
      password: DEMO_PASSWORD,
      name: "Новый Оператор",
      city: "Шымкент",
      role: "OPERATOR_ADMIN",
      status: "active",
      organizationId: orgs[4]!.id,
      createdAt: ts,
    },
    {
      id: "user-admin",
      email: "admin@voyago.demo",
      password: DEMO_PASSWORD,
      name: "Admin Voyago",
      city: "Алматы",
      role: "PLATFORM_ADMIN",
      status: "active",
      createdAt: ts,
    },
    {
      id: "user-manager",
      email: "manager@voyago.demo",
      password: DEMO_PASSWORD,
      name: "Менеджер Оператор",
      city: "Алматы",
      role: "OPERATOR_MANAGER",
      status: "active",
      organizationId: orgs[0]!.id,
      createdAt: ts,
    },
  ];
}

export function createSeedState(): PlatformState {
  const orgs = buildOrgs();
  const users = buildUsers(orgs);
  const tours = buildTours(200);
  const ts = nowIso();

  return {
    version: 1,
    seededAt: ts,
    config: defaultConfig(),
    users,
    organizations: orgs,
    members: [
      {
        id: "mem-1",
        organizationId: orgs[0]!.id,
        userId: "user-operator",
        role: "OPERATOR_ADMIN",
      },
      {
        id: "mem-2",
        organizationId: orgs[0]!.id,
        userId: "user-manager",
        role: "OPERATOR_MANAGER",
      },
      {
        id: "mem-3",
        organizationId: orgs[4]!.id,
        userId: "user-pending",
        role: "OPERATOR_ADMIN",
      },
    ],
    destinations,
    hotels,
    operators,
    tours,
    bookings: [],
    payments: [],
    subscriptions: [
      {
        id: "sub-premium",
        userId: "user-premium",
        planId: "premium-monthly",
        status: "active",
        startedAt: ts,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        autoRenew: true,
        providerSubscriptionId: "mock-sub-premium",
      },
      {
        id: "sub-op-1",
        organizationId: orgs[0]!.id,
        planId: "BUSINESS",
        status: "active",
        startedAt: ts,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        autoRenew: true,
      },
    ],
    favorites: [],
    comparisons: [],
    priceAlerts: [],
    aiSearches: [],
    notifications: [
      {
        id: "notif-1",
        userId: "user-tourist",
        type: "important_update",
        title: "Добро пожаловать в Voyago",
        body: "Начните поиск тура или опишите поездку AI-консьержу.",
        read: false,
        createdAt: ts,
      },
      {
        id: "notif-2",
        userId: "user-premium",
        type: "premium_deal",
        title: "Premium Deal доступен",
        body: "Открыты закрытые цены на Дубай и Турцию.",
        read: false,
        createdAt: ts,
      },
      {
        id: "notif-3",
        userId: "user-operator",
        type: "subscription_expiry",
        title: "Тариф Business активен",
        body: "Лимит активных туров: 1000.",
        read: true,
        createdAt: ts,
      },
      {
        id: "notif-4",
        userId: "user-admin",
        type: "operator_approval",
        title: "Новая заявка оператора",
        body: "Silk Road Voyage ожидает APPROVAL.",
        read: false,
        createdAt: ts,
      },
    ],
    auditLogs: [
      {
        id: "audit-1",
        actorId: "user-admin",
        action: "seed",
        entityType: "platform",
        createdAt: ts,
        meta: { note: "Initial local MVP seed" },
      },
    ],
    analyticsEvents: [],
    apiConnections: [
      {
        id: "api-1",
        organizationId: orgs[0]!.id,
        provider: "MockOperator",
        endpoint: "https://mock.voyago.local/api",
        apiKeyMasked: "****demo",
        secretMasked: "****cret",
        apiKey: "demo-api-key",
        secret: "demo-secret",
        authType: "api_key",
        currency: "KZT",
        syncIntervalMin: 60,
        status: "connected",
        lastSyncAt: ts,
      },
    ],
    syncLogs: [
      {
        id: "sync-1",
        organizationId: orgs[0]!.id,
        status: "success",
        toursImported: 40,
        toursUpdated: 12,
        toursRemoved: 0,
        message: "Initial sync OK",
        createdAt: ts,
      },
    ],
    promotions: [],
    session: null,
  };
}
