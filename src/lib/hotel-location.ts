import type { Hotel } from "@/data/demo";

export type GeoPoint = { lat: number; lng: number };

/** Approximate centers for demo cities. Good enough until hotels store real coords. */
const CITY_COORDS: Record<string, GeoPoint> = {
  "uae|Дубай": { lat: 25.2048, lng: 55.2708 },
  "uae|Абу-Даби": { lat: 24.4539, lng: 54.3773 },
  "turkey|Анталия": { lat: 36.8969, lng: 30.7133 },
  "turkey|Аланья": { lat: 36.5438, lng: 31.9998 },
  "turkey|Сиде": { lat: 36.7667, lng: 31.3889 },
  "turkey|Кемер": { lat: 36.5978, lng: 30.5606 },
  "turkey|Бодрум": { lat: 37.0344, lng: 27.4305 },
  "egypt|Хургада": { lat: 27.2579, lng: 33.8116 },
  "egypt|Шарм-эль-Шейх": { lat: 27.9158, lng: 34.33 },
  "thailand|Пхукет": { lat: 7.8804, lng: 98.3923 },
  "thailand|Паттайя": { lat: 12.9236, lng: 100.8825 },
  "thailand|Самуи": { lat: 9.512, lng: 100.0136 },
  "vietnam|Нячанг": { lat: 12.2388, lng: 109.1967 },
  "vietnam|Фукуок": { lat: 10.2899, lng: 103.984 },
  "vietnam|Дананг": { lat: 16.0544, lng: 108.2022 },
  "maldives|Северный Мале Атолл": { lat: 4.1755, lng: 73.5093 },
  "maldives|Баа Атолл": { lat: 5.112, lng: 73.07 },
  "maldives|Ари Атолл": { lat: 3.85, lng: 72.85 },
  "georgia|Батуми": { lat: 41.6168, lng: 41.6367 },
  "georgia|Тбилиси": { lat: 41.7151, lng: 44.8271 },
  "georgia|Гудаури": { lat: 42.476, lng: 44.476 },
  "qatar|Доха": { lat: 25.2854, lng: 51.531 },
  "srilanka|Бентота": { lat: 6.425, lng: 79.9956 },
  "srilanka|Хиккадува": { lat: 6.1395, lng: 80.1063 },
  "indonesia|Кута": { lat: -8.7176, lng: 115.1686 },
  "indonesia|Семиньяк": { lat: -8.691, lng: 115.157 },
  "indonesia|Убуд": { lat: -8.5069, lng: 115.2625 },
};

/** Known demo hotels with real-ish coordinates for a crisp pin. */
const HOTEL_COORDS: Array<{ match: string; point: GeoPoint }> = [
  { match: "rixos premium dubai", point: { lat: 25.0786, lng: 55.1365 } },
  { match: "atlantis the palm", point: { lat: 25.1305, lng: 55.1171 } },
  { match: "burj al arab", point: { lat: 25.1412, lng: 55.1853 } },
  { match: "raffles the palm", point: { lat: 25.1118, lng: 55.139 } },
  { match: "address beach", point: { lat: 25.0789, lng: 55.1334 } },
];

const DISTRICT_BIAS: Array<{ match: string; dLat: number; dLng: number }> = [
  { match: "jumeirah", dLat: 0.02, dLng: -0.04 },
  { match: "marina", dLat: 0.01, dLng: -0.05 },
  { match: "palm", dLat: 0.04, dLng: -0.06 },
  { match: "deira", dLat: 0.03, dLng: 0.02 },
  { match: "lara", dLat: -0.05, dLng: 0.02 },
  { match: "belek", dLat: 0.08, dLng: 0.15 },
];

function cityKey(hotel: Pick<Hotel, "destinationId" | "city">) {
  return `${hotel.destinationId}|${hotel.city}`;
}

function stableJitter(seed: string, span = 0.012): GeoPoint {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const lat = ((h % 1000) / 1000 - 0.5) * span;
  const lng = (((h / 1000) % 1000) / 1000 - 0.5) * span;
  return { lat, lng };
}

export function resolveHotelCoords(hotel: Pick<Hotel, "id" | "name" | "destinationId" | "city" | "district">): GeoPoint {
  const name = hotel.name.toLowerCase();
  for (const row of HOTEL_COORDS) {
    if (name.includes(row.match)) return row.point;
  }

  const base = CITY_COORDS[cityKey(hotel)] ?? { lat: 25.2048, lng: 55.2708 };
  const district = hotel.district.toLowerCase();
  let { lat, lng } = base;
  for (const bias of DISTRICT_BIAS) {
    if (district.includes(bias.match)) {
      lat += bias.dLat;
      lng += bias.dLng;
      break;
    }
  }
  const jitter = stableJitter(hotel.id || hotel.name);
  return { lat: lat + jitter.lat, lng: lng + jitter.lng };
}

export function hotelMapsSearchQuery(hotel: Pick<Hotel, "name" | "district" | "city" | "country">) {
  return [hotel.name, hotel.district, hotel.city, hotel.country].filter(Boolean).join(", ");
}

export function googleMapsUrl(hotel: Pick<Hotel, "name" | "district" | "city" | "country">, point?: GeoPoint) {
  if (point) {
    return `https://www.google.com/maps/search/?api=1&query=${point.lat}%2C${point.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelMapsSearchQuery(hotel))}`;
}

export function openStreetMapUrl(point: GeoPoint) {
  return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=16/${point.lat}/${point.lng}`;
}
