import { getHotel } from "./catalog";
import { getCompanyRating, getCompanyReviews } from "./messages";
import { getActiveOrgPromotions } from "./promotions";
import { getState } from "./store";
import type { PlatformTour, TripRequest } from "./types";

export type AnalyticsPeriod = 7 | 30 | 0;

export type OperatorAnalytics = {
  period: AnalyticsPeriod;
  periodLabel: string;
  views: number;
  viewsPrev: number;
  favorites: number;
  favoritesPrev: number;
  offersSent: number;
  offersSentPrev: number;
  chosen: number;
  chosenPrev: number;
  declined: number;
  winRate: number;
  revenue: number;
  revenuePrev: number;
  paidBookings: number;
  promoSpend: number;
  activePromos: number;
  openRequests: number;
  unreadMessages: number;
  avgResponseHours: number | null;
  rating: { average: number; count: number } | null;
  unrepliedReviews: number;
  funnel: Array<{ label: string; value: number; hint: string }>;
  topTours: Array<{
    tour: PlatformTour;
    hotel: ReturnType<typeof getHotel>;
    views: number;
    bookings: number;
    conversion: number;
  }>;
  cities: Array<{ city: string; views: number; bookings: number }>;
  trend: Array<{ day: string; views: number; offers: number; picks: number; revenue: number }>;
  insights: Array<{
    tone: "warn" | "ok" | "info";
    title: string;
    text: string;
    to: string;
    cta: string;
  }>;
};

function inRange(iso: string, startMs: number, endMs: number) {
  const t = new Date(iso).getTime();
  return t >= startMs && t < endMs;
}

function periodBounds(days: AnalyticsPeriod, offsetDays = 0) {
  if (days === 0) {
    return { start: 0, end: Date.now() + 1, prevStart: 0, prevEnd: 0 };
  }
  const end = Date.now() - offsetDays * 86400000;
  const start = end - days * 86400000;
  const prevEnd = start;
  const prevStart = prevEnd - days * 86400000;
  return { start, end, prevStart, prevEnd };
}

