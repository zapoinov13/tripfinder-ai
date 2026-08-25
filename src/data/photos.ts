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
import dubaiHero from "@/assets/dubai-hero.jpg";
import dubaiPalm from "@/assets/dubai-palm.jpg";
import dubaiDowntown from "@/assets/dubai-downtown.jpg";
import dubaiHotelBeach from "@/assets/dubai-hotel-beach.jpg";
import dubaiResortPool from "@/assets/dubai-resort-pool.jpg";
import dubaiJumeirah from "@/assets/dubai-jumeirah-beach.webp";
import dubaiFamily from "@/assets/dubai-family.jpg";
import dubaiYacht from "@/assets/dubai-yacht.jpg";
import dubaiSafari from "@/assets/dubai-safari.jpg";
import dubaiOldCity from "@/assets/dubai-old-city.jpg";

/** Высокое фото с Unsplash: cover для карточек, широкий кадр для героя. */
export const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${Math.round(w * 0.72)}&q=82`;

export const pickPhotos = (pool: string[], salt: number, count: number) => {
  if (!pool.length) return [];
  return Array.from({ length: count }, (_, i) => pool[(salt * 5 + i * 3) % pool.length]!);
};

export const rotate = (pool: string[], salt: number) => {
  if (!pool.length) return pool;
  const i = ((salt % pool.length) + pool.length) % pool.length;
  return [...pool.slice(i), ...pool.slice(0, i)];
};

const luxury = [
  hotel1,
  hotel2,
  hotel3,
  hotel4,
  u("photo-1566073771259-6a8506099945"),
  u("photo-1571003123894-1f0594d2b5d9"),
  u("photo-1582719478250-c89cae4dc85b"),
  u("photo-1540541338287-41700207dee6"),
  u("photo-1520250497591-112f2f40a3f4"),
  u("photo-1582719478250-c89cae4dc85b"),
  u("photo-1571003123894-1f0594d2b5d9"),
  u("photo-1590490360182-c33d57733427"),
  u("photo-1590490360182-c33d57733427"),
  u("photo-1542314831-068cd1dbfeeb"),
  u("photo-1542314831-068cd1dbfeeb"),
  u("photo-1584132967334-10e028bd69f7"),
  u("photo-1445019980597-93fa8acb246c"),
  u("photo-1473496169904-658ba7c44d8a"),
  u("photo-1584132915807-fd1f5fbc078f"),
  u("photo-1414235077428-338989a2e8c0"),
];

const beach = [
  u("photo-1507525428034-b723cf961d3e"),
  u("photo-1510414842594-a61c69b5ae57"),
  u("photo-1519046904884-53103b34b206"),
  u("photo-1475924156734-496f6cac6ec1"),
  u("photo-1505142468610-359e7d316be0"),
  u("photo-1507525428034-b723cf961d3e", 1600),
  u("photo-1476514525535-07fb3b4ae5f1"),
];

export const destGalleries: Record<string, string[]> = {
  uae: [
    destUae,
    dubaiHero,
    dubaiPalm,
    dubaiDowntown,
    dubaiHotelBeach,
    dubaiResortPool,
    dubaiJumeirah,
    dubaiFamily,
    dubaiYacht,
    dubaiSafari,
    dubaiOldCity,
    u("photo-1489515217757-5fd1be406fef"),
    u("photo-1580674684081-7617fbf3d745"),
    u("photo-1577717903315-1691ae25ab3f"),
    u("photo-1580674684081-7617fbf3d745"),
    u("photo-1512632578888-169bbbc64f33"),
    u("photo-1577717903315-1691ae25ab3f"),
    u("photo-1489515217757-5fd1be406fef"),
    ...luxury.slice(0, 6),
  ],
  turkey: [
    destTurkey,
    u("photo-1524231757912-21f4fe3a7200"),
    u("photo-1541432901042-2d8bd64b4a9b"),
    u("photo-1524231757912-21f4fe3a7200"),
    u("photo-1541432901042-2d8bd64b4a9b"),
    u("photo-1566073771259-6a8506099945"),
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1571003123894-1f0594d2b5d9"),
    u("photo-1540541338287-41700207dee6"),
    u("photo-1520250497591-112f2f40a3f4"),
    hotel2,
    hotel3,
    ...beach.slice(0, 4),
  ],
  thailand: [
    destThailand,
    u("photo-1506665531195-3566af2b4dfa"),
    u("photo-1537953773345-d172ccf13cf1"),
    u("photo-1537953773345-d172ccf13cf1"),
    u("photo-1506665531195-3566af2b4dfa"),
    u("photo-1520250497591-112f2f40a3f4"),
    u("photo-1540541338287-41700207dee6"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    u("photo-1510414842594-a61c69b5ae57"),
    hotel1,
    hotel4,
    ...beach,
  ],
  egypt: [
    destEgypt,
    u("photo-1591604129939-f1efa4d9f7fa"),
    u("photo-1451337516015-6b6e9a44a8a3"),
    u("photo-1591604129939-f1efa4d9f7fa"),
    u("photo-1544551763-46a013bb70d5"),
    u("photo-1571003123894-1f0594d2b5d9"),
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1451337516015-6b6e9a44a8a3"),
    u("photo-1473580044384-7ba9967e16a0"),
    hotel3,
    ...luxury.slice(4, 10),
  ],
  vietnam: [
    destVietnam,
    u("photo-1559592413-7cec4d0cae2b"),
    u("photo-1528127269322-539801943592"),
    u("photo-1583417319070-4a69db38a482"),
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1520250497591-112f2f40a3f4"),
    u("photo-1540541338287-41700207dee6"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    hotel2,
    ...luxury.slice(2, 8),
  ],
  maldives: [
    destMaldives,
    u("photo-1439066615861-d1af74d74000"),
    u("photo-1439066615861-d1af74d74000"),
    u("photo-1602002418082-a4443e081dd1"),
    u("photo-1602002418082-a4443e081dd1"),
    u("photo-1540541338287-41700207dee6"),
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1544551763-46a013bb70d5"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    ...luxury.slice(0, 5),
  ],
  georgia: [
    u("photo-1565008576549-57569a49371d"),
    u("photo-1506905925346-21bda4d32df4"),
    u("photo-1524231757912-21f4fe3a7200"),
    destTurkey,
    u("photo-1542314831-068cd1dbfeeb"),
    u("photo-1566073771259-6a8506099945"),
    u("photo-1414235077428-338989a2e8c0"),
    hotel1,
    ...luxury.slice(6, 12),
  ],
  qatar: [
    u("photo-1609137144813-7d9921338f24"),
    u("photo-1609137144813-7d9921338f24"),
    destUae,
    dubaiDowntown,
    u("photo-1489515217757-5fd1be406fef"),
    u("photo-1542314831-068cd1dbfeeb"),
    u("photo-1571003123894-1f0594d2b5d9"),
    u("photo-1451337516015-6b6e9a44a8a3"),
    ...luxury.slice(1, 7),
  ],
  srilanka: [
    u("photo-1540202404-a2f29016b523"),
    u("photo-1540202404-a2f29016b523"),
    destThailand,
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1510414842594-a61c69b5ae57"),
    u("photo-1520250497591-112f2f40a3f4"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    hotel4,
    ...beach,
  ],
  indonesia: [
    u("photo-1537996194471-e657df975ab4"),
    u("photo-1555400038-63f5ba517a47"),
    u("photo-1539367628448-4bc5c9d171c8"),
    destVietnam,
    u("photo-1518548419970-58e3b4079ab2"),
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1520250497591-112f2f40a3f4"),
    u("photo-1540541338287-41700207dee6"),
    hotel1,
    ...luxury.slice(3, 9),
  ],
};

const cityPhotos: Record<string, string> = {
  Дубай: dubaiHero,
  "Абу-Даби": u("photo-1512632578888-169bbbc64f33"),
  Шарджа: dubaiOldCity,
  "Рас-эль-Хайма": dubaiSafari,
  Фуджейра: dubaiHotelBeach,
  Анталия: destTurkey,
  Алания: u("photo-1541432901042-2d8bd64b4a9b"),
  Белек: u("photo-1571003123894-1f0594d2b5d9"),
  Кемер: u("photo-1506905925346-21bda4d32df4"),
  Сиде: u("photo-1541432901042-2d8bd64b4a9b"),
  Мармарис: u("photo-1476514525535-07fb3b4ae5f1"),
  Бодрум: u("photo-1544551763-46a013bb70d5"),
  Пхукет: destThailand,
  Паттайя: u("photo-1506665531195-3566af2b4dfa"),
  Краби: u("photo-1506665531195-3566af2b4dfa"),
  Самуи: u("photo-1439066615861-d1af74d74000"),
  Хургада: destEgypt,
  "Шарм-эль-Шейх": u("photo-1591604129939-f1efa4d9f7fa"),
  "Марса-Алам": u("photo-1544551763-46a013bb70d5"),
  "Эль-Гуна": u("photo-1571003123894-1f0594d2b5d9"),
  Нячанг: destVietnam,
  Фукуок: u("photo-1583417319070-4a69db38a482"),
  Дананг: u("photo-1559592413-7cec4d0cae2b"),
  "Северный Мале Атолл": destMaldives,
  "Баа Атолл": u("photo-1602002418082-a4443e081dd1"),
  "Ари Атолл": u("photo-1439066615861-d1af74d74000"),
  Батуми: u("photo-1565008576549-57569a49371d"),
  Тбилиси: u("photo-1565008576549-57569a49371d", 1200),
  Гудаури: u("photo-1506905925346-21bda4d32df4"),
  Доха: u("photo-1609137144813-7d9921338f24"),
  "Аль-Хор": u("photo-1609137144813-7d9921338f24"),
  Бентота: u("photo-1540202404-a2f29016b523"),
  Хиккадува: u("photo-1540202404-a2f29016b523"),
  Ахунгалла: u("photo-1507525428034-b723cf961d3e"),
  Кута: u("photo-1537996194471-e657df975ab4"),
  Семиньяк: u("photo-1555400038-63f5ba517a47"),
  Убуд: u("photo-1539367628448-4bc5c9d171c8"),
};

export const destinationCover = (id: string) => destGalleries[id]?.[0] ?? destUae;

export const destinationPhotos = (id: string, count = 8) =>
  pickPhotos(destGalleries[id] ?? luxury, 1, count);

export const cityCover = (destinationId: string, city: string, salt = 0) =>
  cityPhotos[city] ??
  destGalleries[destinationId]?.[salt % (destGalleries[destinationId]?.length || 1)] ??
  destUae;

export const hotelPhotos = (destinationId: string, hotelIndex: number, count = 10) => {
  const pool = [...(destGalleries[destinationId] ?? luxury), ...luxury];
  return pickPhotos(pool, hotelIndex + 3, count);
};

const excursionCovers: Record<string, string[]> = {
  "exc-safari": [
    dubaiSafari,
    u("photo-1451337516015-6b6e9a44a8a3"),
    u("photo-1473580044384-7ba9967e16a0"),
    u("photo-1504280390367-361c6d9f38f4"),
  ],
  "exc-yacht": [
    dubaiYacht,
    u("photo-1544551763-46a013bb70d5"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    u("photo-1476514525535-07fb3b4ae5f1"),
  ],
  "exc-burj": [
    dubaiDowntown,
    u("photo-1489515217757-5fd1be406fef"),
    u("photo-1580674684081-7617fbf3d745"),
    u("photo-1489515217757-5fd1be406fef"),
  ],
  "exc-city": [dubaiOldCity, dubaiDowntown, u("photo-1580674684081-7617fbf3d745"), destUae],
  "exc-atlantis": [
    dubaiPalm,
    u("photo-1576678927484-cc907957088c"),
    u("photo-1576013551627-0cc20b96c2a7"),
    dubaiFamily,
  ],
  "exc-transfer-dxb": [dubaiHero, u("photo-1445019980597-93fa8acb246c"), dubaiDowntown],
  "exc-abudhabi": [
    u("photo-1512632578888-169bbbc64f33"),
    destUae,
    u("photo-1609137144813-7d9921338f24"),
  ],
  "exc-ferrari": [
    u("photo-1577717903315-1691ae25ab3f"),
    u("photo-1580674684081-7617fbf3d745"),
    dubaiFamily,
  ],
  "exc-louvre": [
    u("photo-1512632578888-169bbbc64f33"),
    u("photo-1609137144813-7d9921338f24"),
    destUae,
  ],
  "exc-sharjah": [dubaiOldCity, destUae, u("photo-1489515217757-5fd1be406fef")],
  "exc-jebel": [
    u("photo-1506905925346-21bda4d32df4"),
    dubaiSafari,
    u("photo-1451337516015-6b6e9a44a8a3"),
  ],
  "exc-antalya-old": [
    destTurkey,
    u("photo-1524231757912-21f4fe3a7200"),
    u("photo-1541432901042-2d8bd64b4a9b"),
  ],
  "exc-antalya-yacht": [
    u("photo-1544551763-46a013bb70d5"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    destTurkey,
  ],
  "exc-antalya-land": [u("photo-1576678927484-cc907957088c"), dubaiFamily, hotel2],
  "exc-alanya-castle": [
    u("photo-1541432901042-2d8bd64b4a9b"),
    destTurkey,
    u("photo-1541432901042-2d8bd64b4a9b"),
  ],
  "exc-alanya-boat": [
    u("photo-1476514525535-07fb3b4ae5f1"),
    u("photo-1544551763-46a013bb70d5"),
    u("photo-1507525428034-b723cf961d3e"),
  ],
  "exc-kemer-oly": [
    u("photo-1506905925346-21bda4d32df4"),
    destTurkey,
    u("photo-1524231757912-21f4fe3a7200"),
  ],
  "exc-kemer-raft": [
    u("photo-1506905925346-21bda4d32df4"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    destTurkey,
  ],
  "exc-bodrum-castle": [
    u("photo-1541432901042-2d8bd64b4a9b"),
    destTurkey,
    u("photo-1524231757912-21f4fe3a7200"),
  ],
  "exc-bodrum-gulf": [
    u("photo-1544551763-46a013bb70d5"),
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1476514525535-07fb3b4ae5f1"),
  ],
  "exc-marmaris-dalyan": [
    u("photo-1544551763-46a013bb70d5"),
    destTurkey,
    u("photo-1507525428034-b723cf961d3e"),
  ],
  "exc-phuket-phi": [
    u("photo-1506665531195-3566af2b4dfa"),
    destThailand,
    u("photo-1506665531195-3566af2b4dfa"),
  ],
  "exc-phuket-old": [
    u("photo-1537953773345-d172ccf13cf1"),
    destThailand,
    u("photo-1537953773345-d172ccf13cf1"),
  ],
  "exc-phuket-show": [u("photo-1528127269322-539801943592"), destThailand, hotel1],
  "exc-pattaya-alc": [
    u("photo-1506665531195-3566af2b4dfa"),
    destThailand,
    u("photo-1537953773345-d172ccf13cf1"),
  ],
  "exc-pattaya-islands": [
    u("photo-1476514525535-07fb3b4ae5f1"),
    u("photo-1507525428034-b723cf961d3e"),
    destThailand,
  ],
  "exc-krabi-4": [
    u("photo-1506665531195-3566af2b4dfa"),
    u("photo-1506665531195-3566af2b4dfa"),
    destThailand,
  ],
  "exc-samui-ang": [
    u("photo-1439066615861-d1af74d74000"),
    u("photo-1439066615861-d1af74d74000"),
    destThailand,
  ],
  "exc-hurghada-orange": [
    u("photo-1591604129939-f1efa4d9f7fa"),
    destEgypt,
    u("photo-1544551763-46a013bb70d5"),
  ],
  "exc-hurghada-luxor": [
    u("photo-1591604129939-f1efa4d9f7fa"),
    u("photo-1451337516015-6b6e9a44a8a3"),
    destEgypt,
  ],
  "exc-hurghada-quad": [
    u("photo-1451337516015-6b6e9a44a8a3"),
    u("photo-1473580044384-7ba9967e16a0"),
    destEgypt,
  ],
  "exc-sharm-ras": [
    u("photo-1544551763-46a013bb70d5"),
    destEgypt,
    u("photo-1591604129939-f1efa4d9f7fa"),
  ],
  "exc-sharm-colored": [
    u("photo-1451337516015-6b6e9a44a8a3"),
    destEgypt,
    u("photo-1506905925346-21bda4d32df4"),
  ],
  "exc-marsa-dolphins": [
    u("photo-1544551763-46a013bb70d5"),
    destEgypt,
    u("photo-1439066615861-d1af74d74000"),
  ],
  "exc-nha-islands": [
    u("photo-1559592413-7cec4d0cae2b"),
    destVietnam,
    u("photo-1476514525535-07fb3b4ae5f1"),
  ],
  "exc-nha-mud": [u("photo-1584132915807-fd1f5fbc078f"), destVietnam, hotel2],
  "exc-phu-sao": [
    u("photo-1583417319070-4a69db38a482"),
    destVietnam,
    u("photo-1507525428034-b723cf961d3e"),
  ],
  "exc-phu-sunset": [
    u("photo-1528127269322-539801943592"),
    destVietnam,
    u("photo-1510414842594-a61c69b5ae57"),
  ],
  "exc-danang-bana": [
    u("photo-1559592413-7cec4d0cae2b"),
    destVietnam,
    u("photo-1506905925346-21bda4d32df4"),
  ],
  "exc-male-sandbank": [
    destMaldives,
    u("photo-1439066615861-d1af74d74000"),
    u("photo-1439066615861-d1af74d74000"),
  ],
  "exc-male-city": [
    u("photo-1439066615861-d1af74d74000"),
    destMaldives,
    u("photo-1602002418082-a4443e081dd1"),
  ],
  "exc-ari-whale": [
    u("photo-1544551763-46a013bb70d5"),
    destMaldives,
    u("photo-1439066615861-d1af74d74000"),
  ],
  "exc-batumi-botan": [
    u("photo-1565008576549-57569a49371d"),
    destTurkey,
    u("photo-1506905925346-21bda4d32df4"),
  ],
  "exc-batumi-canyon": [
    u("photo-1506905925346-21bda4d32df4"),
    u("photo-1476514525535-07fb3b4ae5f1"),
    destTurkey,
  ],
  "exc-tbilisi-old": [
    u("photo-1565008576549-57569a49371d"),
    destTurkey,
    u("photo-1524231757912-21f4fe3a7200"),
  ],
  "exc-tbilisi-wine": [u("photo-1414235077428-338989a2e8c0"), destTurkey, hotel1],
  "exc-doha-museum": [
    u("photo-1609137144813-7d9921338f24"),
    u("photo-1609137144813-7d9921338f24"),
    destUae,
  ],
  "exc-doha-desert": [
    u("photo-1451337516015-6b6e9a44a8a3"),
    dubaiSafari,
    u("photo-1473580044384-7ba9967e16a0"),
  ],
  "exc-doha-transfer": [
    u("photo-1445019980597-93fa8acb246c"),
    u("photo-1609137144813-7d9921338f24"),
    destUae,
  ],
  "exc-bentota-river": [
    u("photo-1540202404-a2f29016b523"),
    destThailand,
    u("photo-1476514525535-07fb3b4ae5f1"),
  ],
  "exc-hikka-whale": [
    u("photo-1544551763-46a013bb70d5"),
    u("photo-1540202404-a2f29016b523"),
    destThailand,
  ],
  "exc-kuta-surf": [
    u("photo-1507525428034-b723cf961d3e"),
    u("photo-1537996194471-e657df975ab4"),
    destVietnam,
  ],
  "exc-seminyak-sunset": [
    u("photo-1510414842594-a61c69b5ae57"),
    u("photo-1555400038-63f5ba517a47"),
    destVietnam,
  ],
  "exc-ubud-rice": [
    u("photo-1539367628448-4bc5c9d171c8"),
    u("photo-1518548419970-58e3b4079ab2"),
    destVietnam,
  ],
  "exc-ubud-swing": [
    u("photo-1555400038-63f5ba517a47"),
    u("photo-1537996194471-e657df975ab4"),
    destVietnam,
  ],
};

export const excursionGallery = (id: string, destinationId: string, salt = 0) => {
  const own = excursionCovers[id];
  if (own?.length) return own;
  return pickPhotos(destGalleries[destinationId] ?? luxury, salt + 4, 5);
};

export const fallbackGallery = luxury;
