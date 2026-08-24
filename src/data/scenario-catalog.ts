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

export const stays = [
  {
    id: "stay-1",
    name: "Rixos Premium Dubai JBR",
    city: "Дубай",
    destinationId: "uae",
    area: "JBR",
    kind: "hotel",
    price: 89000,
    rating: 9.4,
    nightsHint: "за ночь",
  },
  {
    id: "stay-2",
    name: "Marina Gate Apartments",
    city: "Дубай",
    destinationId: "uae",
    area: "Dubai Marina",
    kind: "apartment",
    price: 54000,
    rating: 8.9,
    nightsHint: "за ночь",
  },
  {
    id: "stay-3",
    name: "Palm Villa 4BR",
    city: "Дубай",
    destinationId: "uae",
    area: "Palm Jumeirah",
    kind: "villa",
    price: 210000,
    rating: 9.1,
    nightsHint: "за ночь",
  },
  {
    id: "stay-4",
    name: "Address Downtown",
    city: "Дубай",
    destinationId: "uae",
    area: "Downtown",
    kind: "hotel",
    price: 76000,
    rating: 9.2,
    nightsHint: "за ночь",
  },
  {
    id: "stay-5",
    name: "Phuket Beach Villa",
    city: "Пхукет",
    destinationId: "thailand",
    area: "Камала",
    kind: "villa",
    price: 48000,
    rating: 8.8,
    nightsHint: "за ночь",
  },
  {
    id: "stay-6",
    name: "Seminyak House",
    city: "Бали",
    destinationId: "indonesia",
    area: "Семиньяк",
    kind: "house",
    price: 36000,
    rating: 8.7,
    nightsHint: "за ночь",
  },
];

export const carClasses = [
  { id: "eco", label: "Эконом" },
  { id: "comfort", label: "Комфорт" },
  { id: "suv", label: "SUV" },
  { id: "cabrio", label: "Кабриолет" },
  { id: "premium", label: "Премиум" },
  { id: "sport", label: "Спорткар" },
  { id: "minivan", label: "Минивэн" },
] as const;

export const cars = [
  {
    id: "car-1",
    name: "Toyota Yaris",
    city: "Дубай",
    destinationId: "uae",
    klass: "eco",
    price: 18000,
    seats: 5,
    gearbox: "автомат",
    deposit: "с депозитом",
  },
  {
    id: "car-2",
    name: "Nissan Patrol",
    city: "Дубай",
    destinationId: "uae",
    klass: "suv",
    price: 42000,
    seats: 7,
    gearbox: "автомат",
    deposit: "с депозитом",
  },
  {
    id: "car-3",
    name: "Mercedes C-Class Cabrio",
    city: "Дубай",
    destinationId: "uae",
    klass: "cabrio",
    price: 68000,
    seats: 4,
    gearbox: "автомат",
    deposit: "с депозитом",
  },
  {
    id: "car-4",
    name: "BMW 5 Series",
    city: "Абу-Даби",
    destinationId: "uae",
    klass: "premium",
    price: 59000,
    seats: 5,
    gearbox: "автомат",
    deposit: "без депозита",
  },
  {
    id: "car-5",
    name: "Hyundai Staria",
    city: "Анталия",
    destinationId: "turkey",
    klass: "minivan",
    price: 31000,
    seats: 8,
    gearbox: "автомат",
    deposit: "с депозитом",
  },
];

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
