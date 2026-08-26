/**
 * Категории деятельности компании и услуги внутри каждой.
 *
 * Онбординг: сначала выбирается категория, затем услуги только из неё —
 * спортзалу не показываем «Туры», прокату авто не показываем «Сафари».
 * От категорий же зависит список документов на проверке.
 */

export type CompanyCategoryId =
  "tours" | "excursions" | "stays" | "cars" | "sport" | "transfers" | "help";

export type CompanyCategory = {
  id: CompanyCategoryId;
  label: string;
  hint: string;
  services: string[];
};

export const companyCategories: CompanyCategory[] = [
  {
    id: "tours",
    label: "Туры",
    hint: "Пакетные и индивидуальные поездки",
    services: [
      "Пакетные туры",
      "Горящие туры",
      "Индивидуальные туры",
      "Свадебные и медовые туры",
      "Визовая поддержка",
    ],
  },
  {
    id: "excursions",
    label: "Экскурсии и развлечения",
    hint: "Программы на месте отдыха",
    services: [
      "Обзорные экскурсии",
      "Сафари",
      "Морские прогулки и яхты",
      "Билеты в парки и шоу",
      "Необычные развлечения",
    ],
  },
  {
    id: "stays",
    label: "Жильё",
    hint: "Отели, квартиры и виллы",
    services: ["Отели", "Апартаменты", "Квартиры посуточно", "Виллы", "Гостевые дома"],
  },
  {
    id: "cars",
    label: "Аренда авто",
    hint: "Прокат машин без водителя",
    services: [
      "Без депозита",
      "С депозитом (сумма в объявлении)",
      "Аренда от 1 дня",
      "Аренда от 3 дней",
      "Долгосрочная аренда",
      "Доставка в аэропорт",
      "Доставка к отелю",
      "Страховка включена",
      "Безлимитный пробег",
      "Авто с водителем",
    ],
  },
  {
    id: "sport",
    label: "Спорт",
    hint: "Залы, корты и тренировки",
    services: [
      "Тренажёрный зал",
      "Падел",
      "Теннис",
      "Футбольное поле",
      "Баскетбол",
      "Волейбол",
      "Борьба",
      "Бокс",
      "Бассейн",
      "Групповые тренировки",
      "Йога",
      "Аренда площадок",
    ],
  },
  {
    id: "transfers",
    label: "Трансферы",
    hint: "Встречи и перевозки",
    services: [
      "Трансфер из аэропорта",
      "Междугородние трансферы",
      "VIP-транспорт",
      "Детские кресла",
    ],
  },
  {
    id: "help",
    label: "Помощь туристам",
    hint: "Гид, водитель, сопровождение",
    services: [
      "Водитель на день",
      "Русскоговорящий гид",
      "Фотограф",
      "Бронирование билетов",
      "Сопровождение 24/7",
    ],
  },
];

/** Старые названия услуг из ранних версий каталога -> категория. */
const legacyServiceCategory: Record<string, CompanyCategoryId> = {
  Туры: "tours",
  Отели: "stays",
  Экскурсии: "excursions",
  Трансферы: "transfers",
  "Аренда авто": "cars",
  "Индивидуальные поездки": "tours",
  "Помощь туристам на месте": "help",
  Спорт: "sport",
  "Падел и теннис": "sport",
  "Аренда спортплощадок": "sport",
};

const serviceCategoryMap: Map<string, CompanyCategoryId> = new Map([
  ...Object.entries(legacyServiceCategory).map(
    ([service, id]) => [service, id] as [string, CompanyCategoryId],
  ),
  ...companyCategories.flatMap((category) =>
    category.services.map((service) => [service, category.id] as [string, CompanyCategoryId]),
  ),
]);

/** Категории, к которым относятся выбранные услуги (легаси-строки тоже понимаем). */
export function categoriesOfServices(services: string[]): Set<CompanyCategoryId> {
  const out = new Set<CompanyCategoryId>();
  for (const service of services) {
    const id = serviceCategoryMap.get(service);
    if (id) out.add(id);
  }
  return out;
}

/** Туристические категории: для них действуют турлицензия и страховка. */
export const travelCategoryIds: ReadonlySet<CompanyCategoryId> = new Set([
  "tours",
  "excursions",
  "stays",
  "transfers",
  "help",
]);
