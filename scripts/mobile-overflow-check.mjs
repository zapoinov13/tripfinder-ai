#!/usr/bin/env node
/**
 * Страница не должна двигаться вбок.
 *
 * Ширина содержимого сверяется с шириной экрана на трёх размерах телефона.
 * Если что-то выпирает — печатаем виновника: элемент, его классы и координаты.
 */
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";
const BASE = process.argv[2] ?? "http://127.0.0.1:8779";
const PAGES = ["/", "/search", "/excursions", "/stays", "/cars", "/sport", "/destinations", "/request", "/about"];
const WIDTHS = [360, 390, 430];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let bad = 0;
for (const W of WIDTHS) {
const ctx = await b.newContext({ viewport: { width: W, height: 844 } });
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
const p = await ctx.newPage();
for (const path of PAGES) {
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  const res = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollable = document.documentElement.scrollWidth > vw + 1;
    const bad = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.right > vw + 1 || r.left < -1) {
        bad.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className)).slice(0, 90),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    });
    return { vw, scrollWidth: document.documentElement.scrollWidth, scrollable, bad: bad.slice(0, 6) };
  });
  if (res.scrollable) {
    bad += 1;
    console.log(`ВБОК ${W}px ${path}  содержимое ${res.scrollWidth} при экране ${res.vw}`);
    for (const el of res.bad) console.log(`      ${el.tag} [${el.left}…${el.right}] ${el.cls}`);
  }
}
await ctx.close();
}
console.log(bad ? `\nстраниц с горизонтальной прокруткой: ${bad}` : "страница вбок не двигается ни на одном размере");
await b.close();
process.exit(bad ? 1 : 0);
