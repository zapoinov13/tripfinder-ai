import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** Minimal copy of demo generators without image imports — for SQL seed only. */

const destinations = [
  {
    id: "turkey",
    country: "Турция",
    city: "Анталия",
    flag: "🇹🇷",
    blurb: "Пляжи, all inclusive",
    tours: 1284,
  },
  { id: "uae", country: "ОАЭ", city: "Дубай", flag: "🇦🇪", blurb: "Городской люкс", tours: 942 },
  { id: "thailand", country: "Таиланд", city: "Пхукет", flag: "🇹🇭", blurb: "Тропики", tours: 763 },
  {
    id: "egypt",
    country: "Египет",
    city: "Хургада",
    flag: "🇪🇬",
    blurb: "Красное море",
    tours: 651,
  },
  { id: "vietnam", country: "Вьетнам", city: "Нячанг", flag: "🇻🇳", blurb: "Океан", tours: 418 },
  { id: "maldives", country: "Мальдивы", city: "Мале", flag: "🇲🇻", blurb: "Виллы", tours: 287 },
  {
    id: "georgia",
    country: "Грузия",
    city: "Батуми",
    flag: "🇬🇪",
    blurb: "Море и горы",
    tours: 312,
  },
  { id: "qatar", country: "Катар", city: "Доха", flag: "🇶🇦", blurb: "Новые отели", tours: 164 },
  {
    id: "srilanka",
    country: "Шри-Ланка",
    city: "Бентота",
    flag: "🇱🇰",
    blurb: "Океан и чай",
    tours: 208,
  },
  { id: "indonesia", country: "Индонезия", city: "Бали", flag: "🇮🇩", blurb: "Серф", tours: 356 },
];

const operators = [
  { id: "op-1", name: "Travel Company", rating: 4.8, tours: 1284 },
  { id: "op-2", name: "Sunrise Tours", rating: 4.6, tours: 864 },
  { id: "op-3", name: "Blue Horizon", rating: 4.7, tours: 612 },
  { id: "op-4", name: "Nomad Travel", rating: 4.5, tours: 438 },
  { id: "op-5", name: "Silk Road Voyage", rating: 4.4, tours: 297 },
];

