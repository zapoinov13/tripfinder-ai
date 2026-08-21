import hotel1 from "@/assets/hotel-1.jpg";
import hotel2 from "@/assets/hotel-2.jpg";
import hotel3 from "@/assets/hotel-3.jpg";
import hotel4 from "@/assets/hotel-4.jpg";

export type ExcursionCategory = "Экскурсии" | "Развлечения" | "Море" | "Трансферы";

export type Excursion = {
  id: string;
  title: string;
  destinationId: string;
  city: string;
  category: ExcursionCategory;
  duration: string;
  price: number;
  currency: "AED";
  image: string;
  summary: string;
  includes: string[];
  company: string;
};

const images = [hotel1, hotel2, hotel3, hotel4];
const img = (i: number) => images[i % images.length]!;

export const excursions: Excursion[] = [
  {
    id: "exc-safari",
    title: "Сафари в пустыне",
    destinationId: "uae",
    city: "Дубай",
    category: "Развлечения",
    duration: "6 часов",
    price: 250,
    currency: "AED",
    image: img(0),
    summary: "Катание по дюнам, фото на закате, ужин в бедуинском лагере и шоу.",
    includes: ["Забор из отеля", "Вода и снеки", "Ужин", "Русскоговорящий гид"],
    company: "Dubai Travel",
  },
  {
    id: "exc-yacht",
    title: "Прогулка на яхте",
    destinationId: "uae",
    city: "Дубай",
    category: "Море",
    duration: "3 часа",
    price: 1200,
    currency: "AED",
    image: img(1),
    summary: "Частная яхта вдоль Марины и Palm Jumeirah, до 10 человек.",
    includes: ["Капитан", "Напитки", "Полотенца", "Музыка"],
    company: "Marina Boats",
  },
  {
    id: "exc-burj",
    title: "Бурдж-Халифа",
    destinationId: "uae",
    city: "Дубай",
    category: "Экскурсии",
    duration: "2 часа",
    price: 220,
    currency: "AED",
    image: img(2),
    summary: "Смотровые площадки 124 и 125 этажа, вход без очереди.",
    includes: ["Билет", "Проход без очереди", "Сопровождение"],
    company: "Dubai Travel",
  },
  {
    id: "exc-abudhabi",
    title: "Поездка в Абу-Даби",
    destinationId: "uae",
    city: "Абу-Даби",
    category: "Экскурсии",
    duration: "10 часов",
    price: 320,
    currency: "AED",
    image: img(3),
    summary: "Мечеть шейха Зайда, Etihad Towers, набережная Корниш.",
    includes: ["Транспорт", "Гид", "Вода", "Входные билеты"],
    company: "Family Travel",
  },
  {
    id: "exc-ferrari",
    title: "Ferrari World",
    destinationId: "uae",
    city: "Абу-Даби",
    category: "Развлечения",
    duration: "весь день",
    price: 345,
    currency: "AED",
    image: img(1),
    summary: "Парк развлечений с самыми быстрыми аттракционами мира.",
    includes: ["Билет на весь день", "Трансфер по запросу"],
    company: "Family Travel",
  },
  {
    id: "exc-city",
    title: "Обзорная экскурсия по Дубаю",
    destinationId: "uae",
    city: "Дубай",
    category: "Экскурсии",
    duration: "5 часов",
    price: 180,
    currency: "AED",
    image: img(0),
    summary: "Старый город, рынок специй, Дубай-Марина и кадр у Бурдж-Аль-Араб.",
    includes: ["Транспорт", "Гид", "Катание на абре"],
    company: "Dubai Travel",
  },
  {
    id: "exc-transfer",
    title: "Трансфер из аэропорта",
    destinationId: "uae",
    city: "Дубай",
    category: "Трансферы",
    duration: "по прилёту",
    price: 120,
    currency: "AED",
    image: img(3),
    summary: "Встреча с табличкой, помощь с багажом, детское кресло по запросу.",
    includes: ["Встреча в зале прилёта", "Ожидание 60 минут", "Вода"],
    company: "Dubai Travel",
  },
  {
    id: "exc-atlantis",
    title: "Аквапарк Atlantis Aquaventure",
    destinationId: "uae",
    city: "Дубай",
    category: "Развлечения",
    duration: "весь день",
    price: 300,
    currency: "AED",
    image: img(2),
    summary: "Горки, ленивая река и аквариум «Затерянные миры».",
    includes: ["Билет", "Шкафчик", "Трансфер по запросу"],
    company: "Marina Boats",
  },
];

export const excursionCategories: ExcursionCategory[] = [
  "Экскурсии",
  "Развлечения",
  "Море",
  "Трансферы",
];

export const formatAed = (value: number) => `${value.toLocaleString("ru-RU")} AED`;
