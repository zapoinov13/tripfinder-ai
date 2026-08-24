import { destinations } from "@/data/demo";
import { carClasses, sportKinds, stayKinds } from "@/data/scenario-catalog";

export type VerticalId = "sport" | "stay" | "car";

export type VerticalOfferDraft = {
  vertical: VerticalId;
  name: string;
  city: string;
  destinationId: string;
  /** sport kind / stay kind / car class */
  kind: string;
  price: number;
  area: string;
  /** sport slot / stay hint / car gearbox+deposit */
  detail: string;
  sourceUrl: string;
  about: string;
  photos: string[];
  seats?: number;
  rating?: number;
};

/** @deprecated use VerticalOfferDraft */
export type SportOfferDraft = Omit<
  VerticalOfferDraft,
  "vertical" | "detail" | "seats" | "rating"
> & {
  slot: string;
};

function guessDestination(text: string): string {
  const lower = text.toLowerCase();
  const hit = destinations.find(
    (d) =>
      lower.includes(d.id) ||
      lower.includes(d.country.toLowerCase()) ||
      lower.includes(d.city.toLowerCase()) ||
      (d.id === "uae" &&
        (lower.includes("дубай") || lower.includes("dubai") || lower.includes("оаэ"))) ||
      (d.id === "turkey" &&
        (lower.includes("турц") || lower.includes("антал") || lower.includes("istanbul"))) ||
      (d.id === "thailand" &&
        (lower.includes("таиланд") || lower.includes("пхукет") || lower.includes("phuket"))) ||
      (d.id === "indonesia" && (lower.includes("бали") || lower.includes("bali"))) ||
      (d.id === "georgia" &&
        (lower.includes("груз") || lower.includes("батуми") || lower.includes("тбилис"))),
  );
  return hit?.id ?? "uae";
}

function extractPrice(text: string): number {
  const patterns = [
    /(?:цена|price|от|абонемент|\/\s*ночь|\/\s*день)\s*[:=]?\s*([\d\s]{3,12})\s*(?:тг|₸|kzt|тенге|aed|\$)?/i,
    /([\d\s]{4,10})\s*(?:тг|₸|kzt|тенге)/i,
    /([\d\s]{2,6})\s*(?:aed|дирхам)/i,
    /\$\s*([\d\s]{2,6})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const n = Number(m[1].replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) continue;
    if (/aed|дирхам|\$/i.test(m[0])) return Math.round(n * 140);
    return n;
  }
  return 0;
}

function extractSportKind(text: string): string {
  const lower = text.toLowerCase();
  const map: Array<[string, string[]]> = [
    ["padel", ["padel", "падел"]],
    ["tennis", ["tennis", "теннис"]],
    ["yoga", ["yoga", "йога"]],
    ["gym", ["gym", "зал", "fitness", "фитнес", "equinox"]],
    ["box", ["box", "бокс", "mma"]],
    ["pool", ["pool", "бассейн", "swim"]],
    ["golf", ["golf", "гольф"]],
    ["surf", ["surf", "серф"]],
    ["dive", ["dive", "дайв", "diving"]],
    ["coach", ["coach", "тренер", "персональн"]],
  ];
  for (const [id, keys] of map) {
    if (keys.some((k) => lower.includes(k))) return id;
  }
  return sportKinds[0]?.id ?? "gym";
}

function extractStayKind(text: string): string {
  const lower = text.toLowerCase();
  if (/villa|вилл/.test(lower)) return "villa";
  if (/apartment|апартамент/.test(lower)) return "apartment";
  if (/flat|квартир/.test(lower)) return "flat";
  if (/house|дом\b|дома/.test(lower)) return "house";
  if (/hotel|отел|resort|рикс|rixos/.test(lower)) return "hotel";
  return stayKinds[0]?.id ?? "hotel";
}

function extractCarClass(text: string): string {
  const lower = text.toLowerCase();
  if (/cabrio|кабрио/.test(lower)) return "cabrio";
  if (/minivan|минив|staria/.test(lower)) return "minivan";
  if (/suv|patrol|джип/.test(lower)) return "suv";
  if (/sport|спорткар|ferrari|lamborghini/.test(lower)) return "sport";
  if (/premium|mercedes|bmw|lexus/.test(lower)) return "premium";
  if (/comfort|камри|camry/.test(lower)) return "comfort";
  if (/eco|yaris|spark|эконом/.test(lower)) return "eco";
  return carClasses[0]?.id ?? "eco";
}

function extractTitle(text: string, url: string, fallback: string): string {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^https?:\/\//i.test(l));
  if (lines[0]) return lines[0].slice(0, 80);
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
    return decodeURIComponent(slug)
      .replace(/[-_@.]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
      .slice(0, 80);
  } catch {
    return fallback;
  }
}

function extractArea(text: string): string {
  const m = text.match(
    /\b(JLT|JBR|DIFC|Marina|Downtown|Palm|Kite Beach|Таксим|Ваке|Санур|Семиньяк|Убуд|Business Bay)\b/i,
  );
  return m?.[1] ?? "";
}

function extractSlot(text: string): string {
  const m =
    text.match(/(\d{1,2}:\d{2})/) ||
    text.match(/(\d{1,3}\s*мин)/i) ||
    text.match(/(дневн\w*|абонемент|персональн\w*|урок|занятие)/i);
  return m?.[1] ?? "";
}

function extractSeats(text: string): number {
  const m = text.match(/(\d)\s*мест/i);
  if (m?.[1]) return Number(m[1]);
  return 5;
}

function extractGearbox(text: string): string {
  const lower = text.toLowerCase();
  if (/механ|manual/.test(lower)) return "механика";
  return "автомат";
}

