import { destinations, resortsByDestination } from "@/data/demo";
import { carClasses, sportKinds } from "@/data/scenario-catalog";
import { travelScenarios, type TravelScenarioId } from "@/data/scenarios";
import { normalizeSearchText, wordKey } from "@/lib/search-text";

/**
 * Запрос и признаки — в одном виде: латиница без окончаний.
 *
 * Раньше здесь сравнивались сырые подстроки, и разбор понимал только кириллицу
 * в точной форме. «Otel v dubae» не попадал ни в раздел, ни в направление —
 * фраза уходила в общий поиск как есть, хотя рядом, в поиске по каталогу, та же
 * машинерия ключей давно работает. Приводим обе стороны к её ключам: «отель»,
 * «otel» и «экскурсии» с любым окончанием сходятся сами.
 */
function keyOf(text: string): string {
  return normalizeSearchText(text).split(" ").filter(Boolean).map(wordKey).join(" ");
}

/** Проверка «встречается ли хоть один признак» по ключам, а не по буквам. */
function matcher(query: string): (...tokens: string[]) => boolean {
  const hay = keyOf(query);
  return (...tokens) => tokens.some((token) => hay.includes(keyOf(token)));
}

export type ScenarioRoute = {
  to: (typeof travelScenarios)[number]["to"];
  search?: Record<string, string>;
};

const placeAliases: Array<{ destination: string; city?: string; tokens: string[] }> = [
  { destination: "uae", city: "Дубай", tokens: ["дуба", "dubai"] },
  { destination: "uae", city: "Абу-Даби", tokens: ["абу-даби", "абу даби", "abu dhabi"] },
  { destination: "uae", city: "Шарджа", tokens: ["шардж", "sharjah"] },
  { destination: "uae", tokens: ["оаэ", "uae", "эмират"] },
  { destination: "turkey", city: "Анталия", tokens: ["антали", "antalya"] },
  { destination: "turkey", city: "Стамбул", tokens: ["стамбул", "istanbul"] },
  { destination: "turkey", tokens: ["турци", "turkey"] },
  { destination: "thailand", city: "Пхукет", tokens: ["пхукет", "phuket"] },
  { destination: "thailand", city: "Бангкок", tokens: ["бангкок", "bangkok"] },
  { destination: "thailand", tokens: ["таиланд", "тайланд", "thailand"] },
  { destination: "indonesia", city: "Бали", tokens: ["бали", "bali"] },
  { destination: "georgia", city: "Тбилиси", tokens: ["тбилиси", "tbilisi"] },
  { destination: "georgia", city: "Батуми", tokens: ["батуми", "batumi"] },
  { destination: "georgia", tokens: ["груз", "georgia"] },
  { destination: "maldives", tokens: ["мальдив", "maldives"] },
  { destination: "vietnam", tokens: ["вьетнам", "vietnam"] },
  { destination: "egypt", tokens: ["египт", "египет", "egypt"] },
];

export function placeFromQuery(query: string): { destination?: string; city?: string } {
  const has = matcher(query);
  for (const alias of placeAliases) {
    if (has(...alias.tokens)) {
      return { destination: alias.destination, ...(alias.city ? { city: alias.city } : {}) };
    }
  }
  for (const dest of destinations) {
    for (const resort of resortsByDestination[dest.id] ?? []) {
      if (has(resort.name)) {
        return { destination: dest.id, city: resort.name };
      }
    }
    if (has(dest.country, dest.city)) {
      return { destination: dest.id, city: dest.city };
    }
  }
  return {};
}

function pickKind(query: string, items: ReadonlyArray<{ id: string; label: string }>) {
  const has = matcher(query);
  return items.find((item) => has(item.id, item.label))?.id;
}

function detectScenario(query: string): TravelScenarioId {
  const has = matcher(query);
  const withDriver = has("водител") && !has("без водителя");
  if (withDriver || has("гид", "фотограф", "помощь")) return "help";
  if (has("аренд", "прокат", "машин", "авто", "suv", "кабриолет", "rent a car")) {
    return "cars";
  }
  if (
    sportKinds.some((item) => has(item.id, item.label)) ||
    has("спорт", "фитнес", "тренаж", "зал")
  ) {
    return "sport";
  }
  if (has("экскур", "сафари", "яхт", "билет", "аквапарк", "обзорн", "burj", "бурдж")) {
    return "excursions";
  }
  if (has("жиль", "отель", "квартир", "апартамент", "вилл", "hotel", "apartment")) {
    return "stays";
  }
  return "tours";
}

export function routeTravelIntent(query: string): ScenarioRoute {
  const scenario = detectScenario(query);
  const item = travelScenarios.find((row) => row.id === scenario) ?? travelScenarios[0]!;
  const place = placeFromQuery(query);
  const search: Record<string, string> = {};
  if (place.destination) search["destination"] = place.destination;
  if (place.city) search["city"] = place.city;

  if (item.id === "help") {
    search["wish"] = query;
    return { to: item.to, search };
  }
  search["q"] = query;
  if (item.id === "sport") {
    const kind = pickKind(query, sportKinds);
    if (kind) search["kind"] = kind;
  }
  if (item.id === "stays") {
    const has = matcher(query);
    if (has("апартамент", "apartment")) search["kind"] = "apartment";
    else if (has("квартир")) search["kind"] = "flat";
    else if (has("вилл", "villa")) search["kind"] = "villa";
    else if (has("дом", "house")) search["kind"] = "house";
    else if (has("отел", "hotel")) search["kind"] = "hotel";
  }
  if (item.id === "cars") {
    const klass = pickKind(
      query,
      carClasses.map((row) => ({ id: row.id, label: row.label })),
    );
    if (klass) search["klass"] = klass;
  }
  return { to: item.to, search };
}
