import { destinations, mealOptions, resortsByDestination } from "@/data/demo";
import {
  PRICE_MAX,
  PRICE_MIN,
  resolveDestinationId,
  type SearchParams,
  toSearchLink,
} from "@/lib/search";

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

/** Дополнительные синонимы для голосового и свободного ввода. */
const extraDestinationAliases: Record<string, string[]> = {
  uae: [
    "дубай",
    "dubai",
    "оаэ",
    "uae",
    "эмират",
    "абу даби",
    "abu dhabi",
    "jbr",
    "marina",
    "марина",
    "шарджа",
    "фуджейра",
  ],
  turkey: ["турци", "turkey", "antalya", "антalya", "алания", "белек", "кемер"],
  thailand: ["тайланд", "thailand", "пхукет", "phuket", "паттайя", "samui", "самуи"],
  egypt: ["египет", "egypt", "хургада", "hurghada", "шарм", "sharm"],
  maldives: ["мальдив", "maldives", "атолл"],
  vietnam: ["вьетнам", "vietnam", "нячанг", "nha trang", "фукуок"],
  georgia: ["грузи", "georgia", "батumi", "тбилиси"],
  qatar: ["кatar", "катар", "doha", "доха"],
  srilanka: ["шри-ланка", "шри ланка", "srilanka", "цейлон"],
  indonesia: ["бали", "bali", "индонез", "indonesia"],
};

const destinationAliases: Array<{ id: string; aliases: string[] }> = destinations.map((d) => ({
  id: d.id,
  aliases: [
    d.country.toLowerCase(),
    d.city.toLowerCase(),
    ...(resortsByDestination[d.id] ?? []).map((r) => r.name.toLowerCase()),
    ...(extraDestinationAliases[d.id] ?? []),
  ],
}));

const preferenceMap: Array<{ key: string; label: string; matches: string[] }> = [
  { key: "near_sea", label: "Рядом с морем", matches: ["море", "пляж", "берег", "первая линия", "у воды"] },
  { key: "family_friendly", label: "Для семьи", matches: ["сем", "реб", "дет", "kids"] },
  {
    key: "infrastructure_nearby",
    label: "Инфраструктура рядом",
    matches: ["инфраструкт", "центр", "рядом", "wifi", "wi-fi"],
  },
  { key: "pool", label: "Бассейн", matches: ["бассейн", "pool"] },
  { key: "spa", label: "SPA", matches: ["spa", "спа"] },
  { key: "quiet_area", label: "Тихий район", matches: ["тихий", "спокой", "без шума"] },
  { key: "yacht", label: "Яхта", matches: ["яхт", "marina", "марина"] },
  { key: "desert_safari", label: "Сафари", matches: ["сафари", "пустын"] },
  { key: "tickets", label: "Билеты", matches: ["burj", "бурдж", "билеты", "аквапарк"] },
  { key: "russian_support", label: "Русскоязычная поддержка", matches: ["русск", "снг"] },
  { key: "transfer", label: "Трансфер", matches: ["трансфер", "transfer"] },
  { key: "premium", label: "Премиум", matches: ["премиум", "premium", "люкс", "luxury", "5 зв", "пять зв"] },
  { key: "hot", label: "Горящие", matches: ["горящ", "last minute", "скидк"] },
];

const preferenceToAmenities: Record<string, string[]> = {
  near_sea: ["Beach"],
  pool: ["Pool"],
  spa: ["Spa"],
  family_friendly: ["Kids Club"],
  infrastructure_nearby: ["Wi-Fi"],
  transfer: ["Transfer"],
};

const preferenceToOffers: Record<string, string[]> = {
  premium: ["premium"],
  hot: ["hot"],
};

const mealAliases = [
  { code: "AI", matches: ["all inclusive", "всё включено", "все включено", "олл", "all inclusive"] },
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
  if (!hit) return { destination: "", city: "" };

  const destination = destinations.find((d) => d.id === hit.id)!;
  const resort = (resortsByDestination[hit.id] ?? []).find((r) =>
    normalized.includes(r.name.toLowerCase()),
  );
  return { destination: hit.id, city: resort?.name ?? "" };
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
    originalQuery: query.trim(),
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
                : normalized.includes("акtau") || normalized.includes("актау")
                  ? "Актау"
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

export function preferencesToFilters(preferences: string[]) {
  const amenities = new Set<string>();
  const offers = new Set<string>();
  const stars: number[] = [];

  for (const pref of preferences) {
    for (const amenity of preferenceToAmenities[pref] ?? []) amenities.add(amenity);
    for (const offer of preferenceToOffers[pref] ?? []) offers.add(offer);
    if (pref === "premium") stars.push(5);
  }

  return {
    amenities: Array.from(amenities),
    offers: Array.from(offers),
    stars,
  };
}

export function parsedQueryToSearch(parsed: ParsedTravelQuery) {
  const { amenities, offers, stars } = preferencesToFilters(parsed.preferences);

  return toSearchLink({
    q: parsed.originalQuery,
    from: parsed.origin,
    destination: resolveDestinationId(parsed.destination),
    city: parsed.city,
    adults: parsed.adults,
    children: parsed.children,
    childAges: parsed.childAges.slice(0, parsed.children),
    priceMin: PRICE_MIN,
    priceMax: parsed.budgetMax,
    meals: parsed.meals,
    nights:
      parsed.duration <= 3
        ? ["1-3"]
        : parsed.duration <= 7
          ? ["4-7"]
          : parsed.duration <= 14
            ? ["8-14"]
            : ["14+"],
    amenities,
    offers,
    stars,
    sort: "match",
  } satisfies Partial<SearchParams>);
}

export function mergeParsedIntoSearchParams(
  current: SearchParams,
  parsed: ParsedTravelQuery,
): Partial<SearchParams> {
  const pref = preferencesToFilters(parsed.preferences);
  const nights =
    parsed.duration <= 3
      ? ["1-3"]
      : parsed.duration <= 7
        ? ["4-7"]
        : parsed.duration <= 14
          ? ["8-14"]
          : ["14+"];

  return {
    q: parsed.originalQuery || current.q,
    from: parsed.origin || current.from,
    destination: parsed.destination
      ? resolveDestinationId(parsed.destination)
      : current.destination,
    city: parsed.city || current.city,
    adults: parsed.adults || current.adults,
    children: parsed.children ?? current.children,
    childAges: parsed.childAges.slice(0, parsed.children),
    priceMax: Math.min(current.priceMax, parsed.budgetMax),
    meals: parsed.meals.length ? parsed.meals : current.meals,
    nights: parsed.duration ? nights : current.nights,
    amenities: Array.from(new Set([...current.amenities, ...pref.amenities])),
    offers: Array.from(new Set([...current.offers, ...pref.offers])),
    stars: pref.stars.length
      ? Array.from(new Set([...current.stars, ...pref.stars]))
      : current.stars,
    sort: "match",
  };
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
  const extraPrefs = preferenceMap
    .filter((p) => p.matches.some((match) => normalized.includes(match)))
    .map((p) => p.key);

  return {
    ...parsed,
    originalQuery: `${parsed.originalQuery} ${message}`.trim(),
    budgetMax: /дешев/.test(normalized)
      ? Math.max(PRICE_MIN, Math.round(parsed.budgetMax * 0.85))
      : parsed.budgetMax,
    duration: /2\s*(?:дня|дней|ночи|ночей)\s*(?:дольше|больше)/.test(normalized)
      ? parsed.duration + 2
      : parsed.duration,
    preferences: Array.from(new Set([...parsed.preferences, ...extraPrefs])),
  };
}
