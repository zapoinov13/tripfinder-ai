import { CarFront, Dumbbell, Globe2, Home, LifeBuoy, Ticket, type LucideIcon } from "lucide-react";

export type TravelScenarioId = "tours" | "excursions" | "stays" | "cars" | "sport" | "help";

export type TravelScenario = {
  id: TravelScenarioId;
  to: "/search" | "/excursions" | "/stays" | "/cars" | "/sport" | "/assistance";
  title: string;
  shortTitle?: string;
  navTitle: string;
  hint: string;
  shortHint: string;
  icon: LucideIcon;
  /** Градиент чипа иконки: у каждой категории свой цвет для быстрого сканирования. */
  iconBg: string;
};

export const travelScenarios: TravelScenario[] = [
  {
    id: "tours",
    to: "/search",
    title: "Туры",
    navTitle: "Туры",
    hint: "Пакеты от разных компаний, цены рядом",
    shortHint: "Сравнение цен",
    icon: Globe2,
    iconBg: "bg-gradient-to-br from-orange-500 to-red-500",
  },
  {
    id: "excursions",
    to: "/excursions",
    title: "Экскурсии",
    navTitle: "Экскурсии",
    hint: "Сафари, яхты, билеты и парки на месте",
    shortHint: "Сафари и билеты",
    icon: Ticket,
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
  },
  {
    id: "stays",
    to: "/stays",
    title: "Жильё",
    navTitle: "Жильё",
    hint: "Отели, квартиры и виллы под ваш бюджет",
    shortHint: "Отели и виллы",
    icon: Home,
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  {
    id: "cars",
    to: "/cars",
    title: "Аренда авто",
    shortTitle: "Авто",
    navTitle: "Авто",
    hint: "Машины без водителя на нужные даты",
    shortHint: "Без водителя",
    icon: CarFront,
    iconBg: "bg-gradient-to-br from-sky-500 to-blue-600",
  },
  {
    id: "sport",
    to: "/sport",
    title: "Спорт",
    navTitle: "Спорт",
    hint: "Залы, падел, тренировки в поездке",
    shortHint: "Залы и падел",
    icon: Dumbbell,
    iconBg: "bg-gradient-to-br from-lime-500 to-green-600",
  },
  {
    id: "help",
    to: "/assistance",
    title: "Помощь в поездке",
    shortTitle: "Помощь",
    navTitle: "Помощь",
    hint: "Водитель, гид, бронь и срочные задачи",
    shortHint: "Водитель и гид",
    icon: LifeBuoy,
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
  },
];

export const b2bNav = {
  to: "/for-companies" as const,
  title: "Для турфирм",
  hint: "Размещайте услуги и получайте заявки без комиссии туристу",
};
