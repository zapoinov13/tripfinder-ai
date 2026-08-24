import { destinations } from "@/data/demo";
import { sportKinds } from "@/data/scenario-catalog";

export type SportOfferDraft = {
  name: string;
  city: string;
  destinationId: string;
  kind: string;
  price: number;
  area: string;
  slot: string;
  sourceUrl: string;
  about: string;
  photos: string[];
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
    /(?:цена|price|от|абонемент)\s*[:=]?\s*([\d\s]{3,12})\s*(?:тг|₸|kzt|тенге|aed|\$)?/i,
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

function extractKind(text: string): string {
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

function extractTitle(text: string, url: string): string {
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
    return "Спортивная услуга";
  }
}

function extractArea(text: string): string {
  const m = text.match(
    /\b(JLT|JBR|DIFC|Marina|Downtown|Palm|Kite Beach|Таксим|Ваке|Санур|Семиньяк|Убуд)\b/i,
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

function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map((m) => m[0]!);
}

function isInstagram(url: string) {
  return /instagram\.com|instagr\.am/i.test(url);
}

function emptyDraft(destinationId = "uae"): SportOfferDraft {
  const dest = destinations.find((d) => d.id === destinationId) ?? destinations[0]!;
  return {
    name: "",
    city: dest.city,
    destinationId: dest.id,
    kind: "gym",
    price: 0,
    area: "",
    slot: "",
    sourceUrl: "",
    about: "",
    photos: [],
  };
}

/**
 * Собирает черновик спортивной услуги из ссылки Instagram/сайта и вставленного текста.
 * Полный автоскрейп Instagram без Meta API недоступен с клиента: берём URL + bio/пост
 * (или HTML сайта через будущий серверный proxy) и заполняем поля для проверки оператором.
 */
export function draftSportFromLink(input: {
  url: string;
  text?: string;
}): { draft: SportOfferDraft; fields: string[]; warnings: string[]; sourceKind: "instagram" | "website" } {
  const url = input.url.trim();
  const text = (input.text ?? "").trim();
  const warnings: string[] = [];
  const fields: string[] = [];

  if (!url && !text) {
    return {
      draft: emptyDraft(),
      fields: [],
      warnings: ["Вставьте ссылку на Instagram или сайт и описание услуги"],
      sourceKind: "website",
    };
  }

  const sourceKind = isInstagram(url) ? "instagram" : "website";
  const blob = `${url}\n${text}`;
  const destinationId = guessDestination(blob);
  const dest = destinations.find((d) => d.id === destinationId) ?? destinations[0]!;
  const photos = extractUrls(blob).filter((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)).slice(0, 8);
  const name = extractTitle(text || url, url);
  const kind = extractKind(blob);
  const price = extractPrice(blob);
  const area = extractArea(blob);
  const slot = extractSlot(blob);

  if (sourceKind === "instagram") {
    warnings.push(
      "Instagram не отдаёт профиль напрямую в браузер. Вставьте bio или текст поста рядом со ссылкой: так TourGo заполнит карточку.",
    );
  } else if (url && !text) {
    warnings.push(
      "По ссылке пока читаем адрес и название. Для точной цены и описания вставьте текст со страницы.",
    );
  }

  fields.push("направление", "название", "тип");
  if (price) fields.push("цена");
  if (area) fields.push("район");
  if (slot) fields.push("слот");
  if (photos.length) fields.push("фото");

  return {
    draft: {
      name,
      city: dest.city,
      destinationId: dest.id,
      kind,
      price,
      area,
      slot,
      sourceUrl: url,
      about: text.slice(0, 800),
      photos,
    },
    fields,
    warnings,
    sourceKind,
  };
}

export function sportKindLabel(kind: string) {
  return sportKinds.find((k) => k.id === kind)?.label ?? kind;
}