export function pct(part: number, whole: number) {
  if (!whole) return "0%";
  const value = (part / whole) * 100;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`;
}

export function deltaLabel(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.abs(change) < 10 ? change.toFixed(1) : String(Math.round(change));
  return `${change >= 0 ? "+" : ""}${rounded}%`;
}

function countViews(orgTourIds: Set<string>, start: number, end: number) {
  return getState().analyticsEvents.filter(
    (e) =>
      e.type === "TOUR_VIEWED" &&
      inRange(e.createdAt, start, end) &&
      orgTourIds.has(String(e.payload?.["tourId"] ?? "")),
  ).length;
}

function avgResponseHours(orgId: string, start: number, end: number) {
  const state = getState();
  const samples: number[] = [];
  for (const offer of state.requestOffers) {
    if (offer.organizationId !== orgId || !inRange(offer.createdAt, start, end)) continue;
    const request = state.tripRequests.find((r) => r.id === offer.requestId);
    if (!request) continue;
    const diff = new Date(offer.createdAt).getTime() - new Date(request.createdAt).getTime();
    if (diff >= 0) samples.push(diff / 3600000);
  }
  if (samples.length === 0) return null;
  return Math.round((samples.reduce((a, b) => a + b, 0) / samples.length) * 10) / 10;
}

function lastDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (count - 1 - i));
    return d;
  });
}

export function computeOperatorAnalytics(orgId: string, period: AnalyticsPeriod): OperatorAnalytics {
  const state = getState();
  const { start, end, prevStart, prevEnd } = periodBounds(period);
  const tours = state.tours.filter((t) => t.operatorOrgId === orgId);
  const tourIds = new Set(tours.map((t) => t.id));

  const views = countViews(tourIds, start, end);
  const viewsPrev = period === 0 ? 0 : countViews(tourIds, prevStart, prevEnd);

  const favorites = state.favorites.filter(
    (f) => tourIds.has(f.tourId) && inRange(f.createdAt, start, end),
  ).length;
  const favoritesPrev =
    period === 0
      ? 0
      : state.favorites.filter((f) => tourIds.has(f.tourId) && inRange(f.createdAt, prevStart, prevEnd))
          .length;

  const myOffers = state.requestOffers.filter(
    (o) => o.organizationId === orgId && inRange(o.createdAt, start, end),
  );
  const myOffersPrev =
    period === 0
      ? []
      : state.requestOffers.filter(
          (o) => o.organizationId === orgId && inRange(o.createdAt, prevStart, prevEnd),
        );

  const chosen = myOffers.filter((o) => o.status === "CHOSEN");
  const chosenPrev = myOffersPrev.filter((o) => o.status === "CHOSEN");
  const declined = myOffers.filter((o) => o.status === "DECLINED");

  const paid = state.bookings.filter(
    (b) =>
      b.organizationId === orgId &&
      ["PAID", "CONFIRMED", "COMPLETED"].includes(b.status) &&
      inRange(b.createdAt, start, end),
  );
  const paidPrev =
    period === 0
      ? []
      : state.bookings.filter(
          (b) =>
            b.organizationId === orgId &&
            ["PAID", "CONFIRMED", "COMPLETED"].includes(b.status) &&
            inRange(b.createdAt, prevStart, prevEnd),
        );

  const revenue = paid.reduce((s, b) => s + b.price, 0);
  const revenuePrev = paidPrev.reduce((s, b) => s + b.price, 0);

  const promoSpend = state.payments
    .filter(
      (p) =>
        p.organizationId === orgId &&
        p.type === "promotion" &&
        p.status === "paid" &&
        inRange(p.createdAt, start, end),
    )
    .reduce((s, p) => s + p.amount, 0);

  const answeredIds = new Set(
    state.requestOffers.filter((o) => o.organizationId === orgId).map((o) => o.requestId),
  );
  const openRequests = state.tripRequests.filter(
    (r: TripRequest) =>
      r.status !== "CHOSEN" &&
      r.status !== "CLOSED" &&
      !r.declinedByOrgIds.includes(orgId) &&
      !answeredIds.has(r.id),
  ).length;

  const unreadMessages = state.requestMessages.filter(
    (m) => m.organizationId === orgId && m.authorSide === "TOURIST" && !m.readByCompany,
  ).length;

  const catalogBookings = tours.reduce((s, t) => s + t.bookings, 0);
  const rating = getCompanyRating(orgId);
  const reviews = getCompanyReviews(orgId);
  const unrepliedReviews = reviews.filter((r) => !r.reply?.trim()).length;

  const topTours = [...tours]
    .map((tour) => {
      const hotel = getHotel(tour.hotelId);
      const tourViews = countViews(new Set([tour.id]), start, end) || tour.views;
      const conversion = tourViews ? tour.bookings / tourViews : 0;
      return { tour, hotel, views: tourViews, bookings: tour.bookings, conversion };
    })
    .sort((a, b) => b.views - a.views);

  const byCity = topTours.reduce<Record<string, { views: number; bookings: number }>>((acc, row) => {
    const city = row.hotel.city || "Другое";
    const cur = acc[city] ?? { views: 0, bookings: 0 };
    acc[city] = { views: cur.views + row.views, bookings: cur.bookings + row.bookings };
    return acc;
  }, {});
  const cities = Object.entries(byCity)
    .map(([city, stat]) => ({ city, ...stat }))
    .sort((a, b) => b.views - a.views);

  const chartDays = lastDays(period === 0 ? 14 : Math.min(period, 14));
  const trend = chartDays.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;
    return {
      day: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      views: state.analyticsEvents.filter(
        (e) =>
          e.type === "TOUR_VIEWED" &&
          e.createdAt.slice(0, 10) === key &&
          tourIds.has(String(e.payload?.["tourId"] ?? "")),
      ).length,
      offers: myOffers.filter((o) => o.createdAt.slice(0, 10) === key).length,
      picks: chosen.filter((o) => o.createdAt.slice(0, 10) === key).length,
      revenue: paid
        .filter((b) => inRange(b.createdAt, dayStart, dayEnd))
        .reduce((s, b) => s + b.price, 0),
    };
  });

  const weak = topTours.find((r) => r.views >= 50 && r.conversion < 0.02);
  const strong = [...topTours].sort((a, b) => b.conversion - a.conversion)[0];

  const insights: OperatorAnalytics["insights"] = [];
  if (openRequests > 0) {
    insights.push({
      tone: "warn",
      title: `${openRequests} заявок без ответа`,
      text: "Турист уходит к той компании, которая отвечает первой.",
      to: "/operator/requests",
      cta: "Ответить",
    });
  }
  if (unreadMessages > 0) {
    insights.push({
      tone: "warn",
      title: `${unreadMessages} непрочитанных сообщений`,
      text: "Откройте переписку, пока турист не выбрал другой вариант.",
      to: "/operator/messages",
      cta: "Читать",
    });
  }
  if (unrepliedReviews > 0) {
    insights.push({
      tone: "info",
      title: `${unrepliedReviews} отзывов без ответа`,
      text: "Публичный ответ повышает доверие следующих туристов.",
      to: "/operator/reviews",
      cta: "Ответить",
    });
  }
  if (weak) {
    insights.push({
      tone: "warn",
      title: `${weak.tour.title || weak.hotel.name}: много просмотров, мало броней`,
      text: "Проверьте цену, фото и условия. Или продвиньте другой тур.",
      to: "/operator/tours",
      cta: "К турам",
    });
  }
  if (strong && strong.bookings > 0) {
    insights.push({
      tone: "ok",
      title: `${strong.tour.title || strong.hotel.name} продаётся лучше всего`,
      text: "Продвиньте этот тур: туристы уже ему доверяют.",
      to: "/operator/promotion",
      cta: "Продвинуть",
    });
  }

  const funnel = [
    { label: "Просмотры", value: views, hint: "открыли карточку" },
    { label: "В избранном", value: favorites, hint: pct(favorites, views) + " от просмотров" },
    { label: "Ваши ответы", value: myOffers.length, hint: pct(myOffers.length, Math.max(favorites, 1)) + " от избранного" },
    { label: "Вас выбрали", value: chosen.length, hint: pct(chosen.length, myOffers.length) + " от ответов" },
    {
      label: "Оплачено",
      value: paid.length || (period === 0 ? catalogBookings : paid.length),
      hint: paid.length ? formatPriceHint(revenue) : "брони в карточках",
    },
  ];

  return {
    period,
    periodLabel: period === 0 ? "Всё время" : `${period} дней`,
    views,
    viewsPrev,
    favorites,
    favoritesPrev,
    offersSent: myOffers.length,
    offersSentPrev: myOffersPrev.length,
    chosen: chosen.length,
    chosenPrev: chosenPrev.length,
    declined: declined.length,
    winRate: myOffers.length ? (chosen.length / myOffers.length) * 100 : 0,
    revenue,
    revenuePrev,
    paidBookings: paid.length,
    promoSpend,
    activePromos: getActiveOrgPromotions(orgId).length,
    openRequests,
    unreadMessages,
    avgResponseHours: avgResponseHours(orgId, start, end),
    rating,
    unrepliedReviews,
    funnel,
    topTours,
    cities,
    trend,
    insights,
  };
}

function formatPriceHint(amount: number) {
  return `${Math.round(amount).toLocaleString("ru-RU")} ₸`;
}
