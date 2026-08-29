/**
 * Свой счётчик посещаемости: проверяем не «код написан», а «событие уходит».
 *
 * Запрос к базе перехватываем и смотрим, что именно приложение пытается
 * записать: тот ли источник, та ли сессия, не попал ли в маркетинговую
 * посещаемость кабинет. Отдельно проверяем, что раздел «Трафик» в админке
 * умеет показать и цифры, и честное «SQL ещё не применён».
 *
 *   node scripts/visits-check.mjs [адрес]
 */
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";

const BASE = process.argv[2] ?? "http://127.0.0.1:8801";
const REF = "mgyufoyornzbwvgdfojb";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const fail = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "ок  " : "НЕТ "} ${msg}`);
  if (!cond) fail.push(msg);
};

const ADMIN = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@test.tourgo.app",
  name: "Проверка",
  city: "Алматы",
  role: "PLATFORM_ADMIN",
  status: "active",
  organization_id: null,
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** Общий перехват: наружу не ходим, отвечаем сами. */
function intercept(page, { onInsert, rpc }) {
  return page.route(
    (url) => url.hostname.endsWith("supabase.co"),
    async (route) => {
      const url = route.request().url();
      const json = (body, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (url.includes("/analytics_events") && route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        onInsert?.(Array.isArray(body) ? body[0] : body);
        return json([], 201);
      }
      if (url.includes("/rpc/traffic_stats")) return rpc ? rpc(json) : route.abort();
      if (url.includes("/rest/v1/profiles")) return json([ADMIN]);
      return route.abort();
    },
  );
}

// ---------------------------------------------------------------- сбор визитов
{
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const sent = [];
  await intercept(page, { onInsert: (e) => sent.push(e) });

  await page.goto(`${BASE}/`, {
    waitUntil: "domcontentloaded",
    referer: "https://www.google.com/",
  });
  await page.waitForTimeout(2500);
  const first = sent.find((e) => e?.payload?.path === "/");
  ok(Boolean(first), "просмотр главной ушёл в базу");
  ok(first?.type === "PAGE_VIEW", `тип события PAGE_VIEW (получили ${first?.type})`);
  ok(first?.user_id === null, "user_id пустой — счётчик обезличен");
  ok(first?.payload?.source === "search", `источник search (получили ${first?.payload?.source})`);
  ok(first?.payload?.ref === "google", `поисковик google (получили ${first?.payload?.ref})`);
  ok(first?.payload?.entry === true, "первая страница помечена входом");
  ok(first?.payload?.device === "mobile", `устройство mobile (получили ${first?.payload?.device})`);
  ok(String(first?.payload?.visitor ?? "").length > 8, "есть идентификатор посетителя");

  await page.goto(`${BASE}/excursions`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const second = sent.find((e) => e?.payload?.path === "/excursions");
  ok(Boolean(second), "второй просмотр ушёл в базу");
  ok(second?.payload?.session === first?.payload?.session, "сессия та же");
  ok(second?.payload?.entry === false, "второй просмотр не помечен входом");

  // Гостя с /admin уносит на /login — его-то считать как раз надо.
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const cabinet = sent.filter((e) => String(e?.payload?.path).startsWith("/admin"));
  ok(cabinet.length === 0, `кабинет в посещаемость не попал (нашли ${cabinet.length})`);
  ok(
    sent.some((e) => e?.payload?.path === "/login"),
    "страница входа посчитана как обычная публичная",
  );
  await ctx.close();
}

// ------------------------------------------------------------- рекламная метка
{
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  const sent = [];
  await intercept(page, { onInsert: (e) => sent.push(e) });
  await page.goto(`${BASE}/cars?utm_source=instagram&utm_medium=cpc&utm_campaign=leto`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);
  const ad = sent[0];
  ok(ad?.payload?.source === "ad", `платный переход помечен ad (получили ${ad?.payload?.source})`);
  ok(ad?.payload?.ref === "instagram", `источник instagram (получили ${ad?.payload?.ref})`);
  ok(ad?.payload?.campaign === "leto", `кампания leto (получили ${ad?.payload?.campaign})`);
  ok(ad?.payload?.path === "/cars", "адрес записан без параметров");
  await ctx.close();
}

// ------------------------------------------------------- раздел «Трафик» у админа
const STATS = {
  days: 30,
  visits: 1240,
  visitors: 480,
  sessions: 610,
  prevVisits: 900,
  prevVisitors: 350,
  prevSessions: 470,
  bounces: 244,
  sources: [
    { key: "search", sessions: 300 },
    { key: "social", sessions: 180 },
    { key: "direct", sessions: 90 },
    { key: "internal", sessions: 999 },
  ],
  refs: [
    { key: "google", source: "search", sessions: 210 },
    { key: "vk.com", source: "social", sessions: 180 },
  ],
  campaigns: [{ key: "leto", sessions: 44 }],
  pages: [{ key: "/", visits: 500, sessions: 400 }],
  entryPages: [{ key: "/", sessions: 400 }],
  devices: [{ key: "mobile", sessions: 500 }],
  byDay: [{ day: "2026-08-28", visits: 40, sessions: 20 }],
};

async function openAdminAnalytics(rpc) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(
    ([ref, admin]) => {
      localStorage.setItem(
        `sb-${ref}-auth-token`,
        JSON.stringify({
          access_token: "test",
          refresh_token: "test",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: admin.id, email: admin.email, aud: "authenticated", role: "authenticated" },
        }),
      );
    },
    [REF, ADMIN],
  );
  const page = await ctx.newPage();
  await intercept(page, { rpc });
  await page.goto(`${BASE}/admin/analytics`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  return { ctx, page };
}

{
  const { ctx, page } = await openAdminAnalytics((json) => json(STATS));
  const body = await page.locator("body").innerText();
  ok(/Трафик сайта/.test(body), "раздел «Трафик сайта» на странице");
  ok(/480/.test(body), "число посетителей показано");
  ok(/Поисковики/.test(body), "источники названы по-русски");
  ok(/google/.test(body), "конкретный источник виден");
  ok(!/Внутренние переходы/.test(body), "хождение по сайту не выдаётся за источник трафика");
  ok(/40%/.test(body), "доля ушедших с первой страницы посчитана (244 из 610)");
  ok(/leto/.test(body), "рекламная кампания видна");
  await ctx.close();
}

{
  // База без применённого SQL: раздел должен объяснить, а не показать ошибку.
  const { ctx, page } = await openAdminAnalytics((json) =>
    json(
      { code: "42883", message: "function public.traffic_stats(p_days => integer) does not exist" },
      404,
    ),
  );
  const body = await page.locator("body").innerText();
  ok(/Осталось включить подсчёт/.test(body), "без SQL раздел объясняет, что сделать");
  ok(/TRAFFIC\.sql/.test(body), "назван файл с запросом");
  await ctx.close();
}

await browser.close();
console.log(fail.length === 0 ? "\nВСЁ ЗЕЛЁНОЕ" : `\nПРОВАЛЕНО: ${fail.length}`);
process.exit(fail.length === 0 ? 0 : 1);
