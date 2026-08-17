import { destinations, mealOptions, resortsByDestination } from "@/data/demo";
import { PRICE_MAX, PRICE_MIN, type SearchParams, toSearchLink } from "@/lib/search";

export type ParsedTravelQuery = {
  originalQuery: string;
  origin: string;
  destination: string;
  city: string;
  adults: number;
  children: number;
  childAges: number[];
  duration: number;
  budgetMax: number;
  currency: "KZT";
  meals: string[];
  preferences: string[];
};

export type AiChip = {
  key: keyof ParsedTravelQuery;
  label: string;
  value: string;
};

const destinationAliases: Array<{ id: string; aliases: string[] }> = destinations.map((d) => ({
  id: d.id,
  aliases: [
    d.country.toLowerCase(),
    d.city.toLowerCase(),
    ...(resortsByDestination[d.id] ?? []).map((r) => r.name.toLowerCase()),
  ],
}));

const preferenceMap: Array<{ key: string; label: string; matches: string[] }> = [
  { key: "near_sea", label: "Рядом с морем", matches: ["море", "пляж", "берег", "первая линия"] },
  { key: "family_friendly", label: "Для семьи", matches: ["сем", "реб", "дет"] },
  {
    key: "infrastructure_nearby",
    label: "Инфраструктура рядом",
    matches: ["инфраструкт", "центр", "рядом"],
  },
  { key: "pool", label: "Бассейн", matches: ["бассейн"] },
  { key: "spa", label: "SPA", matches: ["spa", "спа"] },
  { key: "quiet_area", label: "Тихий район", matches: ["тихий", "спокой"] },
  { key: "yacht", label: "Яхта", matches: ["яхт", "marina", "марина"] },
  { key: "desert_safari", label: "Сафари", matches: ["сафари", "пустын"] },
  { key: "tickets", label: "Билеты", matches: ["burj", "бурдж", "билеты", "аквапарк"] },
  { key: "russian_support", label: "Русскоязычная поддержка", matches: ["русск", "снг"] },
];

const mealAliases = [
  { code: "AI", matches: ["all inclusive", "всё включено", "все включено", "олл"] },
  { code: "UAI", matches: ["ultra", "ультра"] },
  { code: "BB", matches: ["завтрак"] },
  { code: "HB", matches: ["полупансион"] },
  { code: "FB", matches: ["полный пансион"] },
];

const parseBudget = (query: string) => {
  const compact = query.toLowerCase().replace(/\s+/g, " ");
  const millionMatch = compact.match(
    /(?:до|бюджет|примерно|около)?\s*(\d+(?:[,.]\d+)?)\s*(?:млн|миллион)/,
  );
  if (millionMatch) return Math.round(Number(millionMatch[1]!.replace(",", ".")) * 1000000);

  const numericMatch = compact.match(
    /(?:до|бюджет|примерно|около)?\s*(\d[\d\s]{5,})\s*(?:₸|тг|тенге|kzt)?/,
  );
  if (numericMatch) return Number(numericMatch[1]!.replace(/\s/g, ""));

  return 1500000;
};

const parseAges = (query: string) =>
  Array.from(query.matchAll(/(\d{1,2})\s*(?:год|года|лет)/gi))
    .map((m) => Number(m[1]))
    .filter((age) => age >= 0 && age <= 17)
    .slice(0, 6);

const findDestination = (query: string) => {
  const normalized = query.toLowerCase();
  const hit = destinationAliases.find((d) => d.aliases.some((alias) => normalized.includes(alias)));
  if (!hit) return { destination: "dubai-beach", city: "JBR" };

  const destination = destinations.find((d) => d.id === hit.id)!;
  const resort = (resortsByDestination[hit.id] ?? []).find((r) =>
    normalized.includes(r.name.toLowerCase()),
  );
  return { destination: hit.id, city: resort?.name ?? destination.city };
};

