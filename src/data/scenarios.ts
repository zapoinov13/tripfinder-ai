import {
  CarFront,
  Dumbbell,
  Globe2,
  Home,
  LifeBuoy,
  Ticket,
  type LucideIcon,
} from "lucide-react";

export type TravelScenarioId = "tours" | "excursions" | "stays" | "cars" | "sport" | "help";

export type TravelScenario = {
  id: TravelScenarioId;
  to: "/search" | "/excursions" | "/stays" | "/cars" | "/sport" | "/assistance";
  title: string;
  navTitle: string;
  hint: string;
  icon: LucideIcon;
};

export const travelScenarios: TravelScenario[] = [
  {
    id: "tours",
    to: "/search",
    title: "Туры",
    navTitle: "Туры",
    hint: "Пакетные туры",
    icon: Globe2,
  },
  {
    id: "excursions",
    to: "/excursions",
    title: "Экскурсии",
    navTitle: "Экскурсии",
    hint: "Развлечения, билеты, сафари, яхты",
    icon: Ticket,
  },
  {
    id: "stays",
    to: "/stays",
    title: "Жильё",
    navTitle: "Жильё",
    hint: "Отели, квартиры, виллы",
    icon: Home,
  },
  {
    id: "cars",
    to: "/cars",
    title: "Аренда авто",
    navTitle: "Авто",
    hint: "Машины без водителя",
    icon: CarFront,
  },
  {
    id: "sport",
    to: "/sport",
    title: "Спорт",
    navTitle: "Спорт",
    hint: "Залы, тренировки, активности",
    icon: Dumbbell,
  },
  {
    id: "help",
    to: "/assistance",
    title: "Помощь в поездке",
    navTitle: "Помощь",
    hint: "Водитель, гид, бронь и другие задачи",
    icon: LifeBuoy,
  },
];

export const b2bNav = {
  to: "/for-companies" as const,
  title: "Для турфирм",
  hint: "Размещайте свои услуги и получайте клиентов через TourGo",
};
