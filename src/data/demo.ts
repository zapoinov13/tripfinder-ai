import heroImg from "@/assets/hero.jpg";
import destTurkey from "@/assets/dest-turkey.jpg";
import destUae from "@/assets/dest-uae.jpg";
import destThailand from "@/assets/dest-thailand.jpg";
import destEgypt from "@/assets/dest-egypt.jpg";
import destVietnam from "@/assets/dest-vietnam.jpg";
import destMaldives from "@/assets/dest-maldives.jpg";
import hotel1 from "@/assets/hotel-1.jpg";
import hotel2 from "@/assets/hotel-2.jpg";
import hotel3 from "@/assets/hotel-3.jpg";
import hotel4 from "@/assets/hotel-4.jpg";

export const heroImage = heroImg;
export const galleryImages = [hotel1, hotel2, hotel3, hotel4];

export type Destination = {
  id: string;
  country: string;
  city: string;
  flag: string;
  blurb: string;
  tours: number;
  image: string;
};

export type Resort = {
  name: string;
  blurb: string;
  tours: number;
};

export const resortsByDestination: Record<string, Resort[]> = {
  turkey: [
    { name: "Анталия", blurb: "Центр курортной жизни и старый город", tours: 412 },
    { name: "Алания", blurb: "Доступные отели и длинные пляжи", tours: 268 },
    { name: "Белек", blurb: "Люкс-отели, гольф и хвойные леса", tours: 194 },
    { name: "Кемер", blurb: "Горы у моря и галечные бухты", tours: 157 },
    { name: "Сиде", blurb: "Античные руины и песчаные пляжи", tours: 128 },
    { name: "Мармарис", blurb: "Яхты, бухты и ночная жизнь", tours: 76 },
    { name: "Бодрум", blurb: "Бутик-отели и эгейский стиль", tours: 49 },
  ],
  uae: [
    { name: "Дубай", blurb: "Городской люкс и пляжные резорты", tours: 486 },
    { name: "Абу-Даби", blurb: "Культура, парки и спокойные пляжи", tours: 178 },
    { name: "Шарджа", blurb: "Бюджетные отели рядом с Дубаем", tours: 121 },
    { name: "Рас-эль-Хайма", blurb: "Горы Джебель-Джайс и тихое море", tours: 97 },
    { name: "Фуджейра", blurb: "Индийский океан и дайвинг", tours: 60 },
  ],
  thailand: [
    { name: "Пхукет", blurb: "Главный островной курорт страны", tours: 342 },
    { name: "Паттайя", blurb: "Развлечения и близость к Бангкоку", tours: 201 },
    { name: "Краби", blurb: "Скалы, лагуны и спокойный отдых", tours: 118 },
    { name: "Самуи", blurb: "Пальмы, спа и бутик-виллы", tours: 102 },
  ],
  egypt: [
    { name: "Хургада", blurb: "Классика Красного моря", tours: 289 },
    { name: "Шарм-эль-Шейх", blurb: "Лучшие рифы и дайвинг", tours: 214 },
    { name: "Марса-Алам", blurb: "Тихие резорты и черепахи", tours: 88 },
    { name: "Эль-Гуна", blurb: "Каналы, лагуны и сёрфинг", tours: 60 },
  ],
  vietnam: [
    { name: "Нячанг", blurb: "Городской пляж и острова", tours: 186 },
    { name: "Фукуок", blurb: "Белый песок и новые резорты", tours: 132 },
    { name: "Дананг", blurb: "Мосты, горы и длинный пляж", tours: 100 },
  ],
  maldives: [
    { name: "Северный Мале Атолл", blurb: "Быстрый трансфер на катере", tours: 124 },
    { name: "Баа Атолл", blurb: "Биосферный заповедник и манты", tours: 87 },
    { name: "Ари Атолл", blurb: "Дайвинг с китовыми акулами", tours: 76 },
  ],
  georgia: [
    { name: "Батуми", blurb: "Море, набережная и казино", tours: 168 },
    { name: "Тбилиси", blurb: "Гастрономия и серные бани", tours: 94 },
    { name: "Гудаури", blurb: "Горы и активный отдых", tours: 50 },
  ],
  qatar: [
    { name: "Доха", blurb: "Новые отели и музеи", tours: 112 },
    { name: "Аль-Хор", blurb: "Тихие пляжи у залива", tours: 52 },
  ],
  srilanka: [
    { name: "Бентота", blurb: "Пляжи и аюрведа", tours: 96 },
    { name: "Хиккадува", blurb: "Кораллы и сёрфинг", tours: 62 },
    { name: "Ахунгалла", blurb: "Тихие резорты у океана", tours: 50 },
  ],
  indonesia: [
    { name: "Кута", blurb: "Сёрф-школы и ночная жизнь", tours: 142 },
    { name: "Семиньяк", blurb: "Дизайнерские виллы и рестораны", tours: 116 },
    { name: "Убуд", blurb: "Джунгли, рисовые террасы и йога", tours: 98 },
  ],
};

