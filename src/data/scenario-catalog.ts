import { destinations } from "@/data/demo";

export const stayKinds = [
  { id: "hotel", label: "Отели" },
  { id: "apartment", label: "Апартаменты" },
  { id: "flat", label: "Квартиры" },
  { id: "villa", label: "Виллы" },
  { id: "house", label: "Дома" },
] as const;

export const stayAreas: Record<string, string[]> = {
  uae: ["Dubai Marina", "Palm Jumeirah", "Downtown", "JBR", "Business Bay"],
  turkey: ["Султанахмет", "Таксим", "Белек", "Кемер"],
  thailand: ["Патонг", "Камала", "Бангкок Силом", "Самуи"],
  indonesia: ["Кута", "Семиньяк", "Убуд"],
  georgia: ["Старый Батуми", "Ваке", "Гудаури"],
};

export const stays: {
  id: string;
  name: string;
  city: string;
  destinationId: string;
  area: string;
  kind: string;
  price: number;
  rating: number;
  nightsHint: string;
}[] = [];

export const carClasses = [
  { id: "eco", label: "Эконом" },
  { id: "comfort", label: "Комфорт" },
  { id: "suv", label: "SUV" },
  { id: "cabrio", label: "Кабриолет" },
  { id: "premium", label: "Премиум" },
  { id: "sport", label: "Спорткар" },
  { id: "minivan", label: "Минивэн" },
] as const;

export const cars: {
  id: string;
  name: string;
  city: string;
  destinationId: string;
  klass: string;
  price: number;
  seats: number;
  gearbox: string;
  deposit: string;
}[] = [];

export const sportKinds = [
  { id: "gym", label: "Тренажёрные залы", emoji: "🏋️" },
  { id: "yoga", label: "Йога", emoji: "🧘" },
  { id: "tennis", label: "Теннис", emoji: "🎾" },
  { id: "padel", label: "Падел", emoji: "🏓" },
  { id: "box", label: "Бокс", emoji: "🥊" },
  { id: "pool", label: "Бассейны", emoji: "🏊" },
  { id: "golf", label: "Гольф", emoji: "⛳" },
  { id: "surf", label: "Серфинг", emoji: "🏄" },
  { id: "dive", label: "Дайвинг", emoji: "🤿" },
  { id: "coach", label: "Персональный тренер", emoji: "👤" },
] as const;

export const sports: {
  id: string;
  name: string;
  city: string;
  destinationId: string;
  kind: string;
  price: number;
  area: string;
  slot: string;
}[] = [];

export const popularStayCities = [
  { name: "Dubai", city: "Дубай", destinationId: "uae" },
  { name: "Istanbul", city: "Стамбул", destinationId: "turkey" },
  { name: "Phuket", city: "Пхукет", destinationId: "thailand" },
  { name: "Bali", city: "Бали", destinationId: "indonesia" },
  { name: "Bangkok", city: "Бангкок", destinationId: "thailand" },
  { name: "Tbilisi", city: "Тбилиси", destinationId: "georgia" },
];

export const popularCarCountries = destinations.filter((d) =>
  ["uae", "turkey", "thailand", "georgia", "indonesia"].includes(d.id),
);

export function formatKzt(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₸";
}
