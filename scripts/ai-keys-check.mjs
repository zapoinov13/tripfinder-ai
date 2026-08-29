/**
 * Страница «AI и ключи»: проверяем то, ради чего её переделывали.
 *
 * Провайдер узнаётся по ключу, список моделей приходит от провайдера, адреса
 * endpoint на виду нет, промпт — новый. Сервер при этом работает против
 * подставного Supabase (scripts/ai-stub-server.mjs), то есть настоящим путём.
 *
 *   node scripts/ai-stub-server.mjs
 *   SUPABASE_URL=http://127.0.0.1:8899 SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
 *   SUPABASE_PROJECT_ID=mgyufoyornzbwvgdfojb SUPABASE_SERVICE_ROLE_KEY=sb_secret_test \
 *   npx vite dev --port 8812
 *   node scripts/ai-keys-check.mjs
 */
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";
const BASE = process.argv[2] ?? "http://127.0.0.1:8812";
const REF = "mgyufoyornzbwvgdfojb";
const ADMIN = { id: "00000000-0000-4000-8000-000000000001", email: "admin@test.tourgo.app" };
// Токен подписан подставным сервером его же ключом: проверка входа в
// платформе идёт через Supabase и подделку отклоняет раньше нашего кода.
const TOKEN = (await (await fetch("http://127.0.0.1:8899/__token")).json()).token;

const fail = [];
const ok = (c, m) => {
  console.log(`${c ? "ок  " : "НЕТ "} ${m}`);
  if (!c) fail.push(m);
};

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
await ctx.addInitScript(
  ([ref, admin, token]) => {
    const session = JSON.stringify({
      access_token: token,
      refresh_token: "r",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: admin.id, email: admin.email, aud: "authenticated", role: "authenticated" },
    });
    // Ключ хранилища supabase-js берёт из адреса проекта. Против подставного
    // сервера это «sb-127-auth-token», против настоящего — по его домену.
    localStorage.setItem(`sb-${ref}-auth-token`, session);
    localStorage.setItem("sb-127-auth-token", session);
  },
  [REF, ADMIN, TOKEN],
);
const p = await ctx.newPage();
// Браузер ходит в настоящий Supabase (в контейнере он недоступен) — профиль
// подменяем на границе сети. Серверная часть при этом работает против
// подставного Supabase и отвечает по-настоящему.
await p.route(
  (u) => u.hostname.endsWith("supabase.co"),
  async (route) => {
    if (route.request().url().includes("/rest/v1/profiles")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: ADMIN.id,
          email: ADMIN.email,
          name: "Проверка",
          city: "Алматы",
          role: "PLATFORM_ADMIN",
          status: "active",
          organization_id: null,
        }),
      });
    }
    return route.abort();
  },
);
p.on("console", (m) => {
  if (m.type() === "error") console.log("  browser error:", m.text().slice(0, 140));
});

await p.goto(`${BASE}/admin/ai-keys`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(5000);
let body = await p.locator("body").innerText();

ok(/Подключение модели/.test(body), "страница открылась под админом");
ok(!/Base URL/.test(body), "поля Base URL на виду нет");
ok(/Ключ провайдера/.test(body), "шаг 1 — ключ");
ok(/Характер консультанта/.test(body), "шаг 3 — характер");
// Текст поля живёт в value, а не в разметке.
const promptText = await p.locator("textarea#ai-prompt").inputValue();
ok(/консультант TourGo/i.test(promptText), "в промпте новый текст, а не старые три строки");
ok(/человек из Казахстана/.test(promptText), "промпт описывает, кто по ту сторону экрана");
ok(!/travel-консьерж маркетплейса туров/.test(promptText), "старого промпта не осталось");

// Модели подтянулись по сохранённому ключу; служебные модели отсеяны.
ok(/доступно моделей/.test(body), "список моделей загрузился сам");
ok(
  /доступно моделей: 2/.test(body),
  `служебные модели отсеяны (${(body.match(/доступно моделей: \d+/) || [])[0]})`,
);

// Провайдер по ключу.
const keyField = p.locator("input#ai-key");
await keyField.click();
await keyField.pressSequentially("sk-ant-api03-TESTKEY", { delay: 10 });
await p.waitForTimeout(800);
body = await p.locator("body").innerText();
ok(/Это ключ Anthropic Claude/.test(body), "ключ Anthropic узнан по префиксу");

await keyField.fill("");
await keyField.pressSequentially("sk-or-v1-TESTKEY", { delay: 10 });
await p.waitForTimeout(800);
body = await p.locator("body").innerText();
ok(/Это ключ OpenRouter/.test(body), "ключ OpenRouter узнан");

await keyField.fill("");
await keyField.pressSequentially("AIzaSyTESTKEY", { delay: 10 });
await p.waitForTimeout(800);
body = await p.locator("body").innerText();
ok(/Это ключ Google Gemini/.test(body), "ключ Google узнан");

await keyField.fill("");
await keyField.pressSequentially("непонятная-строка", { delay: 10 });
await p.waitForTimeout(600);
body = await p.locator("body").innerText();
ok(/не узнаётся/.test(body), "неизвестный ключ честно говорит, что не узнан");

// Ручной выбор и Base URL только для своего endpoint.
await p.locator("summary", { hasText: "Выбрать провайдера вручную" }).click();
await p.waitForTimeout(400);
body = await p.locator("body").innerText();
ok(/Адрес endpoint/.test(body) === false, "у обычного провайдера адреса endpoint нет");

await b.close();
console.log(fail.length === 0 ? "\nВСЁ ЗЕЛЁНОЕ" : `\nПРОВАЛЕНО: ${fail.length}`);
process.exit(fail.length === 0 ? 0 : 1);
