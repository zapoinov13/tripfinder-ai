#!/usr/bin/env node
/**
 * Проверка SEO по тому HTML, который сервер отдаёт первым ответом.
 *
 * Мета-теги легко сломать, не заметив: скопировали страницу — и в выдаче два
 * одинаковых заголовка; добавили раздел — и он без описания; закрыли кабинет
 * от индексации, а через месяц вернули head и открыли обратно. Всё это видно
 * только в отданном HTML и только если каждый раз смотреть.
 *
 * Поэтому проверка живёт в репозитории и запускается одной командой:
 *
 *     npm run seo:audit
 *
 * Скрипт сам поднимает сервер, обходит страницы, сверяет заголовки, описания,
 * canonical, Open Graph, разметку и закрытость кабинетов — и падает с отчётом,
 * если что-то разъехалось. Можно передать адрес уже запущенного сервера:
 *
 *     node scripts/seo-audit.mjs http://127.0.0.1:8791
 */
import { spawn } from "node:child_process";
import process from "node:process";

/** Границы взяты из того, что реально показывают Google и Яндекс. */
const TITLE_MIN = 20;
const TITLE_MAX = 70;
const DESC_MIN = 70;
const DESC_MAX = 180;

const external = process.argv[2];
const PORT = 8793;
const BASE = external ?? `http://127.0.0.1:${PORT}`;

let bad = 0;
const problems = [];
const check = (ok, msg) => {
  if (!ok) {
    bad += 1;
    problems.push(msg);
  }
  console.log(`${ok ? "OK  " : "FAIL"} ${msg}`);
};

const get = async (path) => {
  const res = await fetch(BASE + path, { redirect: "follow" });
  return { status: res.status, html: (await res.text()).replace(/\0/g, "") };
};

const tag = (html, re) => (html.match(re) ?? [])[1];
const title = (html) => tag(html, /<title>([^<]*)<\/title>/);
const meta = (html, name) =>
  tag(html, new RegExp(`<meta name="${name}" content="([^"]*)"`)) ??
  tag(html, new RegExp(`<meta property="${name}" content="([^"]*)"`));
const canonical = (html) => tag(html, /<link rel="canonical" href="([^"]*)"/);
const ldTypes = (html) => [...html.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]);
const h1Count = (html) => (html.match(/<h1[\s>]/g) ?? []).length;

/** Публичные страницы: у каждой должен быть свой заголовок и своё описание. */
const PUBLIC = [
  ["/", "главная"],
  ["/search", "поиск туров"],
  ["/destinations", "направления"],
  ["/destination/uae", "направление ОАЭ"],
  ["/excursions", "экскурсии"],
  ["/stays", "жильё"],
  ["/cars", "аренда авто"],
  ["/sport", "спорт"],
  ["/assistance", "помощь в поездке"],
  ["/request", "заявка турфирмам"],
  ["/ai-search", "подбор по описанию"],
  ["/premium", "premium"],
  ["/about", "о сервисе"],
  ["/for-companies", "для турфирм"],
  ["/company-signup", "подключение компании"],
  ["/support", "поддержка"],
  ["/terms", "условия"],
  ["/privacy", "конфиденциальность"],
  ["/tour/tour-1", "предложение"],
  ["/company/org-review", "компания"],
];

/** Кабинеты и личные экраны: в выдаче им делать нечего. */
const PRIVATE = [
  "/favorites",
  "/compare",
  "/notifications",
  "/login",
  "/registration",
  "/profile",
  "/profile/requests",
  "/profile/trips",
  "/admin",
  "/admin/analytics",
  "/operator",
];

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      // сервер ещё поднимается
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return false;
}

let server = null;
if (!external) {
  server = spawn("npx", ["vite", "dev", "--port", String(PORT), "--host", "127.0.0.1"], {
    stdio: "ignore",
    detached: false,
  });
  if (!(await waitForServer())) {
    console.error(`Сервер не поднялся на ${BASE}. Запустите вручную и передайте адрес аргументом.`);
    server.kill();
    process.exit(1);
  }
}