const hotelSeed: Array<[string, string, string, number, number, string, number, number, string[]]> =
  [
    [
      "Rixos Premium Dubai",
      "uae",
      "Дубай",
      5,
      9.4,
      "Jumeirah Beach",
      1,
      50,
      ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Atlantis The Palm",
      "uae",
      "Дубай",
      5,
      9.6,
      "Palm Jumeirah",
      1,
      80,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Address Beach Resort",
      "uae",
      "Дубай",
      5,
      9.2,
      "JBR",
      1,
      120,
      ["Beach", "Pool", "Spa", "Wi-Fi"],
    ],
    ["Centro Barsha", "uae", "Дубай", 3, 7.9, "Al Barsha", 3, 4200, ["Pool", "Wi-Fi"]],
    [
      "Bab Al Qasr",
      "uae",
      "Абу-Даби",
      5,
      9.1,
      "Corniche",
      1,
      60,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"],
    ],
    [
      "Maxx Royal Belek",
      "turkey",
      "Белек",
      5,
      9.5,
      "Белек",
      1,
      60,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Titanic Deluxe Lara",
      "turkey",
      "Анталия",
      5,
      9.1,
      "Лара",
      1,
      100,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Delphin Imperial",
      "turkey",
      "Анталия",
      5,
      8.9,
      "Лара",
      1,
      150,
      ["Beach", "Pool", "Kids Club", "Wi-Fi", "Transfer"],
    ],
    [
      "Sherwood Exclusive",
      "turkey",
      "Кемер",
      4,
      8.4,
      "Кемер",
      2,
      300,
      ["Beach", "Pool", "Wi-Fi", "Transfer"],
    ],
    ["Grand Alanya Hotel", "turkey", "Алания", 3, 7.6, "Махмутлар", 2, 450, ["Pool", "Wi-Fi"]],
    [
      "Katathani Phuket Beach",
      "thailand",
      "Пхукет",
      5,
      9.3,
      "Ката Ной",
      1,
      40,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"],
    ],
    [
      "Amari Phuket",
      "thailand",
      "Пхукет",
      4,
      8.7,
      "Патонг",
      2,
      250,
      ["Beach", "Pool", "Spa", "Wi-Fi"],
    ],
    [
      "Banyan Tree Krabi",
      "thailand",
      "Краби",
      5,
      9.5,
      "Краби",
      1,
      70,
      ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Steigenberger Aldau",
      "egypt",
      "Хургада",
      5,
      9.0,
      "Хургада",
      1,
      90,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Rixos Sharm El Sheikh",
      "egypt",
      "Шарм-эль-Шейх",
      5,
      9.2,
      "Набк Бей",
      1,
      110,
      ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Albatros Palace",
      "egypt",
      "Хургада",
      4,
      8.6,
      "Хургада",
      2,
      320,
      ["Beach", "Pool", "Kids Club", "Wi-Fi"],
    ],
    [
      "Vinpearl Nha Trang",
      "vietnam",
      "Нячанг",
      5,
      9.0,
      "Хон Че",
      1,
      60,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Amiana Resort",
      "vietnam",
      "Нячанг",
      4,
      8.8,
      "Нячанг",
      1,
      80,
      ["Beach", "Pool", "Spa", "Wi-Fi"],
    ],
    [
      "Soneva Fushi",
      "maldives",
      "Баа Атолл",
      5,
      9.8,
      "Баа Атолл",
      1,
      10,
      ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Kuramathi Island",
      "maldives",
      "Ари Атолл",
      5,
      9.4,
      "Расду Атолл",
      1,
      20,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"],
    ],
    [
      "Radisson Blu Batumi",
      "georgia",
      "Батуми",
      5,
      8.9,
      "Батуми",
      1,
      150,
      ["Beach", "Pool", "Spa", "Wi-Fi"],
    ],
    ["Hotel Old Batumi", "georgia", "Батуми", 3, 7.8, "Старый город", 3, 900, ["Wi-Fi"]],
    [
      "Heritance Ahungalla",
      "srilanka",
      "Ахунгалла",
      5,
      9.1,
      "Ахунгалла",
      1,
      40,
      ["Beach", "Pool", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Padma Resort Legian",
      "indonesia",
      "Кута",
      5,
      9.3,
      "Легиан",
      1,
      70,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi"],
    ],
    ["Alaya Resort Ubud", "indonesia", "Убуд", 4, 8.9, "Убуд", 3, 25000, ["Pool", "Spa", "Wi-Fi"]],
    [
      "Marsa Alam Oasis",
      "egypt",
      "Марса-Алам",
      4,
      8.2,
      "Марса-Алам",
      1,
      200,
      ["Beach", "Pool", "Wi-Fi"],
    ],
    [
      "Souq Waqif Boutique",
      "qatar",
      "Доха",
      5,
      9.0,
      "Souq Waqif",
      3,
      3500,
      ["Pool", "Spa", "Wi-Fi"],
    ],
    [
      "Hilton Salwa Beach",
      "qatar",
      "Доха",
      5,
      9.2,
      "Salwa",
      1,
      50,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
    ],
    [
      "Bentota Beach Hotel",
      "srilanka",
      "Бентота",
      4,
      8.5,
      "Бентота",
      1,
      60,
      ["Beach", "Pool", "Spa", "Wi-Fi"],
    ],
    [
      "Fusion Resort Phu Quoc",
      "vietnam",
      "Фукуок",
      5,
      9.4,
      "Фукуок",
      1,
      30,
      ["Beach", "Pool", "Kids Club", "Spa", "Wi-Fi", "Transfer"],
    ],
  ];

const mealLabel: Record<string, string> = {
  RO: "Без питания",
  BB: "Завтрак",
  HB: "Полупансион",
  FB: "Полный пансион",
  AI: "All Inclusive",
  UAI: "Ultra All Inclusive",
};
const mealCycle = ["AI", "UAI", "BB", "HB", "FB", "AI", "UAI", "RO", "BB", "AI"];
const cities = ["Алматы", "Астана", "Шымкент", "Актау"];
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

const esc = (v: string) => v.replace(/'/g, "''");
const arr = (xs: string[]) =>
  xs.length ? `ARRAY[${xs.map((x) => `'${esc(x)}'`).join(",")}]::text[]` : `ARRAY[]::text[]`;
const fmtDay = (d: Date) => `${d.getDate()} ${monthNames[d.getMonth()]}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const hotels = hotelSeed.map(
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
      country: dest.country,
      flag: dest.flag,
      stars,
      rating,
      reviews: 180 + ((i * 137) % 2400),
      district,
      beachLine,
      distanceToSea,
      amenities,
    };
  },
);

const tours = Array.from({ length: 120 }, (_, i) => {
  const hotel = hotels[i % hotels.length]!;
  const nights = [3, 5, 7, 9, 10, 12, 14, 16][i % 8]!;
  const start = new Date(2026, 7, 3 + ((i * 5) % 55));
  const end = new Date(start.getTime() + nights * 86400000);
  const mealCode = mealCycle[i % mealCycle.length]!;
  const mealBonus =
    mealCode === "UAI" ? 180000 : mealCode === "AI" ? 120000 : mealCode === "FB" ? 70000 : 0;
  const base = 360000 + ((i * 137) % 17) * 62000 + hotel.stars * 95000 + nights * 21000 + mealBonus;
  const price = Math.round(base / 1000) * 1000;
  const tags: string[] = [];
  if (i % 5 === 0) tags.push("hot");
  if (i % 7 === 3) tags.push("premium");
  if (i % 9 === 2) tags.push("sponsored");
  if (i % 11 === 1) tags.push("best");
  const op = operators[i % operators.length]!;
  return {
    id: `tour-${i + 1}`,
    hotelId: hotel.id,
    operatorId: op.id,
    from: cities[(i + Math.floor(i / hotels.length)) % cities.length]!,
    nights,
    dateStart: fmtDay(start),
    dateEnd: fmtDay(end),
    departure: iso(start),
    mealCode,
    meal: mealLabel[mealCode]!,
    price,
    oldPrice: i % 5 === 0 ? Math.round((price * 1.28) / 1000) * 1000 : null,
    premiumPrice: i % 7 === 3 ? Math.round((price * 0.82) / 1000) * 1000 : null,
    tags,
    adults: [2, 2, 1, 3, 2, 4][i % 6]!,
    children: [0, 2, 1, 0, 2, 1][i % 6]!,
    transfer: hotel.amenities.includes("Transfer") || i % 3 !== 0,
    views: 1200 + ((i * 371) % 9000),
    bookings: 3 + ((i * 7) % 40),
    createdAt: iso(new Date(2026, 5, 1 + ((i * 11) % 60))),
  };
});

const destSql = destinations
  .map(
    (d) =>
      `('${esc(d.id)}','${esc(d.country)}','${esc(d.city)}','${esc(d.flag)}','${esc(d.blurb)}',${d.tours},'${esc(d.id)}')`,
  )
  .join(",\n");

const hotelSql = hotels
  .map(
    (h) =>
      `('${esc(h.id)}','${esc(h.name)}','${esc(h.destinationId)}','${esc(h.city)}','${esc(h.country)}','${esc(h.flag)}',${h.stars},${h.rating},${h.reviews},'${esc(h.district)}',${h.beachLine},${h.distanceToSea},${arr(h.amenities)},'${esc(h.id)}')`,
  )
  .join(",\n");

const opSql = operators
  .map((o, i) => {
    const org =
      i === 0
        ? "'11111111-1111-1111-1111-111111111101'"
        : i === 4
          ? "'11111111-1111-1111-1111-111111111105'"
          : "null";
    return `('${esc(o.id)}','${esc(o.name)}',${o.rating},${o.tours},${org})`;
  })
  .join(",\n");

const tourSql = tours
  .map((t) => {
    const org =
      t.operatorId === "op-1"
        ? "11111111-1111-1111-1111-111111111101"
        : t.operatorId === "op-5"
          ? "11111111-1111-1111-1111-111111111105"
          : "11111111-1111-1111-1111-111111111101";
    const old = t.oldPrice == null ? "null" : String(t.oldPrice);
    const prem = t.premiumPrice == null ? "null" : String(t.premiumPrice);
    return `('${esc(t.id)}','${esc(t.hotelId)}','${esc(t.operatorId)}','${org}','ext-${esc(t.id)}','Standard Double','${esc(t.from)}',${t.nights},'${esc(t.dateStart)}','${esc(t.dateEnd)}','${t.departure}','${t.mealCode}','${esc(t.meal)}',${t.price},${old},${prem},'KZT',${arr(t.tags)},${t.adults},${t.children},${t.transfer},${t.views},${t.bookings},8,'active',now(),'${t.createdAt}')`;
  })
  .join(",\n");

const sql = `-- Auto-generated catalog seed (120 tours)
insert into public.destinations (id, country, city, flag, blurb, tours_count, image_key) values
${destSql}
on conflict (id) do update set country=excluded.country, city=excluded.city, blurb=excluded.blurb, tours_count=excluded.tours_count;

insert into public.hotels (id, name, destination_id, city, country, flag, stars, rating, reviews, district, beach_line, distance_to_sea, amenities, image_key) values
${hotelSql}
on conflict (id) do update set name=excluded.name, rating=excluded.rating, amenities=excluded.amenities;

insert into public.operators (id, name, rating, tours_count, organization_id) values
${opSql}
on conflict (id) do update set name=excluded.name, rating=excluded.rating, organization_id=excluded.organization_id;

insert into public.tour_offers (
  id, hotel_id, operator_id, operator_org_id, external_id, room_type, from_city, nights,
  date_start, date_end, departure, meal_code, meal, price, old_price, premium_price, currency,
  tags, adults, children, transfer, views, bookings, availability, status, last_synced_at, created_at
) values
${tourSql}
on conflict (id) do update set price=excluded.price, tags=excluded.tags, status=excluded.status, availability=excluded.availability;
`;

const out = resolve("supabase/seed_catalog.sql");
writeFileSync(out, sql);
console.log(`Wrote ${out}`);
