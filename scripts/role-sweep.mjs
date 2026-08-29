/**
 * Полный обход платформы тремя ролями: турист, партнёр, админ.
 *
 * Supabase из контейнера недоступен, поэтому сессию и профиль подменяем на
 * границе сети — приложение при этом идёт своим обычным путём: те же
 * маршруты, те же проверки роли, тот же рендер.
 *
 * Смотрим на каждой странице три вещи: открылась ли она вообще, не улетела ли
 * в ошибку или на логин, и есть ли на ней содержимое (а не пустая рамка).
 */
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";

const BASE = process.argv[2] ?? "http://127.0.0.1:8779";
const OUT = process.argv[3];
const REF = "mgyufoyornzbwvgdfojb";

const ROLES = {
  guest: null,
  tourist: {
    uid: "user-review-tourist",
    profile: {
      id: "user-review-tourist",
      email: "tourist@test.tourgo.app",
      name: "Review Tourist",
      city: "Алматы",
      role: "TOURIST",
      status: "active",
      organization_id: null,
    },
  },
  partner: {
    uid: "user-review-operator",
    profile: {
      id: "user-review-operator",
      email: "operator@test.tourgo.app",
      name: "Review Operator",
      city: "Алматы",
      role: "OPERATOR_ADMIN",
      status: "active",
      organization_id: "org-review",
    },
  },
  admin: {
    uid: "00000000-0000-4000-8000-00000000ad11",
    profile: {
      id: "00000000-0000-4000-8000-00000000ad11",
      email: "zapoinov@bk.ru",
      name: "Юрий Запойнов",
      city: "Алматы",
      role: "PLATFORM_ADMIN",
      status: "active",
      organization_id: null,
    },
  },
};

const PAGES = {
  guest: [
    "/",
    "/search",
    "/destinations",
    "/destination/uae",
    "/excursions",
    "/stays",
    "/cars",
    "/sport",
    "/assistance",
    "/request",
    "/ai-search",
    "/premium",
    "/company/org-review",
    "/about",
    "/for-companies",
    "/company-signup",
    "/support",
    "/terms",
    "/privacy",
    "/login",
    "/registration",
  ],
  tourist: [
    "/",
    "/search",
    "/favorites",
    "/compare",
    "/notifications",
    "/profile",
    "/profile/requests",
    "/profile/trips",
    "/profile/messages",
    "/profile/favorites",
    "/profile/ai",
    "/profile/settings",
    "/premium",
  ],
  partner: [
    "/operator",
    "/operator/tours",
    "/operator/services",
    "/operator/requests",
    "/operator/bookings",
    "/operator/offers",
    "/operator/messages",
    "/operator/reviews",
    "/operator/promotion",
    "/operator/analytics",
    "/operator/billing",
    "/operator/company",
    "/operator/settings",
  ],
  admin: [
    "/admin",
    "/admin/users",
    "/admin/operators",
    "/admin/bookings",
    "/admin/payments",
    "/admin/promotions",
    "/admin/api-monitoring",
    "/admin/push",
    "/admin/audit-logs",
    "/admin/analytics",
    "/admin/ai-keys",
    "/admin/settings",
  ],
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];

for (const [role, auth] of Object.entries(ROLES)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (auth) {
    await ctx.addInitScript(
      ([ref, uid]) => {
        localStorage.setItem(
          `sb-${ref}-auth-token`,
          JSON.stringify({
            access_token: "t",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: "r",
            user: { id: uid, email: "test@test", aud: "authenticated", role: "authenticated" },
          }),
        );
      },
      [REF, auth.uid],
    );
  }
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (auth) {
    await ctx.route(/supabase\.co\/rest\/v1\/profiles/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(auth.profile),
      }),
    );
  }

  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/ERR_FAILED|Failed to load resource|net::/.test(t)) {
      errors.push("console: " + t.slice(0, 140));
    }
  });

  for (const path of PAGES[role]) {
    errors.length = 0;
    const response = await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2600);
    const text = (await page.innerText("body").catch(() => "")).replace(/\s+/g, " ").trim();
    const url = new URL(page.url()).pathname;
    const problems = [];
    if ((response?.status() ?? 0) >= 400) problems.push(`код ${response.status()}`);
    if (url !== path && !path.startsWith("/login")) problems.push(`редирект → ${url}`);
    if (/Страница не открылась|Page not found|Страница не найдена/.test(text)) {
      problems.push("страница ошибки");
    }
    if (text.length < 350) problems.push(`мало содержимого (${text.length})`);
    if (errors.length) problems.push(`ошибки: ${[...new Set(errors)].slice(0, 2).join(" | ")}`);
    results.push({ role, path, ok: problems.length === 0, problems, len: text.length });
    console.log(
      `${problems.length ? "ВНИМАНИЕ" : "ок      "} ${role.padEnd(8)} ${path.padEnd(26)} ${problems.join("; ")}`,
    );
    if (OUT && problems.length) {
      await page.screenshot({ path: `${OUT}/sweep-${role}-${path.replace(/\//g, "_")}.png` });
    }
  }
  await ctx.close();
}

const bad = results.filter((r) => !r.ok);
console.log(`\nстраниц проверено: ${results.length}, с замечаниями: ${bad.length}`);
await browser.close();