export function parseTravelQuery(query: string): ParsedTravelQuery {
  const normalized = query.toLowerCase();
  const { destination, city } = findDestination(query);
  const childAges = parseAges(query);
  const children =
    childAges.length ||
    (/(двое|2)\s+(?:дет|реб)/.test(normalized)
      ? 2
      : /(один|1)\s+(?:реб|дет)/.test(normalized)
        ? 1
        : 0);
  const adults = /(?:жена|муж|супруг|супруга|двое взрослых|2 взрослых)/.test(normalized) ? 2 : 2;
  const durationMatch = normalized.match(/(\d{1,2})\s*(?:дней|дня|день|ноч|недел)/);
  const duration = durationMatch ? Number(durationMatch[1]) : /недел/.test(normalized) ? 7 : 7;
  const meals = mealAliases
    .filter((m) => m.matches.some((alias) => normalized.includes(alias)))
    .map((m) => m.code);
  const preferences = preferenceMap
    .filter((p) => p.matches.some((match) => normalized.includes(match)))
    .map((p) => p.key);

  return {
    originalQuery: query,
    origin: normalized.includes("ташкент")
      ? "Ташкент"
      : normalized.includes("бишкек")
        ? "Бишкек"
        : normalized.includes("моск")
          ? "Москва"
          : normalized.includes("петербург") || normalized.includes("спб")
            ? "Санкт-Петербург"
            : normalized.includes("астан")
              ? "Астана"
              : normalized.includes("шымкент")
                ? "Шымкент"
                : "Алматы",
    destination,
    city,
    adults,
    children,
    childAges: childAges.length ? childAges : Array.from({ length: children }, () => 7),
    duration,
    budgetMax: Math.min(PRICE_MAX, Math.max(PRICE_MIN, parseBudget(query))),
    currency: "KZT",
    meals: meals.length ? meals : [],
    preferences,
  };
}

export function parsedQueryToSearch(parsed: ParsedTravelQuery) {
  return toSearchLink({
    from: parsed.origin,
    destination: parsed.destination,
    city: parsed.city,
    adults: parsed.adults,
    children: parsed.children,
    childAges: parsed.childAges.slice(0, parsed.children),
    priceMin: PRICE_MIN,
    priceMax: parsed.budgetMax,
    meals: parsed.meals,
    nights: parsed.duration <= 7 ? ["4-7"] : parsed.duration <= 14 ? ["8-14"] : ["14+"],
    amenities: parsed.preferences.includes("near_sea") ? ["Beach"] : [],
    sort: "match",
  } satisfies Partial<SearchParams>);
}

export function buildAiChips(parsed: ParsedTravelQuery): AiChip[] {
  const destination = destinations.find((d) => d.id === parsed.destination);
  const mealLabels = parsed.meals.map(
    (code) => mealOptions.find((m) => m.code === code)?.label ?? code,
  );
  const preferenceLabels = parsed.preferences.map(
    (key) => preferenceMap.find((p) => p.key === key)?.label ?? key,
  );

  return [
    { key: "origin" as const, label: "Откуда", value: parsed.origin },
    {
      key: "destination" as const,
      label: "Куда",
      value: parsed.city || destination?.country || "",
    },
    { key: "adults" as const, label: "Взрослые", value: `${parsed.adults}` },
    { key: "children" as const, label: "Дети", value: `${parsed.children}` },
    ...parsed.childAges.slice(0, parsed.children).map((age, i) => ({
      key: "childAges" as const,
      label: `Ребёнок ${i + 1}`,
      value: `${age} лет`,
    })),
    { key: "duration" as const, label: "Длительность", value: `${parsed.duration} ночей` },
    {
      key: "budgetMax" as const,
      label: "Бюджет",
      value: `до ${new Intl.NumberFormat("ru-RU").format(parsed.budgetMax)} ₸`,
    },
    ...(mealLabels.length
      ? [{ key: "meals" as const, label: "Питание", value: mealLabels.join(", ") }]
      : []),
    ...(preferenceLabels.length
      ? [{ key: "preferences" as const, label: "Важно", value: preferenceLabels.join(", ") }]
      : []),
  ].filter((chip) => chip.value);
}

export function applyAiRefinement(parsed: ParsedTravelQuery, message: string): ParsedTravelQuery {
  const normalized = message.toLowerCase();
  return {
    ...parsed,
    budgetMax: /дешев/.test(normalized)
      ? Math.max(PRICE_MIN, Math.round(parsed.budgetMax * 0.85))
      : parsed.budgetMax,
    meals: /5\s*зв|пять зв/.test(normalized) ? parsed.meals : parsed.meals,
    duration: /2\s*(?:дня|дней|ночи|ночей)\s*(?:дольше|больше)/.test(normalized)
      ? parsed.duration + 2
      : parsed.duration,
    preferences: /центр/.test(normalized)
      ? Array.from(new Set([...parsed.preferences, "infrastructure_nearby"]))
      : parsed.preferences,
  };
}
