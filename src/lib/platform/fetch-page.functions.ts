import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { extractFromHtml, type ExtractedPage } from "@/lib/platform/html-extract";

const schema = z.object({
  url: z.string().trim().url().max(2000),
});

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

function isBlockedTarget(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (host === "metadata" || host.endsWith(".metadata.google.internal")) return true;
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
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (compatible; TourGoBot/1.0; +https://tripfinder-ai.vercel.app)",
          "Accept-Language": "ru,en;q=0.8",
        },
      });
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
      const finalUrl = res.url || url.toString();
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
