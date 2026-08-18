import dubaiDowntown from "@/assets/dubai-downtown.jpg";
import dubaiFamily from "@/assets/dubai-family.jpg";
import dubaiHero from "@/assets/dubai-hero.jpg";
import dubaiHotelBeach from "@/assets/dubai-hotel-beach.jpg";
import dubaiJumeirahBeach from "@/assets/dubai-jumeirah-beach.webp";
import dubaiOldCity from "@/assets/dubai-old-city.jpg";
import dubaiPalm from "@/assets/dubai-palm.jpg";
import dubaiResortPool from "@/assets/dubai-resort-pool.jpg";
import dubaiSafari from "@/assets/dubai-safari.jpg";
import dubaiYacht from "@/assets/dubai-yacht.jpg";

export const heroImage = dubaiHero;
export const galleryImages = [
  dubaiHero,
  dubaiHotelBeach,
  dubaiPalm,
  dubaiDowntown,
  dubaiSafari,
  dubaiYacht,
];

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

export const destinations: Destination[] = [
  {
    id: "dubai-beach",
    country: "Пляжный Дубай",
    city: "JBR & Marina",
    flag: "🇦🇪",
    blurb: "Отели у моря, прогулки, рестораны и семейный отдых",
    tours: 428,
    image: dubaiHero,
  },
  {
    id: "dubai-palm",
    country: "Palm Jumeirah",
    city: "The Palm",
    flag: "🇦🇪",
    blurb: "Премиальные резорты, Atlantis, пляжи и аквапарки",
    tours: 286,
    image: dubaiPalm,
  },
  {
    id: "dubai-downtown",
    country: "Downtown Dubai",
    city: "Burj Khalifa",
    flag: "🇦🇪",
    blurb: "Dubai Mall, фонтаны, рестораны и городские отели",
    tours: 314,
    image: dubaiDowntown,
  },
  {
    id: "dubai-family",
    country: "Семейный Дубай",
    city: "Parks & Resorts",
    flag: "🇦🇪",
    blurb: "Kids club, аквапарки, парки развлечений и трансферы",
    tours: 245,
    image: dubaiFamily,
  },
  {
    id: "dubai-budget",
    country: "Доступный Дубай",
    city: "Deira & Al Barsha",
    flag: "🇦🇪",
    blurb: "Практичные отели, метро рядом и честный бюджет",
    tours: 372,
    image: dubaiOldCity,
  },
  {
    id: "dubai-experiences",
    country: "Экскурсии в Дубае",
    city: "Safari, Yacht, Tickets",
    flag: "🇦🇪",
    blurb: "Сафари, яхты, обзорные туры, билеты и трансферы",
    tours: 198,
    image: dubaiSafari,
  },
];

export const resortsByDestination: Record<string, Resort[]> = {
  "dubai-beach": [
    { name: "JBR", blurb: "Пляж, The Walk, рестораны и семейная инфраструктура", tours: 142 },
    { name: "Dubai Marina", blurb: "Набережная, яхты, nightlife и метро", tours: 118 },
    { name: "Bluewaters", blurb: "Ain Dubai, новые отели и спокойная атмосфера", tours: 62 },
    {
      name: "Jumeirah Beach",
      blurb: "Классический пляжный отдых и Burj Al Arab рядом",
      tours: 106,
    },
  ],
  "dubai-palm": [
    { name: "Palm West Beach", blurb: "Пляжные клубы, sunset views и резорты", tours: 86 },
    { name: "Crescent Palm", blurb: "Тихие премиальные отели и приватные пляжи", tours: 74 },
    { name: "Atlantis Area", blurb: "Aquaventure, The Lost Chambers и семейный люкс", tours: 54 },
  ],
  "dubai-downtown": [
    { name: "Downtown", blurb: "Dubai Mall, Burj Khalifa и фонтаны пешком", tours: 128 },
    { name: "Business Bay", blurb: "Каналы, рестораны и быстрый доступ к центру", tours: 94 },
    { name: "DIFC", blurb: "Рестораны, деловые поездки и премиальный city stay", tours: 46 },
  ],
  "dubai-family": [
    { name: "Dubai Parks", blurb: "Legoland, Motiongate и пакетные семейные туры", tours: 74 },
    { name: "Jumeirah", blurb: "Пляжи, Wild Wadi и семейные отели", tours: 88 },
    { name: "Creek Harbour", blurb: "Спокойный район, promenade и новые отели", tours: 52 },
  ],
  "dubai-budget": [
    { name: "Al Barsha", blurb: "Mall of the Emirates, метро и понятный бюджет", tours: 114 },
    { name: "Deira", blurb: "Старый Дубай, рынки, creek и недорогие отели", tours: 132 },
    { name: "Bur Dubai", blurb: "История, метро, музеи и удобная логистика", tours: 96 },
  ],
  "dubai-experiences": [
    { name: "Desert Safari", blurb: "Сафари, ужин в лагере и трансфер из отеля", tours: 56 },
    { name: "Yacht Marina", blurb: "Яхты из Marina на 2-4 часа для компаний", tours: 42 },
    { name: "City Tickets", blurb: "Burj Khalifa, Museum of the Future, Aquaventure", tours: 64 },
    { name: "Transfers", blurb: "DXB, DWC, Abu Dhabi, private car и минивэны", tours: 36 },
  ],
};

