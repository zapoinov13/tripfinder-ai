#!/usr/bin/env node
/**
 * Несуществующий адрес должен отвечать 404, а существующий — собой.
 *
 * Проверка появилась после настоящей поломки: страница компании просила у
 * публичного представления колонку `plan_code`, которой там нет. Supabase
 * отвечал 400, код считал это за «база недоступна» и отдавал страницу с
 * кодом 200. Снаружи выглядело безобидно — «Компания не найдена», noindex, —
 * но означало, что серверный поиск компании мёртв: появись в базе живая
 * компания, её страница уехала бы в выдачу как ненайденная.
 *
 * Поэтому смотрим на код ответа, а не на текст: мягкий 404 тем и опасен, что
 * читается как исправная страница.
 *
 *     node scripts/notfound-check.mjs https://<домен>
 */
import process from "node:process";

const BASE = (process.argv[2] ?? "https://tripfinder-ai-swart.vercel.app").replace(/\/+$/, "");

/** Заведомо несуществующие адреса: и осмысленный uuid, и просто мусор. */
const MISSING = [
  "/tour/11111111-2222-4333-8444-555555555555",
  "/tour/takogo-tura-net",
  "/company/11111111-2222-4333-8444-555555555555",
  "/company/takoy-kompanii-net",
  "/destination/takogo-napravleniya-net",
  "/takoy-stranicy-net",
];

let bad = 0;
const check = (ok, msg) => {
  if (!ok) bad += 1;
  console.log(`${ok ? "ок  " : "НЕТ "} ${msg}`);
};

console.log(`Ненайденные адреса ${BASE}\n`);
for (const path of MISSING) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  check(res.status === 404, `${path} — ${res.status}${res.status === 404 ? "" : " вместо 404"}`);
}

// Если в базе есть живая компания, её страница обязана открыться собой.
// Пока каталог пуст, проверять нечего — и врать об этом не нужно.
console.log("");
// Те же публичные значения, что и в src/lib/supabase/config.ts: ключ
// публичный, представление открыто анонимному посетителю.
const SUPABASE_URL = "https://mgyufoyornzbwvgdfojb.supabase.co";
const SUPABASE_KEY = "sb_publishable_cykIutJS18rku4zxUBMkLw_LqXt9hag";
const rows = await fetch(`${SUPABASE_URL}/rest/v1/organizations_public?select=id,name&limit=1`, {
  headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` },
})
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);

if (rows.length === 0) {
  console.log("--   живых компаний в базе нет, страницу существующей проверять не на чем");
} else {
  const { id, name } = rows[0];
  const res = await fetch(`${BASE}/company/${id}`);
  const html = await res.text();
  check(res.status === 200, `/company/${id} — ${res.status}`);
  check(!/Компания не найдена/.test(html), `/company/${id} — открылась собой, а не «не найдена»`);
  check(html.includes(name), `/company/${id} — в разметке имя «${name}»`);
}

console.log(bad ? `\nне сходится: ${bad}` : "\nВСЁ ЗЕЛЁНОЕ");
process.exit(bad ? 1 : 0);
