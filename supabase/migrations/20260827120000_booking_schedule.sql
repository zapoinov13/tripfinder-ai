/**
 * Расписание и слоты записи для бизнеса.
 *
 * Раньше клиент вписывал любое время руками, а зал сверял его вручную.
 * Теперь компания задаёт часы по дням недели, длину слота и сколько
 * человек принимает одновременно — клиент выбирает из свободных слотов.
 *
 * Формат booking_schedule (jsonb):
 *   {
 *     "enabled": true,
 *     "slotMinutes": 60,
 *     "capacity": 4,
 *     "horizonDays": 30,
 *     "days": { "1": {"open":"08:00","close":"22:00"}, "0": null, ... }
 *   }
 * Ключ дня — номер по getDay(): 0 = воскресенье. null = выходной.
 *
 * Здесь же чиним публичное представление: working_hours, promo_text,
 * promo_until и address в него не попали, поэтому посетитель на другом
 * устройстве не видел ни часов работы, ни кнопки «Маршрут».
 */

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS booking_schedule jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP VIEW IF EXISTS public.organizations_public;

CREATE VIEW public.organizations_public AS
  SELECT
    id,
    name,
    country,
    city,
    address,
    website,
    status,
    plan_code,
    created_at,
    instagram,
    telegram,
    about,
    working_hours,
    promo_text,
    promo_until,
    booking_schedule,
    logo_url,
    cover_url,
    photos,
    videos,
    services,
    countries,
    client_countries,
    languages
  FROM public.organizations
  WHERE status = 'APPROVED';

ALTER VIEW public.organizations_public SET (security_invoker = false);

REVOKE ALL ON public.organizations_public FROM anon;
GRANT SELECT ON public.organizations_public TO anon, authenticated;
