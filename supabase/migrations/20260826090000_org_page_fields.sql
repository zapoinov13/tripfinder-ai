/**
 * Публичная страница компании: часы работы и акция.
 *
 * Кабинет бизнеса (спорт, аренда, жильё и т.д.) редактирует эти поля,
 * публичная страница /company/:id показывает их туристам.
 *  - working_hours: свободный текст («Пн-Пт 07:00-23:00, Сб-Вс 09:00-21:00»)
 *  - promo_text: текст текущей акции (что входит, условия)
 *  - promo_until: дата окончания акции в ISO (YYYY-MM-DD), пустая строка = бессрочно
 */

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS working_hours text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS promo_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS promo_until text NOT NULL DEFAULT '';
