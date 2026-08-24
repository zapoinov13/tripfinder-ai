/**
 * Optional Edge Function mirror of fetch-page (SSRF-safe HTML extract).
 * Primary path in the app is TanStack createServerFn `fetchPageContent`.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  return false;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function metaContent(html: string, key: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return "";
}

function tagText(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m?.[1]) return "";
  return decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractFromHtml(html: string, pageUrl: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const title =
    metaContent(cleaned, "og:title") ||
    metaContent(cleaned, "twitter:title") ||
    tagText(cleaned, "title") ||
    tagText(cleaned, "h1");
  const description =
    metaContent(cleaned, "og:description") ||
    metaContent(cleaned, "description") ||
    metaContent(cleaned, "twitter:description");
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? cleaned;
  const text = decodeEntities(
    bodyHtml
      .replace(/<(br|p|div|li|h[1-6]|tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " "),
  )
    .trim()
    .slice(0, 12000);
  const images: string[] = [];
  const ogImage = metaContent(cleaned, "og:image");
  if (ogImage) {
    try {
      images.push(new URL(ogImage, pageUrl).toString());
    } catch {
      /* ignore */
    }
  }
  return {
    title: title.slice(0, 160),
    description: description.slice(0, 400),
    text,
    images,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as { url?: string };
    const raw = body.url?.trim();
    if (!raw) return json({ ok: false, error: "url required" }, 400);

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return json({ ok: false, error: "invalid url" }, 400);
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      return json({ ok: false, error: "only http(s)" }, 400);
    }
    if (isBlockedTarget(url)) return json({ ok: false, error: "host not allowed" }, 400);

    const kind = /instagram\.com|instagr\.am/i.test(url.hostname) ? "instagram" : "website";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; TourGoBot/1.0)",
        },
      });
      if (!res.ok) return json({ ok: false, error: `HTTP ${res.status}` }, 502);
      const html = await res.text();
      if (html.length > 1_800_000) return json({ ok: false, error: "page too large" }, 413);
      const page = extractFromHtml(html, res.url || url.toString());
      return json({
        ok: true,
        url: raw,
        finalUrl: res.url || url.toString(),
        kind,
        page,
        ...(kind === "instagram"
          ? { warning: "Instagram often returns a shell page; paste bio if fields are empty." }
          : {}),
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "fetch failed" },
      500,
    );
  }
});