export const destinations: Destination[] = [
  {
    id: "turkey",
    country: "Турция",
    city: "Анталия",
    flag: "🇹🇷",
    blurb: "Пляжи, all inclusive и короткий перелёт",
    tours: 1284,
    image: destTurkey,
  },
  {
    id: "uae",
    country: "ОАЭ",
    city: "Дубай",
    flag: "🇦🇪",
    blurb: "Городской люкс и пляжные резорты",
    tours: 942,
    image: destUae,
  },
  {
    id: "thailand",
    country: "Таиланд",
    city: "Пхукет",
    flag: "🇹🇭",
    blurb: "Тропики, острова и спа",
    tours: 763,
    image: destThailand,
  },
  {
    id: "egypt",
    country: "Египет",
    city: "Хургада",
    flag: "🇪🇬",
    blurb: "Красное море и лучший дайвинг",
    tours: 651,
    image: destEgypt,
  },
  {
    id: "vietnam",
    country: "Вьетнам",
    city: "Нячанг",
    flag: "🇻🇳",
    blurb: "Океан, кухня и природа",
    tours: 418,
    image: destVietnam,
  },
  {
    id: "maldives",
    country: "Мальдивы",
    city: "Мале",
    flag: "🇲🇻",
    blurb: "Виллы над водой и приватность",
    tours: 287,
    image: destMaldives,
  },
  {
    id: "georgia",
    country: "Грузия",
    city: "Батуми",
    flag: "🇬🇪",
    blurb: "Море, горы и гастрономия",
    tours: 312,
    image: destTurkey,
  },
  {
    id: "qatar",
    country: "Катар",
    city: "Доха",
    flag: "🇶🇦",
    blurb: "Новые отели и короткие поездки",
    tours: 164,
    image: destUae,
  },
  {
    id: "srilanka",
    country: "Шри-Ланка",
    city: "Бентота",
    flag: "🇱🇰",
    blurb: "Океан, чай и аюрведа",
    tours: 208,
    image: destThailand,
  },
  {
    id: "indonesia",
    country: "Индонезия",
    city: "Бали",
    flag: "🇮🇩",
    blurb: "Серф, джунгли и виллы",
    tours: 356,
    image: destVietnam,
  },
];

export type Operator = {
  id: string;
  name: string;
  rating: number;
  tours: number;
};

export const operators: Operator[] = [
  { id: "op-1", name: "Travel Company", rating: 4.8, tours: 1284 },
  { id: "op-2", name: "Sunrise Tours", rating: 4.6, tours: 864 },
  { id: "op-3", name: "Blue Horizon", rating: 4.7, tours: 612 },
  { id: "op-4", name: "Nomad Travel", rating: 4.5, tours: 438 },
  { id: "op-5", name: "Silk Road Voyage", rating: 4.4, tours: 297 },
];

export type Hotel = {
  id: string;
  name: string;
  destinationId: string;
  city: string;
  country: string;
  flag: string;
  stars: number;
  rating: number;
  reviews: number;
  district: string;
  beachLine: 1 | 2 | 3;
  distanceToSea: number;
  amenities: string[];
  image: string;
};

/** Canonical amenity keys used by filters. */
export const AMENITIES = ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"] as const;
export type Amenity = (typeof AMENITIES)[number];

export const amenityLabels: Record<string, string> = {
  Beach: "Пляж",
  Pool: "Бассейн",
  "Kids Club": "Детский клуб",
  Spa: "Spa",
  "Wi-Fi": "Wi-Fi",
  Transfer: "Трансфер",
};

// name, destinationId, city (курорт), stars, rating, district, beachLine, metres to sea, amenities
const hotelSeed: Array<
  [string, string, string, number, number, string, 1 | 2 | 3, number, Amenity[]]
