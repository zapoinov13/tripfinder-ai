/** Pure HTML → text helpers (safe on server and client). */

export type ExtractedPage = {
  title: string;
  description: string;
  text: string;
  images: string[];
};

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
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

function absolutize(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/**
 * Strip scripts/styles and pull title, description, readable text and images from HTML.
 */
export function extractFromHtml(html: string, pageUrl: string): ExtractedPage {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
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
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " "),
  )
    .trim()
    .slice(0, 12000);

  const images: string[] = [];
  const ogImage = metaContent(cleaned, "og:image") || metaContent(cleaned, "twitter:image");
  if (ogImage) {
    const abs = absolutize(ogImage, pageUrl);
    if (abs) images.push(abs);
  }

  for (const m of bodyHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const abs = absolutize(m[1]!, pageUrl);
    if (!abs) continue;
    if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(abs) && !/\/image|cdn|media|photo/i.test(abs)) {
      continue;
    }
    if (!images.includes(abs)) images.push(abs);
    if (images.length >= 8) break;
  }

  return {
    title: title.slice(0, 160),
    description: description.slice(0, 400),
    text,
    images,
  };
}

export function pageToIngestText(page: ExtractedPage): string {
  return [page.title, page.description, page.text].filter(Boolean).join("\n\n").trim();
}
