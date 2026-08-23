import { destinations, type MealCode } from "@/data/demo";
import { normalizeMealType } from "@/lib/platform-contracts";

import { emptyDraft, type TourDraft } from "./tour-editor";

function guessDestination(text: string): string {
  const lower = text.toLowerCase();
  const hit = destinations.find(
    (d) =>
      lower.includes(d.id) ||
      lower.includes(d.country.toLowerCase()) ||
      lower.includes(d.city.toLowerCase()) ||
      (d.id === "uae" && (lower.includes("дубай") || lower.includes("dubai") || lower.includes("оаэ"))) ||
      (d.id === "turkey" && (lower.includes("турц") || lower.includes("антал") || lower.includes("antaly"))) ||
      (d.id === "egypt" && (lower.includes("егип") || lower.includes("хургад") || lower.includes("sharm"))) ||
      (d.id === "thailand" && (lower.includes("таиланд") || lower.includes("пхукет") || lower.includes("phuket"))) ||
      (d.id === "georgia" && (lower.includes("груз") || lower.includes("батуми") || lower.includes("тбилис"))),
  );
  return hit?.id ?? "uae";
}

function extractPrice(text: string): number | undefined {
  const patterns = [
    /(?:цена|price|от)\s*[:=]?\s*([\d\s]{5,12})\s*(?:тг|₸|kzt|тенге)?/i,
    /([\d\s]{6,10})\s*(?:тг|₸|kzt|тенге)/i,
    /\$\s*([\d\s]{3,7})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const n = Number(m[1].replace(/\s/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function extractNights(text: string): number | undefined {
  const m = text.match(/(\d{1,2})\s*(?:ноч|night|н\b)/i);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return n > 0 && n < 60 ? n : undefined;
}

function extractMeal(text: string): MealCode | undefined {
  const lower = text.toLowerCase();
  if (/ultra\s*all|uai|ультра/.test(lower)) return "UAI";
  if (/all\s*inclusive|\bai\b|всё включено|все включено/.test(lower)) return "AI";
  if (/\bfb\b|полный пансион/.test(lower)) return "FB";
  if (/\bhb\b|полупансион/.test(lower)) return "HB";
  if (/\bbb\b|завтрак/.test(lower)) return "BB";
  if (/\bro\b|без питания/.test(lower)) return "RO";
  return undefined;
}

function extractFromCity(text: string): string | undefined {
  const m = text.match(/(?:вылет|из|from)\s*[:\-]?\s*(Алматы|Астана|Шымкент|Актау|Атырау|Москва|Ташкент)/i);
  return m?.[1];
}

function extractHotel(text: string): string | undefined {
  const m =
    text.match(/(?:отель|hotel)\s*[:\-]?\s*([^\n,·|]{3,60})/i) ||
    text.match(/\b([A-Z][A-Za-z0-9 &''-]{2,40}\s(?:Hotel|Resort|Spa|Palace|Inn))\b/);
  return m?.[1]?.trim();
}

function extractTitle(text: string): string | undefined {
  const first = text
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 8 && !/^https?:\/\//i.test(l));
  if (!first) return undefined;
  return first.slice(0, 120);
}

function extractDates(text: string): { start?: string; end?: string } {
  const iso = [...text.matchAll(/(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]!);
  if (iso.length >= 2) return { start: iso[0], end: iso[1] };
  if (iso.length === 1) return { start: iso[0] };
  const ru = [...text.matchAll(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g)];
  if (ru.length >= 1) {
    const toIso = (m: RegExpMatchArray) => {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    };
    const start = toIso(ru[0]!);
    const end = ru[1] ? toIso(ru[1]) : undefined;
    return { start, end };
  }
  return {};
}

function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map((m) => m[0]!);
}

/**
 * Heuristic import from a tour page URL (path + query).
 * Full HTML scrape needs a server proxy; this fills a draft for operator review.
 */
export function draftFromUrl(url: string): { draft: TourDraft; fields: string[] } {
  const fields: string[] = [];
  let path = url;
  let search = "";
  try {
    const u = new URL(url);
    path = `${u.hostname}${u.pathname}${u.search}`;
    search = u.search;
  } catch {
    /* keep raw */
  }
  const lower = `${path} ${search}`.toLowerCase();
  const destinationId = guessDestination(lower);
  const draft = emptyDraft(destinationId);
  const nights = extractNights(lower) ?? draft.nights;
  const price = extractPrice(lower);
  const meal = extractMeal(lower);
  const fromCity = extractFromCity(url) ?? extractFromCity(lower);

  const slugTitle = (() => {
    try {
      const u = new URL(url);
      const slug = u.pathname.split("/").filter(Boolean).pop() ?? "";
      const cleaned = decodeURIComponent(slug)
        .replace(/[-_]+/g, " ")
        .replace(/\.\w+$/, "")
        .trim();
      return cleaned.length > 3 ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
    } catch {
      return "";
    }
  })();

  const next: TourDraft = {
    ...draft,
    nights,
    dateEnd: new Date(new Date(draft.dateStart).getTime() + nights * 86400000)
      .toISOString()
      .slice(0, 10),
    sourceUrl: url,
    ...(price ? { price } : {}),
    ...(meal ? { mealCode: meal } : {}),
    ...(fromCity ? { fromCity } : {}),
    ...(slugTitle ? { title: slugTitle, hotelName: draft.customHotel ? slugTitle : draft.hotelName } : {}),
  };

  fields.push("направление", "даты", "питание", "цена");
  if (slugTitle) fields.push("название");
  return { draft: next, fields };
}

/**
 * Build a tour draft from a Telegram post / channel message / pasted text + links.
 */
export function draftFromTelegram(input: {
  text: string;
  sourceLink?: string;
}): { draft: TourDraft; fields: string[]; warnings: string[] } {
  const text = input.text.trim();
  const warnings: string[] = [];
  if (!text) {
    return { draft: emptyDraft(), fields: [], warnings: ["Вставьте текст поста или описание тура"] };
  }

  const urls = extractUrls(text);
  const destinationId = guessDestination(text);
  const draft = emptyDraft(destinationId);
  const nights = extractNights(text) ?? draft.nights;
  const price = extractPrice(text);
  const meal = extractMeal(text) ?? (normalizeMealType("AI") as MealCode);
  const fromCity = extractFromCity(text);
  const hotel = extractHotel(text);
  const title = extractTitle(text);
  const dates = extractDates(text);
  const fields: string[] = ["направление"];

  const photoUrls = urls.filter((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u));
  const sourceLink =
    input.sourceLink?.trim() ||
    urls.find((u) => /t\.me\//i.test(u)) ||
    urls.find((u) => !photoUrls.includes(u));

  if (!price) warnings.push("Цену не нашли, проверьте перед публикацией");
  if (!hotel) warnings.push("Название отеля не нашли, укажите вручную");

  const start = dates.start ?? draft.dateStart;
  const end =
    dates.end ??
    new Date(new Date(start).getTime() + nights * 86400000).toISOString().slice(0, 10);

  const next: TourDraft = {
    ...draft,
    nights,
    dateStart: start,
    dateEnd: end,
    mealCode: meal,
    description: text.slice(0, 2000),
    sourceUrl: sourceLink,
    ...(price ? { price } : {}),
    ...(fromCity ? { fromCity } : {}),
    ...(hotel
      ? { hotelName: hotel, customHotel: true, title: title || hotel }
      : title
        ? { title }
        : {}),
    ...(photoUrls.length ? { photos: photoUrls.slice(0, 8) } : {}),
  };

  fields.push("описание", "даты", "питание");
  if (price) fields.push("цена");
  if (hotel) fields.push("отель");
  if (photoUrls.length) fields.push("фото");
  if (sourceLink) fields.push("ссылка");

  return { draft: next, fields, warnings };
}