function extractDeposit(text: string): string {
  const lower = text.toLowerCase();
  if (/без депозит/.test(lower)) return "без депозита";
  return "с депозитом";
}

function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map((m) => m[0]!);
}

function isInstagram(url: string) {
  return /instagram\.com|instagr\.am/i.test(url);
}

function emptyDraft(vertical: VerticalId, destinationId = "uae"): VerticalOfferDraft {
  const dest = destinations.find((d) => d.id === destinationId) ?? destinations[0]!;
  const kind = vertical === "sport" ? "gym" : vertical === "stay" ? "hotel" : "eco";
  return {
    vertical,
    name: "",
    city: dest.city,
    destinationId: dest.id,
    kind,
    price: 0,
    area: "",
    detail: vertical === "stay" ? "за ночь" : vertical === "car" ? "автомат · с депозитом" : "",
    sourceUrl: "",
    about: "",
    photos: [],
    ...(vertical === "car" ? { seats: 5 } : {}),
    ...(vertical === "stay" ? { rating: 0 } : {}),
  };
}

function baseParse(input: { url: string; text?: string }, fallbackTitle: string) {
  const url = input.url.trim();
  const text = (input.text ?? "").trim();
  const warnings: string[] = [];
  const fields: string[] = [];

  if (!url && !text) {
    warnings.push("Вставьте ссылку на Instagram или сайт и описание");
  }

  const sourceKind = isInstagram(url) ? ("instagram" as const) : ("website" as const);
  const blob = `${url}\n${text}`;
  const destinationId = guessDestination(blob);
  const dest = destinations.find((d) => d.id === destinationId) ?? destinations[0]!;
  const photos = extractUrls(blob)
    .filter((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u))
    .slice(0, 8);
  const name = extractTitle(text || url, url, fallbackTitle);
  const price = extractPrice(blob);
  const area = extractArea(blob);

  if (sourceKind === "instagram") {
    warnings.push(
      "Instagram не отдаёт профиль напрямую в браузер. Вставьте bio или текст поста рядом со ссылкой.",
    );
  } else if (url && !text) {
    warnings.push(
      "По ссылке пока читаем адрес и название. Для точной цены вставьте текст со страницы.",
    );
  }

  fields.push("направление", "название");
  if (price) fields.push("цена");
  if (area) fields.push("район");
  if (photos.length) fields.push("фото");

  return {
    url,
    text,
    blob,
    destinationId,
    dest,
    photos,
    name,
    price,
    area,
    fields,
    warnings,
    sourceKind,
  };
}

export function draftVerticalFromLink(input: {
  vertical: VerticalId;
  url: string;
  text?: string;
}): {
  draft: VerticalOfferDraft;
  fields: string[];
  warnings: string[];
  sourceKind: "instagram" | "website";
} {
  const { vertical } = input;
  const fallback =
    vertical === "sport" ? "Спортивная услуга" : vertical === "stay" ? "Жильё" : "Авто";
  const parsed = baseParse(input, fallback);
  if (
    parsed.warnings[0]?.startsWith("Вставьте") &&
    !input.url.trim() &&
    !(input.text ?? "").trim()
  ) {
    return {
      draft: emptyDraft(vertical),
      fields: [],
      warnings: parsed.warnings,
      sourceKind: "website",
    };
  }

  const { dest, photos, name, price, area, fields, warnings, sourceKind, text, url, blob } = parsed;

  if (vertical === "sport") {
    const kind = extractSportKind(blob);
    const detail = extractSlot(blob);
    fields.push("тип");
    if (detail) fields.push("слот");
    return {
      draft: {
        vertical,
        name,
        city: dest.city,
        destinationId: dest.id,
        kind,
        price,
        area,
        detail,
        sourceUrl: url,
        about: text.slice(0, 800),
        photos,
      },
      fields,
      warnings,
      sourceKind,
    };
  }

  if (vertical === "stay") {
    const kind = extractStayKind(blob);
    fields.push("тип");
    return {
      draft: {
        vertical,
        name,
        city: dest.city,
        destinationId: dest.id,
        kind,
        price,
        area,
        detail: "за ночь",
        sourceUrl: url,
        about: text.slice(0, 800),
        photos,
        rating: 0,
      },
      fields,
      warnings,
      sourceKind,
    };
  }

  const kind = extractCarClass(blob);
  const seats = extractSeats(blob);
  const gearbox = extractGearbox(blob);
  const deposit = extractDeposit(blob);
  fields.push("класс");
  return {
    draft: {
      vertical,
      name,
      city: dest.city,
      destinationId: dest.id,
      kind,
      price,
      area: "",
      detail: `${gearbox} · ${deposit}`,
      sourceUrl: url,
      about: text.slice(0, 800),
      photos,
      seats,
    },
    fields,
    warnings,
    sourceKind,
  };
}

export function draftSportFromLink(input: { url: string; text?: string }) {
  const result = draftVerticalFromLink({ ...input, vertical: "sport" });
  const { detail, seats: _s, rating: _r, vertical: _v, ...rest } = result.draft;
  return {
    ...result,
    draft: { ...rest, slot: detail } satisfies SportOfferDraft,
  };
}

export function sportKindLabel(kind: string) {
  return sportKinds.find((k) => k.id === kind)?.label ?? kind;
}

export function stayKindLabel(kind: string) {
  return stayKinds.find((k) => k.id === kind)?.label ?? kind;
}

export function carClassLabel(kind: string) {
  return carClasses.find((k) => k.id === kind)?.label ?? kind;
}

export function verticalLabel(vertical: VerticalId) {
  if (vertical === "sport") return "Спорт";
  if (vertical === "stay") return "Жильё";
  return "Авто";
}
