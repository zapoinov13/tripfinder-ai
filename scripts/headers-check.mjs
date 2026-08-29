#!/usr/bin/env node
/**
 * Защитные заголовки: проверяем то, что реально отдаёт боевой сервер.
 *
 * Так уже один раз промахнулись: заголовки лежали в `public/_headers`, файл
 * выглядел настроенным — а Vercel этот формат не читает, и на боевом сайте не
 * было ни CSP, ни nosniff. Конфиг в репозитории ничего не доказывает; доказывает
 * только ответ сервера. Поэтому проверка ходит по живому адресу.
 *
 *     node scripts/headers-check.mjs https://<домен>
 */
import process from "node:process";

const BASE = (process.argv[2] ?? "https://tripfinder-ai-swart.vercel.app").replace(/\/+$/, "");
const PATHS = ["/", "/search", "/about", "/robots.txt"];

/** Ждём именно эти заголовки; значение проверяем по существу, а не буквально. */
const EXPECT = [
  ["content-security-policy", (v) => /default-src 'self'/.test(v) && /object-src 'none'/.test(v)],
  ["x-content-type-options", (v) => v.trim().toLowerCase() === "nosniff"],
  ["referrer-policy", (v) => v.includes("strict-origin")],
  ["permissions-policy", (v) => /payment=\(\)/.test(v)],
  ["cross-origin-opener-policy", (v) => v.includes("same-origin")],
  ["strict-transport-security", (v) => /max-age=(\d+)/.test(v) && Number(RegExp.$1) >= 31536000],
];

/**
 * Запрос с повтором.
 *
 * Проверка ходит по сети, а сеть иногда рвётся: один разрыв не должен
 * читаться как «сайт сломан». Три попытки с паузой — и только потом ошибка.
 */
async function get(url, init) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      last = error;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  throw last;
}

let bad = 0;
const check = (ok, msg) => {
  if (!ok) bad += 1;
  console.log(`${ok ? "ок  " : "НЕТ "} ${msg}`);
};

console.log(`Заголовки ${BASE}\n`);
for (const path of PATHS) {
  const res = await get(BASE + path, { redirect: "manual" });
  for (const [name, valid] of EXPECT) {
    const value = res.headers.get(name);
    check(Boolean(value) && valid(value), `${path} — ${name}${value ? "" : " (отсутствует)"}`);
  }
  console.log("");
}

console.log(bad ? `\nне отдаётся: ${bad}` : "\nВСЁ ЗЕЛЁНОЕ");
process.exit(bad ? 1 : 0);
