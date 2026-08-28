/**
 * Технические ошибки входа и регистрации — человеческим языком.
 *
 * Supabase отвечает по-английски и терминами: «Failed to fetch», «User already
 * registered». Партнёр, который заполнил шесть шагов и упёрся в такое, просто
 * уходит: непонятно, он виноват или сервис, и что делать дальше. Здесь каждая
 * частая ошибка превращается в понятную фразу с подсказкой, что предпринять.
 */

const RULES: { match: RegExp; text: string }[] = [
  {
    match: /failed to fetch|networkerror|network request failed|load failed/i,
    text: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз — данные формы сохранены.",
  },
  {
    match: /user already registered|already been registered|duplicate key.*users/i,
    text: "На эту почту уже есть аккаунт. Войдите — или восстановите пароль.",
  },
  {
    match: /password should be at least|password is too short|weak password/i,
    text: "Пароль слишком короткий: нужно минимум 6 символов.",
  },
  {
    match: /invalid login credentials|invalid email or password/i,
    text: "Неверная почта или пароль.",
  },
  {
    match: /unable to validate email|invalid format|invalid email/i,
    text: "Почта написана с ошибкой. Проверьте адрес.",
  },
  {
    match: /email rate limit|over_email_send_rate_limit|too many requests|rate limit/i,
    text: "Слишком много попыток подряд. Подождите минуту и попробуйте снова.",
  },
  {
    match: /for security purposes.*(\d+) seconds/i,
    text: "Ещё рано: подождите полминуты и повторите.",
  },
  {
    match: /email not confirmed/i,
    text: "Почта не подтверждена. Откройте письмо от TourGo и перейдите по ссылке.",
  },
  {
    match: /signup.*disabled|signups not allowed/i,
    text: "Регистрация временно закрыта. Напишите в поддержку — подключим вручную.",
  },
  {
    match: /already_in_organization/i,
    text: "К этому аккаунту уже привязана компания.",
  },
];

/** Человеческий текст ошибки; если правила не подошли — общий запасной. */
export function humanAuthError(raw: string | null | undefined, fallback: string): string {
  const text = (raw ?? "").trim();
  if (!text) return fallback;
  const rule = RULES.find((r) => r.match.test(text));
  if (rule) return rule.text;
  // Русский текст пришёл от нас же — показываем как есть. Английский технический
  // прячем: он ничего не объясняет тому, кто просто хотел зарегистрироваться.
  return /[а-яё]/i.test(text) ? text : fallback;
}
