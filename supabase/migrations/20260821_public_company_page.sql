-- Страница турфирмы должна быть видна туристу до входа: расширяем публичное вью
-- контактами и медиа, но не отдаём юридические данные, документы и балансы.
-- Колонки ниже могли быть добавлены в других миграциях — дублируем здесь, чтобы
-- этот файл можно было выполнить отдельно в SQL Editor без ошибки 42703.
alter table public.organizations
  add column if not exists services text[] not null default '{}',
  add column if not exists countries text[] not null default '{}',
  add column if not exists client_countries text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists about text not null default '',
  add column if not exists logo_url text not null default '',
  add column if not exists cover_url text not null default '',
  add column if not exists whatsapp text not null default '',
  add column if not exists instagram text not null default '',
  add column if not exists telegram text not null default '',
  add column if not exists photos text[] not null default '{}',
  add column if not exists videos text[] not null default '{}';

CREATE OR REPLACE VIEW public.organizations_public AS
  SELECT
    id,
    name,
    country,
    city,
    website,
    status,
    plan_code,
    created_at,
    phone,
    whatsapp,
    instagram,
    telegram,
    about,
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
GRANT SELECT ON public.organizations_public TO anon, authenticated;

-- Фото и описание тура, которые компания добавляет в кабинете.
alter table public.tour_offers
  add column if not exists title text not null default '',
  add column if not exists description text not null default '',
  add column if not exists photos text[] not null default '{}',
  add column if not exists videos text[] not null default '{}';
