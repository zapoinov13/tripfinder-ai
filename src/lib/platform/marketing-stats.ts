import { destinations, offerCategoryLabels, type OfferCategory } from "@/data/demo";

import type { AnalyticsEvent, PlatformState } from "./types";

/**
 * Маркетинговый разрез платформы.
 *
 * «Топ событий» и лента сырых событий отвечали на вопрос «что записалось», а не
 * «что делать». Маркетингу нужны три ответа: сколько людей пришло и растёт ли
 * это, где они отваливаются по дороге к заявке, и чего они хотят, чего у нас
 * нет. Всё считаем от одних и тех же событий, но с периодом сравнения — цифра
 * без «столько же было в прошлый раз» ничего не значит.
 */

const DAY_MS = 86400000;

export type Period = "7" | "30" | "all";

const SEARCH_TYPES = new Set(["SEARCH_COMPLETED", "AI_SEARCH_STARTED"]);
const VIEW_TYPES = new Set(["TOUR_VIEWED", "COMPANY_PAGE_VIEW"]);

export type Metric = {
  value: number;
  /** Столько же было за предыдущий такой же отрезок; null — сравнивать не с чем. */
  prev: number | null;
};

export type FunnelStep = {
  label: string;
  hint: string;
  value: number;
  /** Доля от предыдущего шага, %. */
  ofPrev: number | null;
  /** Доля от первого шага, %. */
  ofTop: number | null;
};

export type DemandRow = { label: string; count: number; empty: number };

export type CompanyInterest = {
  id: string;
  name: string;
  views: number;
  clicks: number;
  requests: number;
  /** Просмотр → обращение, %. */
  cr: number;
};

export type MarketingStats = {
  from: number;
  audience: Metric;
  guests: number;
  newUsers: Metric;
  searches: Metric;
  requests: Metric;
  deals: Metric;
  /** Поиск → заявка, %. */
  conversion: Metric;
  funnel: FunnelStep[];
  demand: DemandRow[];
  queries: { label: string; count: number }[];
  unmet: { label: string; count: number }[];
  hours: number[];
  companies: CompanyInterest[];
  trend: { day: string; label: string; searches: number; requests: number; users: number }[];
};

const at = (iso: string) => new Date(iso).getTime();

const share = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

/** Параметры поиска из события — их пишет trackSearch. */
function searchParams(event: AnalyticsEvent): Record<string, unknown> | null {
  const params = event.payload?.["params"];
  return params && typeof params === "object" ? (params as Record<string, unknown>) : null;
}

const destinationLabel = (id: string) => destinations.find((d) => d.id === id)?.country ?? id;

