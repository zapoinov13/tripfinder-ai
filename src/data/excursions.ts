import { destinations, resortsByDestination } from "@/data/demo";
import { cityCover, excursionGallery } from "@/data/photos";

export type ExcursionCategory = "Экскурсии" | "Развлечения" | "Море" | "Трансферы";

export type Excursion = {
  id: string;
  title: string;
  destinationId: string;
  city: string;
  category: ExcursionCategory;
  duration: string;
  price: number;
  image: string;
  photos: string[];
  summary: string;
  includes: string[];
  company: string;
};

type Seed = [
  id: string,
  title: string,
  destinationId: string,
  city: string,
  category: ExcursionCategory,
  duration: string,
  price: number,
  photo: number,
  summary: string,
  includes: string[],
  company: string,
];

const seeds: Seed[] = [
  [
    "exc-safari",
    "Сафари в пустыне",
    "uae",
    "Дубай",
    "Развлечения",
    "6 часов",
    45000,
    0,
    "Катание по дюнам, фото на закате, ужин в бедуинском лагере и шоу.",
    ["Забор из отеля", "Ужин", "Русскоговорящий гид"],
    "Dubai Travel",
  ],
  [
    "exc-yacht",
    "Прогулка на яхте",
    "uae",
    "Дубай",
    "Море",
    "3 часа",
    220000,
    1,
    "Частная яхта вдоль Марины и Palm Jumeirah, до 10 человек.",
    ["Капитан", "Напитки", "Полотенца"],
    "Marina Boats",
  ],
  [
    "exc-burj",
    "Бурдж-Халифа",
    "uae",
    "Дубай",
    "Экскурсии",
    "2 часа",
    38000,
    2,
    "Смотровые площадки 124 и 125 этажа, вход без очереди.",
    ["Билет", "Проход без очереди"],
    "Dubai Travel",
  ],
  [
    "exc-city",
    "Обзорная экскурсия по Дубаю",
    "uae",
    "Дубай",
    "Экскурсии",
    "5 часов",
    32000,
    3,
    "Старый город, рынок специй, Дубай-Марина и кадр у Бурдж-Аль-Араб.",
    ["Транспорт", "Гид", "Катание на абре"],
    "Dubai Travel",
  ],
  [
    "exc-atlantis",
    "Аквапарк Atlantis Aquaventure",
    "uae",
    "Дубай",
    "Развлечения",
    "весь день",
    52000,
    4,
    "Горки, ленивая река и аквариум «Затерянные миры».",
    ["Билет", "Шкафчик"],
    "Marina Boats",
  ],
  [
    "exc-transfer-dxb",
    "Трансфер из аэропорта",
    "uae",
    "Дубай",
    "Трансферы",
    "по прилёту",
    22000,
    5,
    "Встреча с табличкой, помощь с багажом, детское кресло по запросу.",
    ["Встреча в зале прилёта", "Ожидание 60 минут"],
    "Dubai Travel",
  ],
  [
    "exc-abudhabi",
    "Мечеть шейха Зайда",
    "uae",
    "Абу-Даби",
    "Экскурсии",
    "10 часов",
    55000,
    6,
    "Мечеть, Etihad Towers и набережная Корниш за один день.",
    ["Транспорт", "Гид", "Входные билеты"],
    "Family Travel",
  ],
  [
    "exc-ferrari",
    "Ferrari World",
    "uae",
    "Абу-Даби",
    "Развлечения",
    "весь день",
    60000,
    7,
    "Парк развлечений с самыми быстрыми аттракционами мира.",
    ["Билет на весь день", "Трансфер по запросу"],
    "Family Travel",
  ],
  [
    "exc-louvre",
    "Лувр Абу-Даби",
    "uae",
    "Абу-Даби",
    "Экскурсии",
    "4 часа",
    28000,
    8,
    "Музей под куполом на воде и прогулка по Саадият.",
    ["Билет", "Гид"],
    "Family Travel",
  ],
  [
    "exc-sharjah",
    "Музеи и рынок Шарджи",
    "uae",
    "Шарджа",
    "Экскурсии",
    "5 часов",
    24000,
    9,
    "Старый рынок, музей исламской цивилизации и набережная.",
    ["Транспорт", "Гид"],
    "Dubai Travel",
  ],
  [
    "exc-jebel",
    "Джебель-Джайс и зиплайн",
    "uae",
    "Рас-эль-Хайма",
    "Развлечения",
    "8 часов",
    89000,
    0,
    "Самая высокая точка ОАЭ и самый длинный зиплайн в мире.",
    ["Трансфер", "Билет на зиплайн"],
    "Marina Boats",
  ],

  [
    "exc-antalya-old",
    "Старый город Калеичи",
    "turkey",
    "Анталия",
    "Экскурсии",
    "4 часа",
    18000,
    4,
    "Порт, узкие улочки, водопад Дюден и вид на море.",
    ["Гид", "Транспорт"],
    "Antalya Holiday",
  ],
  [
    "exc-antalya-yacht",
    "Прогулка по бухте Анталии",
    "turkey",
    "Анталия",
    "Море",
    "3 часа",
    35000,
    1,
    "Яхта вдоль скал, купание и фрукты на борту.",
    ["Капитан", "Напитки"],
    "Aegean Boats",
  ],
  [
    "exc-antalya-land",
    "Земля легенд",
    "turkey",
    "Анталия",
    "Развлечения",
    "весь день",
    42000,
    2,
    "Шоу, горки и аквариум в одном парке.",
    ["Билет", "Трансфер"],
    "Antalya Holiday",
  ],
  [
    "exc-alanya-castle",
    "Крепость Алании и вертолётная площадка",
    "turkey",
    "Алания",
    "Экскурсии",
    "5 часов",
    16000,
    3,
    "Красная башня, верфь и панорама с крепости.",
    ["Гид", "Транспорт"],
    "Alanya Tours",
  ],
  [
    "exc-alanya-boat",
    "Пиратская яхта Клеопатра",
    "turkey",
    "Алания",
    "Море",
    "6 часов",
    22000,
    5,
    "Бухты, пещера влюблённых и обед на борту.",
    ["Обед", "Купание"],
    "Aegean Boats",
  ],
  [
    "exc-kemer-oly",
    "Олимпос и огненная гора",
    "turkey",
    "Кемер",
    "Экскурсии",
    "8 часов",
    26000,
    6,
    "Античный город, черепахи и вечный огонь Янарташ.",
    ["Гид", "Обед"],
    "Antalya Holiday",
  ],
  [
    "exc-kemer-raft",
    "Рафтинг по Кепрюлю",
    "turkey",
    "Кемер",
    "Развлечения",
    "7 часов",
    31000,
    7,
    "Сплав по каньону, обед и фото на финише.",
    ["Снаряжение", "Обед", "Трансфер"],
    "Alanya Tours",
  ],
  [
    "exc-bodrum-castle",
    "Замок Бодрума и музей подводной археологии",
    "turkey",
    "Бодрум",
    "Экскурсии",
    "3 часа",
    19000,
    8,
    "Крепость госпитальеров и античные корабли.",
    ["Билет", "Гид"],
    "Aegean Boats",
  ],
  [
    "exc-bodrum-gulf",
    "Голубой круиз по заливу",
    "turkey",
    "Бодрум",
    "Море",
    "8 часов",
    48000,
    9,
    "Бухты, купание и обед на гулете.",
    ["Обед", "Полотенца"],
    "Aegean Boats",
  ],
  [
    "exc-marmaris-dalyan",
    "Дальян и черепахи каретта",
    "turkey",
    "Мармарис",
    "Экскурсии",
    "10 часов",
    29000,
    0,
    "Река, гробницы в скалах и пляж Иztuzu.",
    ["Лодка", "Обед"],
    "Antalya Holiday",
  ],

  [
    "exc-phuket-phi",
    "Острова Пхи-Пхи",
    "thailand",
    "Пхукет",
    "Море",
    "10 часов",
    58000,
    6,
    "Майя-бей, обезьяний пляж и снорклинг.",
    ["Скоростной катер", "Обед", "Снаряжение"],
    "Andaman Trips",
  ],
  [
    "exc-phuket-old",
    "Старый Пхукет и смотровая",
    "thailand",
    "Пхукет",
    "Экскурсии",
    "5 часов",
    21000,
    2,
    "Китайский квартал, большой Будда и Промтеп мыс.",
    ["Гид", "Транспорт"],
    "Andaman Trips",
  ],
  [
    "exc-phuket-show",
    "Шоу Сиам Нирамит",
    "thailand",
    "Пхукет",
    "Развлечения",
    "4 часа",
    34000,
    3,
    "Вечернее шоу, ужин и трансфер из отеля.",
    ["Билет", "Ужин"],
    "Andaman Trips",
  ],
  [
    "exc-pattaya-alc",
    "Альказар и ночной рынок",
    "thailand",
    "Паттайя",
    "Развлечения",
    "6 часов",
    27000,
    1,
    "Кабаре, прогулка по Walking Street и ужин.",
    ["Билет", "Трансфер"],
    "Gulf Travel",
  ],
  [
    "exc-pattaya-islands",
    "Острова Ко Лан",
    "thailand",
    "Паттайя",
    "Море",
    "8 часов",
    25000,
    5,
    "Кораллы, пляж и обед у моря.",
    ["Катер", "Обед"],
    "Gulf Travel",
  ],
  [
    "exc-krabi-4",
    "Четыре острова Краби",
    "thailand",
    "Краби",
    "Море",
    "7 часов",
    33000,
    7,
    "Рейли, Пода и купание в изумрудной воде.",
    ["Лодка", "Обед"],
    "Andaman Trips",
  ],
  [
    "exc-samui-ang",
    "Анг Тхонг",
    "thailand",
    "Самуи",
    "Море",
    "9 часов",
    62000,
    8,
    "Национальный парк из 40 островов и снорклинг.",
    ["Катер", "Обед"],
    "Gulf Travel",
  ],

  [
    "exc-hurghada-orange",
    "Остров Орандж-бей",
    "egypt",
    "Хургада",
    "Море",
    "8 часов",
    24000,
    7,
    "Риф, обед на острове и снорклинг.",
    ["Лодка", "Обед", "Снаряжение"],
    "Red Sea Club",
  ],
  [
    "exc-hurghada-luxor",
    "Луксор за один день",
    "egypt",
    "Хургада",
    "Экскурсии",
    "16 часов",
    47000,
    4,
    "Карнак, долина царей и храм Хатшепсут.",
    ["Гид", "Обед", "Билеты"],
    "Nile Days",
  ],
  [
    "exc-hurghada-quad",
    "Сафари на квадроциклах",
    "egypt",
    "Хургада",
    "Развлечения",
    "4 часа",
    19000,
    0,
    "Пустыня, бедуинская деревня и закат.",
    ["Квадроцикл", "Чай"],
    "Red Sea Club",
  ],
  [
    "exc-sharm-ras",
    "Рас-Мохаммед",
    "egypt",
    "Шарм-эль-Шейх",
    "Море",
    "8 часов",
    31000,
    8,
    "Нацпарк, рифы и кораллы у самого берега.",
    ["Яхта", "Обед"],
    "Red Sea Club",
  ],
  [
    "exc-sharm-colored",
    "Цветной каньон",
    "egypt",
    "Шарм-эль-Шейх",
    "Экскурсии",
    "9 часов",
    28000,
    9,
    "Скалы Синая и купание у Голубой дыры.",
    ["Гид", "Обед"],
    "Nile Days",
  ],
  [
    "exc-marsa-dolphins",
    "Дельфины Сатигайя",
    "egypt",
    "Марса-Алам",
    "Море",
    "7 часов",
    36000,
    5,
    "Плавание с дельфинами в открытом море.",
    ["Лодка", "Снаряжение"],
    "Red Sea Club",
  ],

  [
    "exc-nha-islands",
    "Острова Винь Хай",
    "vietnam",
    "Нячанг",
    "Море",
    "7 часов",
    23000,
    8,
    "Три острова, обед морепродуктами и снорклинг.",
    ["Катер", "Обед"],
    "Nha Trang Days",
  ],
  [
    "exc-nha-mud",
    "Грязевые источники Тхап Ба",
    "vietnam",
    "Нячанг",
    "Развлечения",
    "4 часа",
    17000,
    2,
    "Минеральные ванны и спа у горячих источников.",
    ["Вход", "Халат"],
    "Nha Trang Days",
  ],
  [
    "exc-phu-sao",
    "Остров Сао и рыбацкая деревня",
    "vietnam",
    "Фукуок",
    "Море",
    "8 часов",
    29000,
    6,
    "Белый песок, ананасовый остров и кальмары на гриле.",
    ["Катер", "Обед"],
    "Phu Quoc Trips",
  ],
  [
    "exc-phu-sunset",
    "Закат в Grand World",
    "vietnam",
    "Фукуок",
    "Развлечения",
    "4 часа",
    15000,
    3,
    "Вечерняя улица, шоу и каналы.",
    ["Трансфер"],
    "Phu Quoc Trips",
  ],
  [
    "exc-danang-bana",
    "Ба На Хиллс и Золотой мост",
    "vietnam",
    "Дананг",
    "Экскурсии",
    "9 часов",
    41000,
    4,
    "Канатная дорога, мост на руках и французская деревня.",
    ["Билет", "Трансфер"],
    "Nha Trang Days",
  ],

  [
    "exc-male-sandbank",
    "Песчаная банка и снорклинг",
    "maldives",
    "Северный Мале Атолл",
    "Море",
    "5 часов",
    78000,
    9,
    "Белый песок посреди океана и риф рядом.",
    ["Катер", "Снаряжение"],
    "Atoll Boats",
  ],
  [
    "exc-male-city",
    "Город Мале и рыбный рынок",
    "maldives",
    "Северный Мале Атолл",
    "Экскурсии",
    "4 часа",
    32000,
    5,
    "Пятничная мечеть, рынок тунца и набережная.",
    ["Гид", "Катер"],
    "Atoll Boats",
  ],
  [
    "exc-ari-whale",
    "Китовые акулы Ари-атолла",
    "maldives",
    "Ари Атолл",
    "Море",
    "6 часов",
    95000,
    8,
    "Поиск китовых акул с гидом-биологом.",
    ["Катер", "Снаряжение"],
    "Atoll Boats",
  ],

  [
    "exc-batumi-botan",
    "Ботанический сад и набережная",
    "georgia",
    "Батуми",
    "Экскурсии",
    "4 часа",
    14000,
    4,
    "Сад на склоне, алфавитная башня и бульвар.",
    ["Гид", "Транспорт"],
    "Geo Travel",
  ],
  [
    "exc-batumi-canyon",
    "Каньон Мартвили и пещера Прометея",
    "georgia",
    "Батуми",
    "Экскурсии",
    "10 часов",
    27000,
    0,
    "Лодка по каньону, купание и подсветка пещеры.",
    ["Билеты", "Обед"],
    "Geo Travel",
  ],
  [
    "exc-tbilisi-old",
    "Старый Тбилиси и серные бани",
    "georgia",
    "Тбилиси",
    "Экскурсии",
    "5 часов",
    16000,
    2,
    "Нарикала, серные бани Абанотубани и канатная дорога.",
    ["Гид", "Канатка"],
    "Geo Travel",
  ],
  [
    "exc-tbilisi-wine",
    "Винный Кахети",
    "georgia",
    "Тбилиси",
    "Развлечения",
    "10 часов",
    35000,
    1,
    "Два винодельни, обед и дегустация.",
    ["Дегустация", "Обед"],
    "Geo Travel",
  ],

  [
    "exc-doha-museum",
    "Музей исламского искусства и Сук-Вакиф",
    "qatar",
    "Доха",
    "Экскурсии",
    "5 часов",
    26000,
    5,
    "Набережная Корниш, рынок и чай в кафе.",
    ["Гид", "Транспорт"],
    "Doha Desk",
  ],
  [
    "exc-doha-desert",
    "Пустыня Инланд Си и закат",
    "qatar",
    "Доха",
    "Развлечения",
    "6 часов",
    48000,
    0,
    "Дюны, фото на Inland Sea и чай бедуинов.",
    ["Джип", "Напитки"],
    "Doha Desk",
  ],
  [
    "exc-doha-transfer",
    "Трансфер из аэропорта Хамад",
    "qatar",
    "Доха",
    "Трансферы",
    "по прилёту",
    18000,
    3,
    "Встреча, Wi-Fi в машине и детское кресло.",
    ["Встреча", "Ожидание 45 минут"],
    "Doha Desk",
  ],

  [
    "exc-bentota-river",
    "Река Бентота и черепахья ферма",
    "srilanka",
    "Бентота",
    "Экскурсии",
    "5 часов",
    21000,
    6,
    "Лодка по манграм, птицы и храм на берегу.",
    ["Лодка", "Гид"],
    "Lanka Days",
  ],
  [
    "exc-hikka-whale",
    "Киты у Хиккадувы",
    "srilanka",
    "Хиккадува",
    "Море",
    "6 часов",
    39000,
    8,
    "Утренний выход в океан к синим китам.",
    ["Катер", "Завтрак"],
    "Lanka Days",
  ],

  [
    "exc-kuta-surf",
    "Урок сёрфа на Куте",
    "indonesia",
    "Кута",
    "Развлечения",
    "2 часа",
    18000,
    1,
    "Инструктор, доска и фото на воде.",
    ["Доска", "Инструктор"],
    "Bali Local",
  ],
  [
    "exc-seminyak-sunset",
    "Закат на пляже Семиньяк",
    "indonesia",
    "Семиньяк",
    "Море",
    "3 часа",
    22000,
    9,
    "Пляж, ужин и боулинг закатного неба.",
    ["Ужин"],
    "Bali Local",
  ],
  [
    "exc-ubud-rice",
    "Рисовые террасы Тегаллаланг",
    "indonesia",
    "Убуд",
    "Экскурсии",
    "6 часов",
    24000,
    4,
    "Террасы, кофелюйя и деревня ремесленников.",
    ["Гид", "Транспорт"],
    "Bali Local",
  ],
  [
    "exc-ubud-swing",
    "Качели над джунглями",
    "indonesia",
    "Убуд",
    "Развлечения",
    "3 часа",
    20000,
    2,
    "Фото на качелях и короткая прогулка по рисовым полям.",
    ["Вход", "Фото"],
    "Bali Local",
  ],
];

