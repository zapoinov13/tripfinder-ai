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
};

export const travelScenarios: TravelScenario[] = [
  {
    id: "tours",
    to: "/search",
    title: "Туры",
    navTitle: "Туры",
    hint: "Пакетные туры",
    shortHint: "Пакетные туры",
    icon: Globe2,
  },
  {
    id: "excursions",
    to: "/excursions",
    title: "Экскурсии",
    navTitle: "Экскурсии",
    hint: "Развлечения, билеты, сафари, яхты",
    shortHint: "Сафари и билеты",
    icon: Ticket,
  },
  {
    id: "stays",
    to: "/stays",
    title: "Жильё",
    navTitle: "Жильё",
    hint: "Отели, квартиры, виллы",
    shortHint: "Отели и виллы",
    icon: Home,
  },
  {
    id: "cars",
    to: "/cars",
    title: "Аренда авто",
    shortTitle: "Авто",
    navTitle: "Авто",
    hint: "Машины без водителя",
    shortHint: "Без водителя",
    icon: CarFront,
  },
  {
    id: "sport",
    to: "/sport",
    title: "Спорт",
    navTitle: "Спорт",
    hint: "Залы, тренировки, активности",
    shortHint: "Залы и падел",
    icon: Dumbbell,
  },
  {
    id: "help",
    to: "/assistance",
    title: "Помощь в поездке",
    shortTitle: "Помощь",
    navTitle: "Помощь",
    hint: "Водитель, гид, бронь и другие задачи",
    shortHint: "Водитель и гид",
    icon: LifeBuoy,
  },
];

export const b2bNav = {
  to: "/for-companies" as const,
  title: "Для турфирм",
  hint: "Размещайте свои услуги и получайте клиентов через TourGo",
};