export type Operator = {
  id: string;
  name: string;
  rating: number;
  tours: number;
};

export const operators: Operator[] = [
  { id: "op-1", name: "Dubai Select DMC", rating: 4.9, tours: 428 },
  { id: "op-2", name: "Emirates Family Travel", rating: 4.8, tours: 316 },
  { id: "op-3", name: "Marina Experience Co.", rating: 4.7, tours: 184 },
  { id: "op-4", name: "CIS Dubai Holidays", rating: 4.8, tours: 272 },
  { id: "op-5", name: "Desert Gate Partners", rating: 4.6, tours: 198 },
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

const hotelSeed: Array<
  [string, string, string, number, number, string, 1 | 2 | 3, number, Amenity[]]
> = [
  [
    "Rixos Premium Dubai JBR",
    "dubai-beach",
    "JBR",
    5,
    9.4,
    "Jumeirah Beach Residence",
    1,
    50,
    ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Address Beach Resort",
    "dubai-beach",
    "JBR",
    5,
    9.3,
    "JBR",
    1,
    90,
    ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Grosvenor House Dubai",
    "dubai-beach",
    "Dubai Marina",
    5,
    9.1,
    "Dubai Marina",
    2,
    650,
    ["Pool", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Sofitel Dubai Jumeirah Beach",
    "dubai-beach",
    "JBR",
    5,
    8.9,
    "The Walk",
    1,
    120,
    ["Beach", "Pool", "Kids Club", "Wi-Fi", "Transfer"],
  ],
  [
    "Atlantis The Palm",
    "dubai-palm",
    "Palm Jumeirah",
    5,
    9.6,
    "Atlantis Area",
    1,
    80,
    ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "W Dubai The Palm",
    "dubai-palm",
    "Palm Jumeirah",
    5,
    9.1,
    "Crescent Palm",
    1,
    70,
    ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Dukes The Palm",
    "dubai-palm",
    "Palm Jumeirah",
    5,
    8.8,
    "Palm West Beach",
    1,
    100,
    ["Beach", "Pool", "Kids Club", "Wi-Fi", "Transfer"],
  ],
  [
    "Address Downtown",
    "dubai-downtown",
    "Downtown",
    5,
    9.4,
    "Burj Khalifa District",
    3,
    15000,
    ["Pool", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Palace Downtown",
    "dubai-downtown",
    "Downtown",
    5,
    9.2,
    "Old Town",
    3,
    14500,
    ["Pool", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Pullman Dubai Downtown",
    "dubai-downtown",
    "Business Bay",
    5,
    8.6,
    "Business Bay",
    3,
    13000,
    ["Pool", "Spa", "Wi-Fi"],
  ],
  [
    "Lapita Dubai Parks and Resorts",
    "dubai-family",
    "Dubai Parks",
    4,
    8.7,
    "Dubai Parks",
    3,
    23000,
    ["Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Jumeirah Beach Hotel",
    "dubai-family",
    "Jumeirah",
    5,
    9.2,
    "Umm Suqeim",
    1,
    40,
    ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
  ],
  [
    "Vida Creek Harbour",
    "dubai-family",
    "Creek Harbour",
    4,
    8.9,
    "Dubai Creek Harbour",
    3,
    14000,
    ["Pool", "Kids Club", "Wi-Fi", "Transfer"],
  ],
  [
    "Centro Barsha",
    "dubai-budget",
    "Al Barsha",
    3,
    8.0,
    "Al Barsha",
    3,
    4200,
    ["Pool", "Wi-Fi", "Transfer"],
  ],
  [
    "Rove Downtown",
    "dubai-budget",
    "Downtown",
    3,
    8.8,
    "Zaabeel",
    3,
    13000,
    ["Pool", "Wi-Fi", "Transfer"],
  ],
  [
    "Hyatt Place Dubai Al Rigga",
    "dubai-budget",
    "Deira",
    4,
    8.3,
    "Al Rigga",
    3,
    9000,
    ["Pool", "Wi-Fi", "Transfer"],
  ],
  [
    "Canopy by Hilton Dubai Al Seef",
    "dubai-budget",
    "Bur Dubai",
    4,
    8.6,
    "Al Seef",
    3,
    8500,
    ["Pool", "Spa", "Wi-Fi"],
  ],
  [
    "Dubai Safari Camp Package",
    "dubai-experiences",
    "Desert Safari",
    4,
    9.0,
    "Lahbab Desert",
    3,
    45000,
    ["Transfer", "Wi-Fi"],
  ],
  [
    "Private Yacht Marina Experience",
    "dubai-experiences",
    "Yacht Marina",
    5,
    9.5,
    "Dubai Marina",
    2,
    300,
    ["Transfer", "Wi-Fi"],
  ],
  [
    "Burj Khalifa and Downtown Pass",
    "dubai-experiences",
    "City Tickets",
    4,
    9.1,
    "Downtown",
    3,
    15000,
    ["Transfer", "Wi-Fi"],
  ],
];

function imageForHotel(destinationId: string, name: string, district: string) {
  if (/Yacht/i.test(name)) return dubaiYacht;
  if (/Safari/i.test(name)) return dubaiSafari;
  if (
    /Burj|Downtown|Address|Palace|Pullman/i.test(name) ||
    /Downtown|Business Bay/i.test(district)
  ) {
    return dubaiDowntown;
  }
  if (/Atlantis|Palm|Dukes|W Dubai/i.test(name) || /Palm/i.test(district)) return dubaiPalm;
  if (/Lapita|Parks|Jumeirah Beach Hotel/i.test(name) || destinationId === "dubai-family") {
    return destinationId === "dubai-family" && /Lapita|Parks/i.test(name)
      ? dubaiFamily
      : dubaiJumeirahBeach;
  }
  if (/Deira|Bur Dubai|Al Seef|Al Rigga/i.test(name) || /Deira|Bur Dubai|Al Seef/i.test(district)) {
    return dubaiOldCity;
  }
  if (/Rixos|Address Beach|Sofitel|JBR|Beach/i.test(name) || /JBR|Jumeirah/i.test(district)) {
    return dubaiHotelBeach;
  }
  return dubaiResortPool;
}

export const hotels: Hotel[] = hotelSeed.map(
  (
    [name, destinationId, city, stars, rating, district, beachLine, distanceToSea, amenities],
    i,
  ) => {
    const dest = destinations.find((d) => d.id === destinationId)!;
    return {
      id: `hotel-${i + 1}`,
      name,
      destinationId,
      city,
      country: "Дубай, ОАЭ",
      flag: dest.flag,
      stars,
      rating,
      reviews: 220 + ((i * 173) % 2800),
      district,
      beachLine,
      distanceToSea,
      amenities,
      image: imageForHotel(destinationId, name, district),
    };
  },
);

export type MealCode = "RO" | "BB" | "HB" | "FB" | "AI" | "UAI";
export type Meal = string;
export type TourTag = "hot" | "premium" | "best" | "sponsored";
export type OfferCategory = "tour" | "hotel" | "excursion" | "transfer";

export const offerCategoryLabels: Record<OfferCategory, string> = {
  tour: "Пакетный тур",
  hotel: "Отель",
  excursion: "Экскурсия",
  transfer: "Трансфер",
};

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
  offerCategory: OfferCategory;
  from: string;
  nights: number;
  dateStart: string;
  dateEnd: string;
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

const cities = ["Алматы", "Астана", "Ташкент", "Бишкек", "Москва", "Санкт-Петербург"];
const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const mealCycle: MealCode[] = ["BB", "HB", "AI", "RO", "BB", "FB", "AI", "UAI"];
const categoryCycle: OfferCategory[] = [
  "tour",
  "hotel",
  "tour",
  "excursion",
  "tour",
  "hotel",
  "transfer",
  "tour",
];

const fmtDay = (d: Date) => `${d.getDate()} ${monthNames[d.getMonth()]}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const tours: Tour[] = Array.from({ length: 180 }, (_, i) => {
  const hotel = hotels[i % hotels.length]!;
  const offerCategory = categoryCycle[(i + hotel.destinationId.length) % categoryCycle.length]!;
  const nights =
    offerCategory === "excursion" || offerCategory === "transfer"
      ? 1
      : [3, 4, 5, 7, 9, 10, 12][i % 7]!;
  const start = new Date(2026, 7, 20 + ((i * 3) % 70));
  const end = new Date(start.getTime() + nights * 86400000);
  const mealCode =
    offerCategory === "excursion" || offerCategory === "transfer"
      ? "RO"
      : mealCycle[i % mealCycle.length]!;
  const mealBonus =
    mealCode === "UAI" ? 170000 : mealCode === "AI" ? 115000 : mealCode === "FB" ? 70000 : 0;
  const categoryBase =
    offerCategory === "excursion"
      ? 65000
      : offerCategory === "transfer"
        ? 45000
        : offerCategory === "hotel"
          ? 280000
          : 520000;
  const base =
    categoryBase + ((i * 97) % 19) * 32000 + hotel.stars * 86000 + nights * 24000 + mealBonus;
  const price = Math.round(base / 1000) * 1000;
  const isHot = i % 6 === 0;
  const isPremium = i % 8 === 3 || hotel.destinationId === "dubai-palm";
  const isSponsored = i % 10 === 2;
  const tags: TourTag[] = [];
  if (isHot) tags.push("hot");
  if (isPremium) tags.push("premium");
  if (isSponsored) tags.push("sponsored");
  if (i % 9 === 1) tags.push("best");

  return {
    id: `tour-${i + 1}`,
    hotelId: hotel.id,
    operatorId: operators[i % operators.length]!.id,
    offerCategory,
    from: cities[(i + Math.floor(i / hotels.length)) % cities.length]!,
    nights,
    dateStart: fmtDay(start),
    dateEnd: fmtDay(end),
    departure: iso(start),
    mealCode,
    meal: mealLabel(mealCode),
    price,
    ...(isHot ? { oldPrice: Math.round((price * 1.22) / 1000) * 1000 } : {}),
    ...(isPremium ? { premiumPrice: Math.round((price * 0.86) / 1000) * 1000 } : {}),
    tags,
    adults: [2, 2, 1, 3, 2, 4][i % 6]!,
    children: [0, 2, 1, 0, 2, 1][i % 6]!,
    transfer: hotel.amenities.includes("Transfer") || offerCategory !== "hotel",
    views: 1500 + ((i * 421) % 12000),
    bookings: 5 + ((i * 11) % 64),
    createdAt: iso(new Date(2026, 6, 1 + ((i * 7) % 45))),
  };
});

export const getHotel = (id: string) => hotels.find((h) => h.id === id)!;
export const getDestination = (id: string) => destinations.find((d) => d.id === id);
export const getResorts = (id: string) => resortsByDestination[id] ?? [];
export const getToursByDestination = (id: string) =>
  tours.filter((t) => getHotel(t.hotelId).destinationId === id);
export const getOperator = (id: string) => operators.find((o) => o.id === id)!;
export const getTour = (id: string) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tourgo:dubai-platform-v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { tours?: Tour[] };
        const live = parsed.tours?.find((t) => t.id === id);
        if (live) return live;
      }
    } catch {
      /* ignore */
    }
  }
  return tours.find((t) => t.id === id);
};

export const hotTours = tours.filter((t) => t.tags.includes("hot")).slice(0, 4);
export const premiumTours = tours.filter((t) => t.tags.includes("premium")).slice(0, 3);
export const experienceTours = tours.filter((t) => t.offerCategory === "excursion").slice(0, 12);

export const priceFreshnessMinutes = (tour: Tour) => 6 + (Number(tour.id.replace(/\D/g, "")) % 37);

export const availabilityLabel = (tour: Tour) => {
  const seats = 2 + (Number(tour.id.replace(/\D/g, "")) % 9);
  if (tour.offerCategory === "excursion") return `${seats} мест на ближайший слот`;
  if (tour.offerCategory === "transfer") return "Подтверждение времени до 15 минут";
  return seats <= 4 ? `Осталось ${seats} места` : "Места есть";
};

export const supplierTrustScore = (operatorId: string) => {
  const n = Number(operatorId.replace(/\D/g, "")) || 1;
  return {
    responseMinutes: 7 + ((n * 5) % 18),
    confirmedBookings: 180 + n * 73,
    rating: (4.6 + (n % 4) * 0.1).toFixed(1),
  };
};

export const formatPrice = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;

export const formatNumber = (value: number) => new Intl.NumberFormat("ru-RU").format(value);

export const nightsLabel = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ночь`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ночи`;
  return `${n} ночей`;
};

export const guestsLabel = (adults: number, children: number) =>
  children > 0
    ? `${adults} взрослых + ${children} ${children === 1 ? "ребёнок" : "детей"}`
    : `${adults} взрослых`;
