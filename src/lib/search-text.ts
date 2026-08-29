/**
 * Сопоставление запроса с текстом: так, как пишут люди.
 *
 * Поиск сравнивал строки подстрокой, и потому не находил ровно то, что ищут
 * чаще всего:
 *
 *   «экскурсии»  — в тексте «экскурсия», подстрока не совпала;
 *   «dubai»      — в тексте «Дубай», разные алфавиты;
 *   «дубаи»      — опечатка в одну букву, ноль результатов;
 *   «машина»     — в тексте «авто», это одно и то же для человека.
 *
 * Здесь каждое слово приводится к ключу: латиница по одной таблице, окончание
 * отброшено. Совпадением считается общее начало ключей — для русского это
 * работает лучше словаря форм: «экскурси|я», «экскурси|и», «экскурси|онный»
 * сходятся сами. Сверху словарь синонимов и допуск на одну опечатку в длинных
 * словах.
 */

const CYR_TO_LAT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Латинские сочетания, которые в кириллице пишутся одной буквой. */
const LAT_FOLD: [RegExp, string][] = [
  [/kh/g, "h"],
  [/ts/g, "c"],
  [/jj/g, "i"],
  [/j/g, "i"],
  [/y(?=[aeiou])/g, ""],
  [/w/g, "v"],
  [/x/g, "ks"],
  [/qu/g, "kv"],
  [/q/g, "k"],
];

/**
 * Слова, которые для человека значат одно и то же.
 *
 * Список маленький намеренно: сюда попадает только то, чем люди реально
 * подменяют наши формулировки. Каждый лишний синоним — это чужие результаты
 * в выдаче, а они хуже, чем их отсутствие.
 */
const SYNONYMS: string[][] = [
  ["авто", "автомобиль", "машина", "тачка", "car"],
  ["аренда", "прокат", "снять", "rent"],
  ["жильё", "жилье", "квартира", "апартаменты", "апарты", "студия", "flat", "apartment"],
  ["отель", "гостиница", "hotel"],
  ["вилла", "дом", "villa"],
  ["экскурсия", "тур по городу", "обзорная", "excursion"],
  ["тур", "путёвка", "путевка", "тур пакет", "package"],
  ["горящий", "горящие", "срочный", "last minute"],
  ["трансфер", "встреча", "такси", "transfer"],
  ["падел", "padel", "падл"],
  ["теннис", "tennis"],
  ["зал", "фитнес", "тренажёрный", "тренажерный", "gym"],
  ["бассейн", "pool"],
  ["яхта", "катер", "лодка", "yacht"],
  ["сафари", "пустыня", "safari"],
  ["гид", "экскурсовод", "guide"],
  ["дубай", "dubai"],
  ["оаэ", "эмираты", "uae"],
  ["абу-даби", "абудаби", "abudhabi"],
];

/** Слово → все его синонимы (включая само слово). */
const SYNONYM_INDEX = new Map<string, string[]>();
for (const group of SYNONYMS) {
  for (const word of group) SYNONYM_INDEX.set(word, group);
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function translit(word: string): string {
  let out = "";
  for (const char of word) out += CYR_TO_LAT[char] ?? char;
  for (const [re, to] of LAT_FOLD) out = out.replace(re, to);
  return out;
}

/**
 * Ключ слова: латиница без окончания.
 *
 * Окончание срезаем осторожно — максимум две гласные с конца и только пока
 * остаётся четыре буквы. Иначе «дубай» превращается в «дуб», и поиск начинает
 * находить деревья.
 */
export function wordKey(word: string): string {
  let key = translit(word.toLowerCase());
  while (key.length > 4 && /[aeiouy]$/.test(key)) {
    const next = key.slice(0, -1);
    if (next.length < 4) break;
    key = next;
    // Больше двух букв не срезаем: дальше начинается уже корень.
    if (word.length - key.length >= 2) break;
  }
  return key;
}

/** Расстояние Левенштейна с ранним выходом: нам хватает ответа «≤ 1». */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const diff = a.length - b.length;
  if (diff > 1 || diff < -1) return false;
  const [long, short] = a.length >= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < long.length && j < short.length) {
    if (long[i] === short[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (long.length === short.length) {
      i += 1;
      j += 1;
    } else {
      i += 1;
    }
  }
  return edits + (long.length - i) + (short.length - j) <= 1;
}

const keysCache = new Map<string, string[]>();

/** Ключи всех слов текста; один и тот же текст считаем один раз. */
export function textKeys(text: string): string[] {
  const cached = keysCache.get(text);
  if (cached) return cached;
  const keys = normalizeSearchText(text)
    .split(/[\s-]+/)
    .filter((word) => word.length >= 2)
    .map(wordKey);
  // Кэш ограничен: каталог большой, а память у телефона нет.
  if (keysCache.size > 4000) keysCache.clear();
  keysCache.set(text, keys);
  return keys;
}

/** Варианты каждого слова запроса: само слово и его синонимы, в ключах. */
export function queryVariants(query: string): string[][] {
  return normalizeSearchText(query)
    .split(/[\s-]+/)
    .filter((word) => word.length >= 2)
    .map((word) => {
      const group = SYNONYM_INDEX.get(word);
      const words = group ? [word, ...group] : [word];
      return [...new Set(words.map(wordKey))];
    })
    .filter((variants) => variants.length > 0);
}

/**
 * Короткое слово теряет окончание не полностью: «яхта» и «яхты» дают ключи
 * `ahta` и `ahty` — обрезать их дальше нельзя (останется три буквы и начнутся
 * ложные попадания), поэтому сравниваем ещё и без последней гласной, но уже
 * на точное равенство.
 */
const trimTail = (key: string) => (key.length >= 4 ? key.replace(/[aeiouy]$/, "") : key);

/** Слово запроса нашлось в тексте: началом, синонимом или с одной опечаткой. */
function hitsWord(variants: string[], keys: string[]): boolean {
  for (const variant of variants) {
    for (const key of keys) {
      if (key.startsWith(variant) || variant.startsWith(key)) return true;
      if (trimTail(variant) === trimTail(key)) return true;
      // Опечатку прощаем только в длинных словах: в коротких она меняет смысл.
      if (variant.length >= 5 && withinOneEdit(variant, key)) return true;
    }
  }
  return false;
}

/** Подходит ли текст запросу: нужны все слова, в любом порядке. */
export function matchesQuery(text: string, query: string): boolean {
  const variants = queryVariants(query);
  if (variants.length === 0) return true;
  const keys = textKeys(text);
  return variants.every((word) => hitsWord(word, keys));
}

/**
 * 0–100: насколько текст отвечает запросу.
 *
 * Точное вхождение фразы всегда выше набора отдельных слов: «морская
 * прогулка» должна опережать карточку, где «морская» и «прогулка» стоят в
 * разных концах описания.
 */
export function relevanceScore(text: string, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;
  const normalizedText = normalizeSearchText(text);
  if (normalizedText.startsWith(normalizedQuery)) return 100;
  if (normalizedText.includes(normalizedQuery)) return 85;

  const variants = queryVariants(query);
  if (variants.length === 0) return 0;
  const keys = textKeys(text);
  const matched = variants.filter((word) => hitsWord(word, keys)).length;
  if (matched === 0) return 0;
  if (matched === variants.length) return 55 + Math.min(30, matched * 8);
  return Math.round((matched / variants.length) * 45);
}
