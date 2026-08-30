/**
 * Запись полей, которых в базе может ещё не быть.
 *
 * Колонки появляются миграциями, а приложение уже выкачено — между этими
 * двумя моментами всегда есть окно. Раньше окно стоило дорого: один лишний
 * ключ в наборе ронял весь запрос, и человек терял вместе с телефоном ещё и
 * имя с городом, которые база приняла бы спокойно.
 *
 * Поэтому пишем с необязательными полями, а на жалобу «нет такой колонки»
 * убираем ту, которую база назвала, и повторяем. Дальше — по кругу, пока
 * либо получится, либо ошибка окажется не про колонки.
 */
export type WriteError = { message: string } | null;

function missingColumn(message: string, columns: string[]): string | undefined {
  if (!/column|not exist|schema cache|42703|PGRST204/i.test(message)) return undefined;
  return columns.find((column) => new RegExp(`\\b${column}\\b`, "i").test(message));
}

export async function writeWithOptional<T extends Record<string, unknown>>(
  base: T,
  optional: Record<string, unknown>,
  run: (payload: Record<string, unknown>) => Promise<{ error: WriteError }>,
): Promise<{ error: WriteError; skipped: string[] }> {
  const pending = { ...optional };
  const skipped: string[] = [];

  for (;;) {
    const { error } = await run({ ...base, ...pending });
    if (!error) return { error: null, skipped };

    const column = missingColumn(error.message, Object.keys(pending));
    if (!column) return { error, skipped };

    delete pending[column];
    skipped.push(column);
  }
}
