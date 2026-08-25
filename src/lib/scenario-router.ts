import { destinations, resortsByDestination } from "@/data/demo";
import { carClasses, sportKinds } from "@/data/scenario-catalog";
import { travelScenarios, type TravelScenarioId } from "@/data/scenarios";

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
  const n = query.toLowerCase();
  for (const alias of placeAliases) {
    if (alias.tokens.some((token) => n.includes(token))) {
      return { destination: alias.destination, ...(alias.city ? { city: alias.city } : {}) };
    }
  }
  for (const dest of destinations) {
    for (const resort of resortsByDestination[dest.id] ?? []) {
      if (n.includes(resort.name.toLowerCase())) {
        return { destination: dest.id, city: resort.name };
      }
    }
    if (n.includes(dest.country.toLowerCase()) || n.includes(dest.city.toLowerCase())) {
      return { destination: dest.id, city: dest.city };
    }
  }
  return {};
}

function pickKind(query: string, items: ReadonlyArray<{ id: string; label: string }>) {
  const n = query.toLowerCase();
  return items.find((item) => n.includes(item.id) || n.includes(item.label.toLowerCase()))?.id;
}

function detectScenario(query: string): TravelScenarioId {
  const n = query.toLowerCase();
  const withDriver = n.includes("водител") && !n.includes("без водителя");
  if (withDriver || n.includes("гид") || n.includes("фотограф") || n.includes("помощь"))
    return "help";
  if (
    n.includes("аренд") ||
    n.includes("прокат") ||
    n.includes("машин") ||
    n.includes("авто") ||
    n.includes("suv") ||
    n.includes("кабриолет") ||
    n.includes("rent a car")
  ) {
    return "cars";
  }
  if (
    sportKinds.some((item) => n.includes(item.id) || n.includes(item.label.toLowerCase())) ||
    n.includes("спорт") ||
    n.includes("фитнес") ||
    n.includes("тренаж") ||
    n.includes("зал")
  ) {
    return "sport";
  }
  if (
    n.includes("экскур") ||
    n.includes("сафари") ||
    n.includes("яхт") ||
    n.includes("билет") ||
    n.includes("аквапарк") ||
    n.includes("обзорн") ||
    n.includes("burj") ||
    n.includes("бурдж")
  ) {
    return "excursions";
  }
  if (
    n.includes("жиль") ||
    n.includes("отель") ||
    n.includes("квартир") ||
    n.includes("апартамент") ||
    n.includes("вилл") ||
    n.includes("hotel") ||
    n.includes("apartment")
  ) {
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
    const q = query.toLowerCase();
    if (q.includes("апартамент") || q.includes("apartment")) search["kind"] = "apartment";
    else if (q.includes("квартир")) search["kind"] = "flat";
    else if (q.includes("вилл") || q.includes("villa")) search["kind"] = "villa";
    else if (q.includes("дом") || q.includes("house")) search["kind"] = "house";
    else if (q.includes("отел") || q.includes("hotel")) search["kind"] = "hotel";
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
