import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractFromHtml, type ExtractedPage } from "@/lib/platform/html-extract";

const schema = z.object({
  url: z.string().trim().url().max(2000),
});

/** Больше трёх перенаправлений для карточки услуги не бывает. */
const MAX_REDIRECTS = 3;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

function isBlockedTarget(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^10\./.test(host)) return true;
  if (/^127\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (host === "metadata" || host.endsWith(".metadata.google.internal")) return true;

  // IPv6: петля, уникальные локальные (fc00::/7) и link-local (fe80::/10),
  // плюс запись IPv4 внутри IPv6 вида ::ffff:127.0.0.1.
  if (host === "::" || host === "::1") return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/i.test(host)) return true;
  // ::ffff:127.0.0.1 — URL нормализует такой адрес в ::ffff:7f00:1,
  // поэтому разбираем обе записи: точечную и шестнадцатеричную.
  const mappedDotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(host);
  if (mappedDotted?.[1]) return isBlockedTarget(new URL(`http://${mappedDotted[1]}`));
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(host);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1]!, 16);
    const low = Number.parseInt(mappedHex[2]!, 16);
    const dotted = [high >> 8, high & 255, low >> 8, low & 255].join(".");
    return isBlockedTarget(new URL(`http://${dotted}`));
  }

  // Адрес числом: http://2130706433/ — это 127.0.0.1.
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (Number.isFinite(n) && n <= 0xffffffff) {
      const dotted = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
      return isBlockedTarget(new URL(`http://${dotted}`));
    }
    return true;
  }
  // Восьмеричная/шестнадцатеричная запись октетов — не разбираем, отклоняем.
  if (/^0x[0-9a-f]+$/i.test(host) || /^0\d/.test(host)) return true;

  return false;
}

export type FetchPageResult =
  | {
      ok: true;
      url: string;
      finalUrl: string;
      kind: "website" | "instagram";
      page: ExtractedPage;
      warning?: string;
    }
  | { ok: false; error: string };

/**
 * Server-side HTML fetch + extract for operator import (tours, stays, cars, sport).
 * Blocks private/local hosts. Instagram pages usually return a login wall: caller should
 * still accept pasted bio text.
 */
export const fetchPageContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<FetchPageResult> => {
    let url: URL;
    try {
      url = new URL(data.url);
    } catch {
      return { ok: false, error: "Некорректная ссылка" };
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      return { ok: false, error: "Только http(s) ссылки" };
    }
    if (isBlockedTarget(url)) {
      return { ok: false, error: "Этот адрес нельзя загружать" };
    }

    const kind = /instagram\.com|instagr\.am/i.test(url.hostname) ? "instagram" : "website";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      // Редиректы проходим вручную: с redirect:"follow" проверка адреса
      // работала только для первой ссылки, а чужой сайт мог увести запрос
      // на внутренний адрес — 302 на 169.254.169.254 и облачные метаданные
      // уехали бы наружу. Каждый шаг проверяем заново.
      let target = url;
      let res: Response | null = null;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        res = await fetch(target.toString(), {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (compatible; TourGoBot/1.0; +https://tripfinder-ai.vercel.app)",
            "Accept-Language": "ru,en;q=0.8",
          },
        });
        if (![301, 302, 303, 307, 308].includes(res.status)) break;

        const location = res.headers.get("location");
        if (!location) return { ok: false, error: "Сайт ответил редиректом без адреса" };
        if (hop === MAX_REDIRECTS) return { ok: false, error: "Слишком много перенаправлений" };

        let nextUrl: URL;
        try {
          nextUrl = new URL(location, target);
        } catch {
          return { ok: false, error: "Некорректный адрес перенаправления" };
        }
        if (!["http:", "https:"].includes(nextUrl.protocol)) {
          return { ok: false, error: "Перенаправление на неподдерживаемый протокол" };
        }
        if (isBlockedTarget(nextUrl)) {
          return { ok: false, error: "Перенаправление на закрытый адрес" };
        }
        target = nextUrl;
      }
      if (!res) return { ok: false, error: "Не удалось загрузить страницу" };
      if (!res.ok) {
        return { ok: false, error: `Сайт ответил HTTP ${res.status}` };
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!/html|text\/plain|xml/i.test(contentType) && contentType) {
        return { ok: false, error: "По ссылке не HTML-страница" };
      }

      const buf = await res.arrayBuffer();
      if (buf.byteLength > 1_800_000) {
        return { ok: false, error: "Страница слишком большая для разбора" };
      }
      const html = new TextDecoder("utf-8").decode(buf);
      const finalUrl = res.url || target.toString();
      const page = extractFromHtml(html, finalUrl);

      if (!page.title && !page.text && !page.description) {
        return {
          ok: false,
          error:
            kind === "instagram"
              ? "Instagram не отдал содержимое. Вставьте bio или текст поста вручную."
              : "Не удалось прочитать текст страницы",
        };
      }

      return {
        ok: true,
        url: data.url,
        finalUrl,
        kind,
        page,
        ...(kind === "instagram"
          ? {
              warning:
                "Instagram часто отдаёт только оболочку. Если поля пустые, вставьте bio или пост.",
            }
          : {}),
      };
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Сайт не ответил вовремя"
          : err instanceof Error
            ? err.message
            : "Не удалось загрузить страницу";
      return { ok: false, error: message };
    } finally {
      clearTimeout(timer);
    }
  });
