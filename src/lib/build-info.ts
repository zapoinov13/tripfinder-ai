/**
 * Какая сборка сейчас открыта.
 *
 * «Не вижу обновлений» — вопрос без ответа, пока непонятно, что именно
 * открыто: старый кэш в браузере, предыдущий деплой или всё-таки новый код,
 * но с незаметной правкой. Штамп сборки отвечает на это за секунду: он виден
 * в мета-теге страницы и в админке рядом с остальным про систему.
 *
 * Значения подставляет Vercel на сборке (VERCEL_GIT_COMMIT_SHA); локально их
 * нет, и тогда честно пишем «локальная сборка», а не выдумываем номер.
 */

const rawCommit = (import.meta.env["VITE_BUILD_COMMIT"] as string | undefined) ?? "";
const rawTime = (import.meta.env["VITE_BUILD_TIME"] as string | undefined) ?? "";

/** Короткий хэш коммита: тот же, что виден в истории репозитория. */
export const BUILD_COMMIT = rawCommit ? rawCommit.slice(0, 7) : "";

/** Когда собрано, ISO-строка. */
export const BUILD_TIME = rawTime;

/** Человеческая строка для интерфейса и мета-тега. */
export function buildLabel(): string {
  if (!BUILD_COMMIT) return "локальная сборка";
  if (!BUILD_TIME) return BUILD_COMMIT;
  const date = new Date(BUILD_TIME);
  if (Number.isNaN(date.getTime())) return BUILD_COMMIT;
  return `${BUILD_COMMIT} · ${date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