try {
  const titles = new Map();
  const descriptions = new Map();

  for (const [path, name] of PUBLIC) {
    const { status, html } = await get(path);
    check(status === 200, `${name}: страница отдаётся (${status})`);
    if (status !== 200) continue;

    const t = title(html) ?? "";
    const d = meta(html, "description") ?? "";
    check(
      t.length >= TITLE_MIN && t.length <= TITLE_MAX,
      `${name}: заголовок ${t.length} симв. — «${t}»`,
    );
    check(d.length >= DESC_MIN && d.length <= DESC_MAX, `${name}: описание ${d.length} симв.`);
    check(canonical(html) === path, `${name}: canonical → ${canonical(html)}`);
    check(!/noindex/.test(meta(html, "robots") ?? ""), `${name}: открыт для индексации`);
    check(Boolean(meta(html, "og:title")), `${name}: og:title`);
    check(Boolean(meta(html, "og:description")), `${name}: og:description`);
    check(Boolean(meta(html, "og:image")), `${name}: og:image`);
    check(h1Count(html) === 1, `${name}: ровно один H1 (найдено ${h1Count(html)})`);

    // Два одинаковых заголовка — прямая дорога к склейке страниц в выдаче.
    if (t) {
      check(!titles.has(t), `${name}: заголовок уникален${titles.has(t) ? ` (как у «${titles.get(t)}»)` : ""}`);
      titles.set(t, name);
    }
    if (d) {
      check(
        !descriptions.has(d),
        `${name}: описание уникально${descriptions.has(d) ? ` (как у «${descriptions.get(d)}»)` : ""}`,
      );
      descriptions.set(d, name);
    }
  }

  for (const path of PRIVATE) {
    const { html } = await get(path);
    check(/noindex/.test(meta(html, "robots") ?? ""), `${path}: закрыт от индексации`);
  }

  // --- разметка для поисковика -------------------------------------------
  const { html: home } = await get("/");
  check(ldTypes(home).includes("Organization"), "главная: разметка Organization");
  check(ldTypes(home).includes("WebSite"), "главная: разметка WebSite с поиском");

  const { html: tour } = await get("/tour/tour-1");
  check(ldTypes(tour).includes("Product"), "предложение: разметка Product");
  check(/"@type":"Offer"/.test(tour) && /"price":\d+/.test(tour), "предложение: цена в разметке");
  check(ldTypes(tour).includes("BreadcrumbList"), "предложение: хлебные крошки");

  const { html: company } = await get("/company/org-review");
  check(ldTypes(company).includes("TravelAgency"), "компания: разметка TravelAgency");

  const { html: about } = await get("/about");
  check(ldTypes(about).includes("FAQPage"), "о сервисе: разметка FAQPage");

  // --- фильтры витрин: свой заголовок, но без дорвеев ---------------------
  const clean = await get("/sport");
  const filtered = await get("/sport?city=%D0%94%D1%83%D0%B1%D0%B0%D0%B9");
  check(
    title(clean.html) !== title(filtered.html) ||
      /noindex/.test(meta(filtered.html, "robots") ?? ""),
    "витрина с фильтром: свой заголовок либо закрыта от индексации",
  );
  check(
    !/noindex/.test(meta(filtered.html, "robots") ?? "") ||
      canonical(filtered.html) === "/sport",
    "тонкий фильтр: canonical ведёт на чистый раздел",
  );

  // --- служебные файлы ----------------------------------------------------
  const robotsTxt = await (await fetch(`${BASE}/robots.txt`)).text();
  check(/^User-agent: \*/m.test(robotsTxt), "robots.txt: отдаётся");
  check(/Disallow: \/admin/.test(robotsTxt), "robots.txt: кабинеты закрыты");
  check(/Sitemap: http/.test(robotsTxt), "robots.txt: ссылка на карту сайта");

  const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
  const sitemap = await sitemapRes.text();
  check(sitemapRes.headers.get("content-type")?.includes("xml"), "sitemap: отдаётся как XML");
  check(/<urlset xmlns="http:\/\/www\.sitemaps\.org/.test(sitemap), "sitemap: корректный namespace");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(locs.length >= 20, `sitemap: адресов ${locs.length}`);
  check(
    !locs.some((l) => /\/(admin|profile|operator|login|registration)/.test(l)),
    "sitemap: без приватных адресов",
  );
  // Каждая публичная страница должна быть в карте — иначе её просто не найдут.
  for (const [path] of PUBLIC) {
    if (path.startsWith("/tour/") || path.startsWith("/company/")) continue;
    check(
      locs.some((l) => new URL(l).pathname === path),
      `sitemap: ${path} есть в карте`,
    );
  }

  if (bad) {
    console.log(`\nПРОВАЛОВ: ${bad}`);
    for (const line of problems) console.log(`  · ${line}`);
  } else {
    console.log("\nВСЁ ЗЕЛЁНОЕ");
  }
} finally {
  server?.kill();
}

process.exit(bad ? 1 : 0);