/**
 * Демо-каталог отключён: в витрине показываются только реальные экскурсии
 * компаний. `seeds` сохранены как справочный пример структуры данных —
 * чтобы вернуть демо-стенд, замените [] на seeds.map(...) как раньше.
 */
const buildExcursion = (row: (typeof seeds)[number], i: number): Excursion => {
  const photos = excursionGallery(row[0], row[2], i);
  return {
    id: row[0],
    title: row[1],
    destinationId: row[2],
    city: row[3],
    category: row[4],
    duration: row[5],
    price: row[6],
    image: photos[0]!,
    photos,
    summary: row[8],
    includes: row[9],
    company: row[10],
  };
};
void buildExcursion;

export const excursions: Excursion[] = [];

export const excursionCategories: ExcursionCategory[] = [
  "Экскурсии",
  "Развлечения",
  "Море",
  "Трансферы",
];

export function getExcursionCountries() {
  return destinations
    .map((dest) => ({
      ...dest,
      count: excursions.filter((e) => e.destinationId === dest.id).length,
    }))
    .filter((dest) => dest.count > 0);
}

export function getExcursionCities(destinationId: string) {
  const list = excursions.filter((e) => e.destinationId === destinationId);
  const names = [...new Set(list.map((e) => e.city))];
  return names.map((city) => ({
    city,
    count: list.filter((e) => e.city === city).length,
    blurb: resortsByDestination[destinationId]?.find((r) => r.name === city)?.blurb ?? "",
    image: cityCover(destinationId, city, names.indexOf(city)),
  }));
}

