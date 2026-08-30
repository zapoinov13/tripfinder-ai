#!/usr/bin/env node
/**
 * Локальное зеркало боевого сайта для проверок из контейнера.
 *
 * Chromium в этом окружении не умеет ходить через агентский прокси: в его
 * хранилище нет корневого сертификата, а отключать проверку TLS нельзя. Node
 * же ходит нормально — ему сертификат можно передать переменной. Поэтому
 * между ними ставим посредника: Chromium стучится на 127.0.0.1, а мы
 * пересылаем запрос на боевой домен и отдаём ответ как есть.
 *
 * Проверяется при этом настоящий боевой сервер — свой сборки мы не поднимаем.
 *
 *     node scripts/live-proxy.mjs https://tripfinder-ai-swart.vercel.app 8790
 *
 * С флагом `--with-headers` зеркало накладывает на живые ответы заголовки из
 * `vercel.json` — то есть показывает сайт таким, каким он станет после
 * деплоя. Это нужно, чтобы проверить CSP до боя, а не после: политика,
 * которой никогда не было, вполне может отрезать что-то живое.
 *
 *     node scripts/live-proxy.mjs https://<домен> 8790 --with-headers
 *
 * С флагом `--via-supabase=<порт>` зеркало подменяет в ответах адрес Supabase
 * на второе зеркало, поднятое этим же скриптом. Без подмены боевая страница в
 * контейнере остаётся без данных: браузер полез бы в supabase.co напрямую, а
 * туда он не ходит. Это единственное отличие от боя — одно имя хоста, — и
 * ради него становится видно то, ради чего проверка и затевается: хватает ли
 * прав, приезжают ли строки, что показывает страница с настоящими данными.
 *
 *     node scripts/live-proxy.mjs https://<проект>.supabase.co 5433
 *     node scripts/live-proxy.mjs https://<домен> 8790 --via-supabase=5433
 */
import { readFileSync } from "node:fs";
import http from "node:http";
import process from "node:process";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const WITH_HEADERS = process.argv.includes("--with-headers");
const VIA_SUPABASE = process.argv.find((a) => a.startsWith("--via-supabase="))?.split("=")[1];
const TARGET = (args[0] ?? "https://tripfinder-ai-swart.vercel.app").replace(/\/+$/, "");
const PORT = Number(args[1] ?? 8790);

/**
 * Заголовки из `vercel.json` для пути.
 *
 * Разбираем только то, что реально используем: `source` вида `/(.*)` и
 * конкретные адреса. Полный синтаксис маршрутов Vercel тут не нужен.
 */
function vercelHeadersFor(path) {
  if (!WITH_HEADERS) return {};
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const out = {};
  for (const rule of config.headers ?? []) {
    const matches = rule.source === "/(.*)" || rule.source === path;
    if (!matches) continue;
    for (const { key, value } of rule.headers) out[key.toLowerCase()] = value;
  }
  return out;
}

/** Заголовки, которые нельзя пересылать дальше: они описывают наш же канал. */
const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

const server = http.createServer(async (req, res) => {
  try {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!HOP.has(k.toLowerCase())) headers[k] = v;
    }
    // Боевой сервер должен видеть своё имя, иначе Vercel отдаст чужой проект.
    headers["accept-encoding"] = "identity";

    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await new Promise((resolve) => {
            const chunks = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", () => resolve(Buffer.concat(chunks)));
          });

    const upstream = await fetch(TARGET + req.url, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const out = {};
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (HOP.has(k) || k === "content-encoding" || k === "content-length") return;
      // Переезд внутри сайта оставляем внутри зеркала.
      if (k === "location") {
        out.location = value.startsWith(TARGET) ? value.slice(TARGET.length) || "/" : value;
        return;
      }
      // HSTS и CSP с upgrade-insecure-requests сломали бы http-зеркало.
      if (k === "strict-transport-security") return;
      if (k === "content-security-policy" || k === "content-security-policy-report-only") {
        let policy = value.replace(/upgrade-insecure-requests;?/gi, "");
        // Политика перечисляет боевой адрес Supabase поимённо — и правильно
        // делает. Раз мы подменили адрес на зеркало, его же и разрешаем:
        // иначе браузер отрежет все запросы к базе, и проверять будет нечего.
        if (VIA_SUPABASE) {
          policy = policy.replace(
            /connect-src ([^;]*)/i,
            (_, list) => `connect-src ${list} http://127.0.0.1:${VIA_SUPABASE}`,
          );
        }
        out[k] = policy;
        return;
      }
      out[k] = value;
    });

    // Заголовки Vercel накладываем поверх ответа: на бою их добавляет край,
    // а не приложение, и порядок тут такой же.
    Object.assign(out, vercelHeadersFor(new URL(req.url, "http://x").pathname));

    let buf = Buffer.from(await upstream.arrayBuffer());

    // Адрес Supabase зашит в бандл при сборке — на лету меняем его на зеркало.
    const type = String(out["content-type"] ?? "");
    if (VIA_SUPABASE && /javascript|html|json/i.test(type)) {
      const swapped = buf
        .toString("utf8")
        .replace(/https:\/\/[a-z0-9]+\.supabase\.co/gi, `http://127.0.0.1:${VIA_SUPABASE}`);
      buf = Buffer.from(swapped, "utf8");
      out["content-length"] = String(buf.length);
    }

    res.writeHead(upstream.status, out);
    res.end(req.method === "HEAD" ? undefined : buf);
  } catch (error) {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`зеркало не смогло достучаться до ${TARGET}: ${error.message}`);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `зеркало ${TARGET} → http://127.0.0.1:${PORT}` +
      (WITH_HEADERS ? " (с заголовками из vercel.json)" : ""),
  );
});