> = [
  ["Rixos Premium Dubai", "uae", "Дубай", 5, 9.4, "Jumeirah Beach", 1, 50, ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"]],
  ["Atlantis The Palm", "uae", "Дубай", 5, 9.6, "Palm Jumeirah", 1, 80, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"]],
  ["Address Beach Resort", "uae", "Дубай", 5, 9.2, "JBR", 1, 120, ["Beach", "Pool", "Spa", "Wi-Fi"]],
  ["Centro Barsha", "uae", "Дубай", 3, 7.9, "Al Barsha", 3, 4200, ["Pool", "Wi-Fi"]],
  ["Bab Al Qasr", "uae", "Абу-Даби", 5, 9.1, "Corniche", 1, 60, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"]],
  ["Maxx Royal Belek", "turkey", "Белек", 5, 9.5, "Белек", 1, 60, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"]],
  ["Titanic Deluxe Lara", "turkey", "Анталия", 5, 9.1, "Лара", 1, 100, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"]],
  ["Delphin Imperial", "turkey", "Анталия", 5, 8.9, "Лара", 1, 150, ["Beach", "Pool", "Kids Club", "Wi-Fi", "Transfer"]],
  ["Sherwood Exclusive", "turkey", "Кемер", 4, 8.4, "Кемер", 2, 300, ["Beach", "Pool", "Wi-Fi", "Transfer"]],
  ["Grand Alanya Hotel", "turkey", "Алания", 3, 7.6, "Махмутлар", 2, 450, ["Pool", "Wi-Fi"]],
  ["Katathani Phuket Beach", "thailand", "Пхукет", 5, 9.3, "Ката Ной", 1, 40, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"]],
  ["Amari Phuket", "thailand", "Пхукет", 4, 8.7, "Патонг", 2, 250, ["Beach", "Pool", "Spa", "Wi-Fi"]],
  ["Banyan Tree Krabi", "thailand", "Краби", 5, 9.5, "Краби", 1, 70, ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"]],
  ["Steigenberger Aldau", "egypt", "Хургада", 5, 9.0, "Хургада", 1, 90, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"]],
  ["Rixos Sharm El Sheikh", "egypt", "Шарм-эль-Шейх", 5, 9.2, "Набк Бей", 1, 110, ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"]],
  ["Albatros Palace", "egypt", "Хургада", 4, 8.6, "Хургада", 2, 320, ["Beach", "Pool", "Kids Club", "Wi-Fi"]],
  ["Vinpearl Nha Trang", "vietnam", "Нячанг", 5, 9.0, "Хон Че", 1, 60, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"]],
  ["Amiana Resort", "vietnam", "Нячанг", 4, 8.8, "Нячанг", 1, 80, ["Beach", "Pool", "Spa", "Wi-Fi"]],
  ["Soneva Fushi", "maldives", "Баа Атолл", 5, 9.8, "Баа Атолл", 1, 10, ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"]],
  ["Kuramathi Island", "maldives", "Ари Атолл", 5, 9.4, "Расду Атолл", 1, 20, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"]],
  ["Radisson Blu Batumi", "georgia", "Батуми", 5, 8.9, "Батуми", 1, 150, ["Beach", "Pool", "Spa", "Wi-Fi"]],
  ["Hotel Old Batumi", "georgia", "Батуми", 3, 7.8, "Старый город", 3, 900, ["Wi-Fi"]],
  ["Heritance Ahungalla", "srilanka", "Ахунгалла", 5, 9.1, "Ахунгалла", 1, 40, ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"]],
  ["Padma Resort Legian", "indonesia", "Кута", 5, 9.3, "Легиан", 1, 70, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"]],
  ["Alaya Resort Ubud", "indonesia", "Убуд", 4, 8.9, "Убуд", 3, 25000, ["Pool", "Spa", "Wi-Fi"]],
  ["Marsa Alam Oasis", "egypt", "Марса-Алам", 4, 8.2, "Марса-Алам", 1, 200, ["Beach", "Pool", "Wi-Fi"]],
  ["Souq Waqif Boutique", "qatar", "Доха", 5, 9.0, "Souq Waqif", 3, 3500, ["Pool", "Spa", "Wi-Fi"]],
  ["Hilton Salwa Beach", "qatar", "Доха", 5, 9.2, "Salwa", 1, 50, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"]],
  ["Bentota Beach Hotel", "srilanka", "Бентота", 4, 8.5, "Бентота", 1, 60, ["Beach", "Pool", "Spa", "Wi-Fi"]],
  ["Fusion Resort Phu Quoc", "vietnam", "Фукуок", 5, 9.4, "Фукуок", 1, 30, ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"]],
];

const hotelImages = [hotel1, hotel2, hotel3, hotel4];

export const hotels: Hotel[] = hotelSeed.map(
  ([name, destinationId, city, stars, rating, district, beachLine, distanceToSea, amenities], i) => {
    const dest = destinations.find((d) => d.id === destinationId)!;
    return {
      id: `hotel-${i + 1}`,
      name,
      destinationId,
      city,
      country: dest.country,
      flag: dest.flag,
      stars,
      rating,
      reviews: 180 + ((i * 137) % 2400),
      district,
      beachLine,
      distanceToSea,
      amenities,
      image: hotelImages[i % hotelImages.length]!,
    };
  },
);

export type MealCode = "RO" | "BB" | "HB" | "FB" | "AI" | "UAI";
export type Meal = string;
export type TourTag = "hot" | "premium" | "best" | "sponsored";

export const mealOptions: Array<{ code: MealCode; label: string }> = [
  { code: "RO", label: "Без питания" },
  { code: "BB", label: "Завтрак" },
  { code: "HB", label: "Полупансион" },
  { code: "FB", label: "Полный пансион" },
  { code: "AI", label: "All Inclusive" },
  { code: "UAI", label: "Ultra All Inclusive" },
];

export const mealLabel = (code: MealCode) =>
  mealOptions.find((m) => m.code === code)?.label ?? code;

export type Tour = {
  id: string;
  hotelId: string;
  operatorId: string;
  from: string;
  nights: number;
  dateStart: string;
  dateEnd: string;
  /** ISO date of departure */
  departure: string;
  mealCode: MealCode;
  meal: Meal;
  price: number;
  oldPrice?: number;
  premiumPrice?: number;
  tags: TourTag[];
  adults: number;
  children: number;
  transfer: boolean;
  views: number;
  bookings: number;
  createdAt: string;
};

const cities = ["Алматы", "Астана", "Шымкент"];
const monthNames = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const mealCycle: MealCode[] = ["AI", "UAI", "BB", "HB", "FB", "AI", "UAI", "RO", "BB", "AI"];

const fmtDay = (d: Date) => `${d.getDate()} ${monthNames[d.getMonth()]}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const tours: Tour[] = Array.from({ length: 60 }, (_, i) => {
  const hotel = hotels[i % hotels.length]!;
  const nights = [3, 5, 7, 9, 10, 12, 14, 16][i % 8]!;
  const start = new Date(2026, 7, 3 + ((i * 5) % 55));
  const end = new Date(start.getTime() + nights * 86400000);
  const mealCode = mealCycle[i % mealCycle.length]!;
  const mealBonus = mealCode === "UAI" ? 180000 : mealCode === "AI" ? 120000 : mealCode === "FB" ? 70000 : 0;
  const base =
    360000 + ((i * 137) % 17) * 62000 + hotel.stars * 95000 + nights * 21000 + mealBonus;
  const price = Math.round(base / 1000) * 1000;
  const isHot = i % 5 === 0;
  const isPremium = i % 7 === 3;
  const isSponsored = i % 9 === 2;
  const tags: TourTag[] = [];
  if (isHot) tags.push("hot");
  if (isPremium) tags.push("premium");
  if (isSponsored) tags.push("sponsored");
  if (i % 11 === 1) tags.push("best");

  return {
    id: `tour-${i + 1}`,
    hotelId: hotel.id,
    operatorId: operators[i % operators.length]!.id,
    from: cities[(i + Math.floor(i / hotels.length)) % cities.length]!,
    nights,
    dateStart: fmtDay(start),
    dateEnd: fmtDay(end),
    departure: iso(start),
    mealCode,
    meal: mealLabel(mealCode),
    price,
    ...(isHot ? { oldPrice: Math.round((price * 1.28) / 1000) * 1000 } : {}),
    ...(isPremium ? { premiumPrice: Math.round((price * 0.82) / 1000) * 1000 } : {}),
    tags,
    adults: [2, 2, 1, 3, 2, 4][i % 6]!,
    children: [0, 2, 1, 0, 2, 1][i % 6]!,
    transfer: hotel.amenities.includes("Transfer") || i % 3 !== 0,
    views: 1200 + ((i * 371) % 9000),
    bookings: 3 + ((i * 7) % 40),
    createdAt: iso(new Date(2026, 5, 1 + ((i * 11) % 60))),
  };
});

export const getHotel = (id: string) => hotels.find((h) => h.id === id)!;
export const getDestination = (id: string) => destinations.find((d) => d.id === id);
export const getResorts = (id: string) => resortsByDestination[id] ?? [];
export const getToursByDestination = (id: string) =>
  tours.filter((t) => getHotel(t.hotelId).destinationId === id);
export const getOperator = (id: string) => operators.find((o) => o.id === id)!;
export const getTour = (id: string) => tours.find((t) => t.id === id);

export const hotTours = tours.filter((t) => t.tags.includes("hot")).slice(0, 4);
export const premiumTours = tours.filter((t) => t.tags.includes("premium")).slice(0, 3);

export const formatPrice = (value: number) =>
  `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;

export const formatNumber = (value: number) => new Intl.NumberFormat("ru-RU").format(value);

export const nightsLabel = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ночь`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ночи`;
  return `${n} ночей`;
};

export const guestsLabel = (adults: number, children: number) =>
  children > 0 ? `${adults} взрослых + ${children} ${children === 1 ? "ребёнок" : "детей"}` : `${adults} взрослых`;