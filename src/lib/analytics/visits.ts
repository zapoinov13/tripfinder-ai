/**
 * Свой счётчик посещаемости.
 *
 * Внешние счётчики (Метрика, GA) режутся блокировщиками, отдают цифры с
 * задержкой и держат данные о ваших посетителях у себя. Здесь тот же смысл
 * своими силами: визит пишется в ту же таблицу `analytics_events`, что и
 * остальные события платформы, и сводка считается в базе.
 *
 * Что записываем: страницу, источник перехода, устройство, случайный
 * идентификатор посетителя и сессии. Ни имени, ни почты, ни IP — маркетингу
 * нужны доли и повторные заходы, а не личность. Идентификатор посетителя
 * живёт только в его браузере и ни с каким аккаунтом не связан.
 *
 * `user_id` намеренно остаётся пустым: путь конкретного человека и так виден
 * по событиям воронки, а обезличенный счётчик не заставляет спрашивать
 * согласие на слежку.
 */
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const VISITOR_KEY = "tourgo.visitor";
const SESSION_KEY = "tourgo.session";
const SESSION_AT_KEY = "tourgo.session.at";

/** Полчаса без единой страницы — считаем, что человек ушёл и вернулся заново. */
const SESSION_GAP_MS = 30 * 60_000;

/** Тип события. Отделён от событий воронки, чтобы одно не вытесняло другое. */
export const PAGE_VIEW = "PAGE_VIEW";

export type VisitSource = "direct" | "search" | "social" | "referral" | "ad" | "internal";

export type Visit = {
  /** Адрес страницы без параметров: «/excursions», а не «/excursions?utm_source=…». */
  path: string;
  source: VisitSource;
  /** Кто прислал: «google», «vk.com», название UTM-источника. Пусто — прямой заход. */
  ref: string;
  /** utm_campaign: по какой именно кампании пришли. */
  campaign: string;
  device: "mobile" | "tablet" | "desktop";
  visitor: string;
  session: string;
  /** Первая страница сессии — по ней считаются точки входа и отказы. */
  entry: boolean;
};

/** Поисковики: разные домены одного движка сводим к одному имени. */
const SEARCH_ENGINES: Array<[RegExp, string]> = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)yandex\./, "yandex"],
  [/(^|\.)bing\./, "bing"],
  [/(^|\.)duckduckgo\./, "duckduckgo"],
  [/(^|\.)mail\.ru$/, "mail.ru"],
  [/(^|\.)rambler\./, "rambler"],
  [/(^|\.)yahoo\./, "yahoo"],
  [/(^|\.)baidu\./, "baidu"],
];

const SOCIAL_HOSTS = [
  "vk.com",
  "t.me",
  "telegram.org",
  "instagram.com",
  "facebook.com",
  "fb.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "ok.ru",
  "threads.net",
  "x.com",
  "twitter.com",
  "pinterest.com",
  "linkedin.com",
  "wa.me",
  "whatsapp.com",
];

/** Реклама: по этим значениям utm_medium переход считается платным. */
const PAID_MEDIUMS = new Set(["cpc", "ppc", "paid", "ads", "cpm", "banner", "paidsocial"]);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function searchEngineName(host: string): string {
  for (const [re, name] of SEARCH_ENGINES) if (re.test(host)) return name;
  return "";
}

/**
 * Откуда пришёл человек.
 *
 * UTM-метки главнее реферера: если вы разметили ссылку, вы знаете о ней
 * больше, чем браузер. Переход с собственных страниц — не новый источник, а
 * продолжение той же сессии.
 */
