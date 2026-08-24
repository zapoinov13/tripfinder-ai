import { travelScenarios, type TravelScenarioId } from "@/data/scenarios";

export type ScenarioRoute = {
  to: (typeof travelScenarios)[number]["to"];
  search?: Record<string, string>;
};

const rules: Array<{ scenario: TravelScenarioId; matches: string[] }> = [
  {
    scenario: "cars",
    matches: ["аренд", "машин", "авто", "car", "suv", "кабриолет", "rent a car", "прокат"],
  },
  {
    scenario: "sport",
    matches: [
      "спорт",
      "зал",
      "тренаж",
      "йог",
      "теннис",
      "падел",
      "padel",
      "бокс",
      "гольф",
      "серф",
      "дайв",
      "тренер",
      "фитнес",
      "бассейн",
    ],
  },
  {
    scenario: "excursions",
    matches: ["экскур", "сафари", "яхт", "билет", "аквапарк", "парк", "обзорн", "burj", "бурдж"],
  },
  {
    scenario: "stays",
    matches: ["жиль", "отель", "квартир", "апартамент", "вилл", "stay", "hotel", "apartment"],
  },
  {
    scenario: "help",
    matches: ["водитель", "гид", "фотограф", "трансфер", "помощь", "завтра", "нужен", "нужна", "хотим заказать"],
  },
];

function toRoute(id: TravelScenarioId, query: string): ScenarioRoute {
  const item = travelScenarios.find((scenario) => scenario.id === id) ?? travelScenarios[0]!;
  if (item.id === "help") return { to: item.to, search: { wish: query } };
  return { to: item.to, search: { q: query } };
}

export function routeTravelIntent(query: string): ScenarioRoute {
  const normalized = query.toLowerCase();
  const hit = rules.find((rule) => rule.matches.some((token) => normalized.includes(token)));
  return toRoute(hit?.scenario ?? "tours", query);
}
