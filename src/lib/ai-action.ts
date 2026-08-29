/**
 * Что нажать после ответа консультанта.
 *
 * Ссылку собирает наш собственный разбор запроса, а не модель. Модель может
 * назвать раздел, которого нет, или адрес, который никуда не ведёт, — и
 * человек упрётся в 404 после хорошего совета. Здесь маршрут строится тем же
 * кодом, что и обычный поиск по сайту: подделать его нельзя, и он всегда
 * ведёт на живые результаты.
 */
import { travelScenarios } from "@/data/scenarios";
import { routeTravelIntent } from "@/lib/scenario-router";

export type ChatAction = {
  to: string;
  search: Record<string, string>;
  label: string;
};

const ACTION_LABEL: Record<string, string> = {
  tours: "Посмотреть туры",
  excursions: "Посмотреть экскурсии",
  stays: "Посмотреть жильё",
  cars: "Посмотреть авто",
  sport: "Посмотреть спорт",
  help: "Оставить заявку",
};

/**
 * Действие по словам человека. Берём последнее осмысленное сообщение: в
 * диалоге уточняют, и «до миллиона» без предыдущей фразы никуда не ведёт —
 * поэтому склеиваем всё, что человек написал.
 */
export function chatAction(userMessages: string[]): ChatAction | null {
  const text = userMessages.join(" ").trim();
  if (text.length < 3) return null;

  const route = routeTravelIntent(text);
  // Адрес однозначно называет сценарий — отдельного разбора не нужно.
  const scenario = travelScenarios.find((s) => s.to === route.to);
  if (!scenario) return null;

  return {
    to: route.to,
    search: route.search ?? {},
    label: ACTION_LABEL[scenario.id] ?? "Посмотреть предложения",
  };
}