export function buildMarketingStats(state: PlatformState, period: Period): MarketingStats {
  const now = Date.now();
  const days = period === "all" ? 30 : Number(period);
  const from = period === "all" ? 0 : now - days * DAY_MS;
  const prevFrom = period === "all" ? null : from - days * DAY_MS;

  const inNow = (iso: string) => at(iso) >= from;
  const inPrev = (iso: string) => prevFrom !== null && at(iso) >= prevFrom && at(iso) < from;

  const events = state.analyticsEvents.filter((e) => inNow(e.createdAt));
  const prevEvents = state.analyticsEvents.filter((e) => inPrev(e.createdAt));

  const countEvents = (list: AnalyticsEvent[], match: (e: AnalyticsEvent) => boolean) =>
    list.filter(match).length;

  const uniqueUsers = (list: AnalyticsEvent[]) =>
    new Set(list.map((e) => e.userId).filter(Boolean)).size;

  const metric = (value: number, prev: number): Metric => ({
    value,
    prev: prevFrom === null ? null : prev,
  });

  // --- аудитория и спрос ---------------------------------------------------
  const audience = metric(uniqueUsers(events), uniqueUsers(prevEvents));
  const guests = countEvents(events, (e) => !e.userId);
  const newUsers = metric(
    state.users.filter((u) => inNow(u.createdAt)).length,
    state.users.filter((u) => inPrev(u.createdAt)).length,
  );
  const searches = metric(
    countEvents(events, (e) => SEARCH_TYPES.has(e.type)),
    countEvents(prevEvents, (e) => SEARCH_TYPES.has(e.type)),
  );

  const allRequests = [
    ...state.tripRequests.map((r) => ({
      createdAt: r.createdAt,
      won: r.status === "CHOSEN",
    })),
    ...state.serviceRequests.map((r) => ({
      createdAt: r.createdAt,
      won: r.status === "CONFIRMED" || r.status === "DONE",
    })),
  ];
  const requestsNow = allRequests.filter((r) => inNow(r.createdAt));
  const requestsPrev = allRequests.filter((r) => inPrev(r.createdAt));
  const requests = metric(requestsNow.length, requestsPrev.length);
  const deals = metric(
    requestsNow.filter((r) => r.won).length,
    requestsPrev.filter((r) => r.won).length,
  );
  const conversion = metric(
    searches.value > 0 ? Math.round((requests.value / searches.value) * 100) : 0,
    searches.prev && searches.prev > 0
      ? Math.round(((requests.prev ?? 0) / searches.prev) * 100)
      : 0,
  );

  // --- воронка -------------------------------------------------------------
  const views = countEvents(events, (e) => VIEW_TYPES.has(e.type));
  const rawFunnel: { label: string; hint: string; value: number }[] = [
    { label: "Искали", hint: "поиск и AI-подбор", value: searches.value },
    { label: "Открыли предложение", hint: "карточка тура или компании", value: views },
    { label: "Обратились", hint: "заявка или запись", value: requests.value },
    { label: "Дошли до сделки", hint: "подтверждено компанией", value: deals.value },
  ];
  const top = rawFunnel[0]?.value ?? 0;
  const funnel: FunnelStep[] = rawFunnel.map((step, i) => ({
    ...step,
    ofPrev: i === 0 ? null : share(step.value, rawFunnel[i - 1]!.value),
    ofTop: i === 0 ? null : share(step.value, top),
  }));

  // --- чего хотят ----------------------------------------------------------
  const demandMap = new Map<string, DemandRow>();
  const unmetMap = new Map<string, number>();
  const queryMap = new Map<string, number>();

  for (const event of events) {
    if (event.type === "AI_SEARCH_STARTED") {
      const q = event.payload?.["query"];
      if (typeof q === "string" && q.trim()) {
        const key = q.trim().toLowerCase();
        queryMap.set(key, (queryMap.get(key) ?? 0) + 1);
      }
      continue;
    }
    if (event.type !== "SEARCH_COMPLETED") continue;
    const params = searchParams(event);
    if (!params) continue;
    const found = typeof event.payload?.["count"] === "number" ? Number(event.payload["count"]) : 1;

    const destination = typeof params["destination"] === "string" ? params["destination"] : "";
    const category = typeof params["category"] === "string" ? params["category"] : "";
    const text = typeof params["q"] === "string" ? params["q"].trim() : "";
    const label = destination
      ? destinationLabel(destination)
      : category
        ? (offerCategoryLabels[category as OfferCategory] ?? category)
        : text || "Без фильтров";

    const row = demandMap.get(label) ?? { label, count: 0, empty: 0 };
    row.count += 1;
    if (found === 0) row.empty += 1;
    demandMap.set(label, row);

    if (found === 0) {
      const key = text ? `${label} · «${text}»` : label;
      unmetMap.set(key, (unmetMap.get(key) ?? 0) + 1);
    }
    if (text) queryMap.set(text.toLowerCase(), (queryMap.get(text.toLowerCase()) ?? 0) + 1);
  }

  const demand = [...demandMap.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  const unmet = [...unmetMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const queries = [...queryMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // --- когда люди активны --------------------------------------------------
  const hours = Array.from({ length: 24 }, () => 0);
  for (const event of events) {
    const hour = new Date(event.createdAt).getHours();
    hours[hour] = (hours[hour] ?? 0) + 1;
  }

  // --- интерес к компаниям -------------------------------------------------
  const companyMap = new Map<string, CompanyInterest>();
  const ensure = (id: string) => {
    const existing = companyMap.get(id);
    if (existing) return existing;
    const name = state.organizations.find((o) => o.id === id)?.name;
    const row: CompanyInterest = {
      id,
      name: name ?? "Удалённая компания",
      views: 0,
      clicks: 0,
      requests: 0,
      cr: 0,
    };
    companyMap.set(id, row);
    return row;
  };
  for (const event of events) {
    const id = event.payload?.["companyId"];
    if (typeof id !== "string" || !id) continue;
    if (event.type === "COMPANY_PAGE_VIEW") ensure(id).views += 1;
    if (event.type === "COMPANY_CONTACT_CLICK") ensure(id).clicks += 1;
  }
  for (const request of state.serviceRequests) {
    if (!inNow(request.createdAt)) continue;
    ensure(request.organizationId).requests += 1;
  }
  const companies = [...companyMap.values()]
    .map((c) => ({ ...c, cr: c.views > 0 ? Math.round((c.requests / c.views) * 100) : 0 }))
    .sort((a, b) => b.requests - a.requests || b.views - a.views)
    .slice(0, 8);

  // --- динамика ------------------------------------------------------------
  const trend: MarketingStats["trend"] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now - i * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    index.set(key, trend.length);
    trend.push({
      day: key,
      label: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""),
      searches: 0,
      requests: 0,
      users: 0,
    });
  }
  for (const event of state.analyticsEvents) {
    const slot = index.get(event.createdAt.slice(0, 10));
    if (slot === undefined) continue;
    if (SEARCH_TYPES.has(event.type)) trend[slot]!.searches += 1;
  }
  for (const request of allRequests) {
    const slot = index.get(request.createdAt.slice(0, 10));
    if (slot !== undefined) trend[slot]!.requests += 1;
  }
  for (const user of state.users) {
    const slot = index.get(user.createdAt.slice(0, 10));
    if (slot !== undefined) trend[slot]!.users += 1;
  }

  return {
    from,
    audience,
    guests,
    newUsers,
    searches,
    requests,
    deals,
    conversion,
    funnel,
    demand,
    queries,
    unmet,
    hours,
    companies,
    trend,
  };
}

/**
 * Рост к прошлому периоду в процентах; null — сравнивать не с чем.
 *
 * Ноль в прошлом периоде не превращаем в «+100%»: рост с нуля не измеряется
 * процентом, и такая подпись врёт сильнее, чем её отсутствие.
 */
export function delta(metric: Metric): number | null {
  if (metric.prev === null || metric.prev === 0) return null;
  return Math.round(((metric.value - metric.prev) / metric.prev) * 100);
}
