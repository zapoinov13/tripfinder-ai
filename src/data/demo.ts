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
  district: string;
  beachLine: 1 | 2 | 3;
  distanceToSea: number;
  amenities: string[];
  image: string;
};

const hotelSeed: Array<[string, string, number, number, string, 1 | 2 | 3, number]> = [
  ["Rixos Premium Dubai", "uae", 5, 9.4, "Jumeirah Beach", 1, 50],
  ["Atlantis The Palm", "uae", 5, 9.6, "Palm Jumeirah", 1, 80],
  ["Address Beach Resort", "uae", 5, 9.2, "JBR", 1, 120],
  ["Maxx Royal Belek", "turkey", 5, 9.5, "Белек", 1, 60],
  ["Titanic Deluxe Lara", "turkey", 5, 9.1, "Лара", 1, 100],
  ["Delphin Imperial", "turkey", 5, 8.9, "Лара", 1, 150],
  ["Sherwood Exclusive", "turkey", 4, 8.4, "Кемер", 2, 300],
  ["Katathani Phuket Beach", "thailand", 5, 9.3, "Ката Ной", 1, 40],
  ["Amari Phuket", "thailand", 4, 8.7, "Патонг", 2, 250],
  ["Banyan Tree Krabi", "thailand", 5, 9.5, "Краби", 1, 70],
  ["Steigenberger Aldau", "egypt", 5, 9.0, "Хургада", 1, 90],
  ["Rixos Sharm El Sheikh", "egypt", 5, 9.2, "Набк Бей", 1, 110],
  ["Albatros Palace", "egypt", 5, 8.6, "Хургада", 2, 320],
  ["Vinpearl Nha Trang", "vietnam", 5, 9.0, "Хон Че", 1, 60],
  ["Amiana Resort", "vietnam", 5, 8.8, "Нячанг", 1, 80],
  ["Soneva Fushi", "maldives", 5, 9.8, "Баа Атолл", 1, 10],
  ["Kuramathi Island", "maldives", 5, 9.4, "Расду Атолл", 1, 20],
  ["Radisson Blu Batumi", "georgia", 5, 8.9, "Батуми", 1, 150],
  ["Heritance Ahungalla", "srilanka", 5, 9.1, "Ахунгалла", 1, 40],
  ["Padma Resort Legian", "indonesia", 5, 9.3, "Легиан", 1, 70],
];

const amenityPool = ["Wi-Fi", "Бассейн", "Детский бассейн", "Spa", "Пляж", "Ресторан", "Kids Club", "Фитнес"];
const hotelImages = [hotel1, hotel2, hotel3, hotel4];

export const hotels: Hotel[] = hotelSeed.map(
  ([name, destinationId, stars, rating, district, beachLine, distanceToSea], i) => {
    const dest = destinations.find((d) => d.id === destinationId)!;
    return {
      id: `hotel-${i + 1}`,
      name,
      destinationId,
      city: dest.city,
      country: dest.country,
      flag: dest.flag,
      stars,
      rating,
      district,
      beachLine,
      distanceToSea,
      amenities: amenityPool.slice(0, 5 + (i % 4)),
      image: hotelImages[i % hotelImages.length]!,
    };
  },
);

export type Meal = "All Inclusive" | "Ultra All Inclusive" | "Завтрак" | "Полупансион";
export type TourTag = "hot" | "premium" | "best";

export type Tour = {
  id: string;
  hotelId: string;
  operatorId: string;
  from: string;
  nights: number;
  dateStart: string;
  dateEnd: string;
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
};

const meals: Meal[] = ["All Inclusive", "Ultra All Inclusive", "Завтрак", "Полупансион"];
const cities = ["Алматы", "Астана", "Шымкент"];
const months = ["августа", "сентября", "октября"];

export const tours: Tour[] = Array.from({ length: 30 }, (_, i) => {
  const hotel = hotels[i % hotels.length]!;
  const nights = [5, 7, 9, 10, 12][i % 5]!;
  const startDay = 3 + ((i * 3) % 18);
  const monthIdx = i % 3;
  const endDay = startDay + nights;
  const base = 480000 + ((i * 137) % 14) * 85000 + hotel.stars * 60000;
  const price = Math.round(base / 1000) * 1000;
  const isHot = i % 5 === 0;
  const isPremium = i % 7 === 3;
  const tags: TourTag[] = [];
  if (isHot) tags.push("hot");
  if (isPremium) tags.push("premium");
  if (i % 11 === 1) tags.push("best");

  return {
    id: `tour-${i + 1}`,
    hotelId: hotel.id,
    operatorId: operators[i % operators.length]!.id,
    from: cities[i % cities.length]!,
    nights,
    dateStart: `${startDay} ${months[monthIdx]!}`,
    dateEnd: `${endDay} ${months[monthIdx]!}`,
    meal: meals[i % meals.length]!,
    price,
    ...(isHot ? { oldPrice: Math.round((price * 1.28) / 1000) * 1000 } : {}),
    ...(isPremium ? { premiumPrice: Math.round((price * 0.82) / 1000) * 1000 } : {}),
    tags,
    adults: 2,
    children: i % 3,
    transfer: true,
    views: 1200 + ((i * 371) % 9000),
    bookings: 3 + ((i * 7) % 40),
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