export function getCityExcursions(destinationId: string, city: string) {
  return excursions.filter((e) => e.destinationId === destinationId && e.city === city);
}

export function getExcursionStats() {
  const countries = getExcursionCountries();
  return {
    countries: countries.length,
    programs: excursions.length,
    cities: new Set(excursions.map((e) => e.city)).size,
    minPrice: Math.min(...excursions.map((e) => e.price)),
  };
}

/** Популярные программы для витрины на первом шаге. */
export function getFeaturedExcursions(limit = 6) {
  const picked = new Set<string>();
  const out: Excursion[] = [];
  const priority = ["uae", "turkey", "thailand", "egypt", "georgia", "vietnam"];

  for (const destId of priority) {
    const item = excursions.find((e) => e.destinationId === destId && !picked.has(e.id));
    if (!item) continue;
    picked.add(item.id);
    out.push(item);
    if (out.length >= limit) return out;
  }

  for (const item of excursions) {
    if (picked.has(item.id)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export function filterExcursions(
  list: Excursion[],
  query: string,
  category: ExcursionCategory | "Все",
) {
  const q = query.trim().toLowerCase();
  return list.filter((e) => {
    if (category !== "Все" && e.category !== category) return false;
    if (!q) return true;
    const hay =
      `${e.title} ${e.summary} ${e.city} ${e.company} ${e.includes.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

export type ExcursionSort = "recommended" | "price-asc" | "price-desc";

export function sortExcursions(list: Excursion[], sort: ExcursionSort) {
  const out = [...list];
  if (sort === "price-asc") return out.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return out.sort((a, b) => b.price - a.price);
  return out;
}

export const categoryHints: Record<ExcursionCategory, { blurb: string; emoji: string }> = {
  Экскурсии: { blurb: "Гиды, музеи, обзорные маршруты", emoji: "🗺️" },
  Развлечения: { blurb: "Парки, шоу, сафари и активности", emoji: "🎢" },
  Море: { blurb: "Яхты, острова, снорклинг", emoji: "⛵" },
  Трансферы: { blurb: "Аэропорт, отель, между городами", emoji: "🚐" },
};