export function classifySource(
  referrer: string,
  params: URLSearchParams,
  ownHost: string,
): { source: VisitSource; ref: string; campaign: string } {
  const campaign = (params.get("utm_campaign") ?? "").slice(0, 60);
  const utmSource = (params.get("utm_source") ?? "").trim().toLowerCase().slice(0, 60);
  const utmMedium = (params.get("utm_medium") ?? "").trim().toLowerCase();

  if (utmSource) {
    if (PAID_MEDIUMS.has(utmMedium)) return { source: "ad", ref: utmSource, campaign };
    if (utmMedium === "organic") return { source: "search", ref: utmSource, campaign };
    if (utmMedium === "social") return { source: "social", ref: utmSource, campaign };
    return { source: "referral", ref: utmSource, campaign };
  }

  const host = hostOf(referrer);
  if (!host) return { source: "direct", ref: "", campaign };
  if (host === ownHost) return { source: "internal", ref: "", campaign };

  const engine = searchEngineName(host);
  if (engine) return { source: "search", ref: engine, campaign };
  if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`)))
    return { source: "social", ref: host, campaign };
  return { source: "referral", ref: host, campaign };
}

function deviceOf(width: number): Visit["device"] {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Хранилище может быть закрыто (приватный режим, запрет на сайт). Тогда
 * считаем каждый заход новым посетителем — это хуже, чем точная цифра, но
 * лучше, чем упавшая страница.
 */
function readStore(store: "local" | "session", key: string): string {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStore(store: "local" | "session", key: string, value: string) {
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* приватный режим — просто не запоминаем */
  }
}

/** Постоянный анонимный идентификатор браузера: по нему видно повторные заходы. */
function visitorId(): string {
  const existing = readStore("local", VISITOR_KEY);
  if (existing) return existing;
  const fresh = randomId();
  writeStore("local", VISITOR_KEY, fresh);
  return fresh;
}

/** Идентификатор сессии и признак того, что она только что началась. */
function sessionId(now: number): { id: string; fresh: boolean } {
  const lastAt = Number(readStore("session", SESSION_AT_KEY)) || 0;
  const existing = readStore("session", SESSION_KEY);
  const alive = existing && now - lastAt < SESSION_GAP_MS;
  const id = alive ? existing : randomId();
  writeStore("session", SESSION_KEY, id);
  writeStore("session", SESSION_AT_KEY, String(now));
  return { id, fresh: !alive };
}

/** Кабинеты — не маркетинговый трафик: считаем только публичные страницы. */
const PRIVATE_PREFIXES = ["/admin", "/operator", "/profile"];

export function isPublicPath(path: string): boolean {
  return !PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Роботы приходят за содержимым, а не за туром: в посещаемости им не место. */
const BOT_UA = /bot|crawler|spider|crawling|headless|lighthouse|pagespeed|preview|slurp/i;

export function isBot(userAgent: string): boolean {
  return BOT_UA.test(userAgent);
}

/**
 * Собрать визит. Отдельно от отправки — так его можно проверить, не поднимая
 * ни браузера, ни базы.
 */
export function buildVisit(input: {
  path: string;
  search: string;
  referrer: string;
  ownHost: string;
  width: number;
  now: number;
}): Visit {
  const { source, ref, campaign } = classifySource(
    input.referrer,
    new URLSearchParams(input.search),
    input.ownHost,
  );
  const session = sessionId(input.now);
  return {
    path: input.path.slice(0, 200),
    source,
    ref,
    campaign,
    device: deviceOf(input.width),
    visitor: visitorId(),
    session: session.id,
    entry: session.fresh,
  };
}

/** Последний записанный адрес: перерисовка маршрута не должна давать второй визит. */
let lastPath = "";

export function resetVisitDedupeForTests() {
  lastPath = "";
}

/**
 * Записать просмотр страницы. Ничего не ждёт и ничего не ломает: счётчик не
 * та вещь, ради которой человеку стоит видеть ошибку.
 */
export function trackPageView(path: string, search: string): void {
  if (typeof window === "undefined") return;
  if (!isSupabaseConfigured) return;
  if (isBot(navigator.userAgent)) return;
  if (!isPublicPath(path)) return;
  if (path === lastPath) return;
  lastPath = path;

  const visit = buildVisit({
    path,
    search,
    referrer: document.referrer,
    ownHost: window.location.hostname.replace(/^www\./, "").toLowerCase(),
    width: window.innerWidth,
    now: Date.now(),
  });

  const sb = getSupabase();
  if (!sb) return;
  void sb
    .from("analytics_events")
    .insert({ type: PAGE_VIEW, user_id: null, payload: visit })
    .then(({ error }) => {
      if (error) console.warn("[visits] не записали просмотр", error.message);
    });
}
