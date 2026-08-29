#!/usr/bin/env node
/**
 * Разбор фразы: в какой раздел уводит написанное человеком.
 *
 * Проверка появилась после находки на боевом сайте: «экскурсиии» с опечаткой
 * разбирались правильно, а «ekskursii v dubae» — нет. Разбор сравнивал сырые
 * подстроки и понимал только кириллицу в точной форме, хотя рядом, в поиске по
 * каталогу, давно работала таблица транслитерации.
 *
 * Проверяем не текст на странице, а куда человек в итоге попал: раздел и
 * направление. Это то же, что делает кнопка под ответом консультанта.
 *
 *     node scripts/router-check.mjs http://127.0.0.1:8790
 */
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";

const BASE = (process.argv[2] ?? "http://127.0.0.1:8790").replace(/\/+$/, "");

/** [фраза, ожидаемый раздел, ожидаемое направление или null] */
const CASES = [
  ["нужна машина в Дубае", "/cars", "uae"],
  ["арендовать авто", "/cars", null],
  ["хочу в Дубай на неделю", "/search", "uae"],
  ["нужен водитель на весь день", "/assistance", null],
  ["экскурсиии в дубае", "/excursions", "uae"],
  ["снять квартиру в Анталии", "/stays", "turkey"],
  ["тренажерный зал в отеле", "/sport", null],
  ["яхта в Дубае", "/excursions", "uae"],
  // Транслитом пишут чаще, чем кажется: с телефона без русской раскладки.
  ["otel v dubae", "/stays", "uae"],
  ["ekskursii v dubae", "/excursions", "uae"],
  ["mashina v dubae", "/cars", "uae"],
  ["kvartira v antalii", "/stays", "turkey"],
  // Примеры, которые сайт предлагает сам: попасть с них в пустой общий поиск —
  // худшее первое впечатление.
  ["Что посмотреть с детьми", "/excursions", null],
  ["куда сходить в Дубае", "/excursions", "uae"],
  // И обратная сторона: чужое слово важнее оборота «посмотреть».
  ["посмотреть отели в Дубае", "/stays", "uae"],
  ["хочу посмотреть туры в Турцию", "/search", "turkey"],
];

let bad = 0;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
const page = await ctx.newPage();

await page.goto(`${BASE}/ai-search`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

// Когда консультант включён, страница — это разговор, и раздел выбирает кнопка
// под ответом модели. Проверить тем же способом нельзя, и врать об этом не надо.
if (await page.locator('input[aria-label="Сообщение консультанту"]').count()) {
  console.log("--   консультант включён: разбор фразы проверяется не отсюда, пропускаем");
  await browser.close();
  process.exit(0);
}

console.log(`Разбор фразы ${BASE}\n`);
for (const [phrase, wantPath, wantDest] of CASES) {
  await page.goto(`${BASE}/ai-search`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const field = page.locator("input, textarea").first();
  await field.click();
  await field.fill(phrase);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);

  const url = new URL(page.url());
  const dest = url.searchParams.get("destination");
  const ok = url.pathname === wantPath && (wantDest === null || dest === wantDest);
  if (!ok) bad += 1;
  console.log(
    `${ok ? "ок  " : "НЕТ "} «${phrase}» → ${url.pathname}${dest ? ` (${dest})` : ""}` +
      (ok ? "" : `   ждали ${wantPath}${wantDest ? ` (${wantDest})` : ""}`),
  );
}

await browser.close();
console.log(bad ? `\nне сходится: ${bad}` : "\nВСЁ ЗЕЛЁНОЕ");
process.exit(bad ? 1 : 0);
