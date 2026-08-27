-- Карточки, которые завела сама платформа.
--
-- На старте витрины пустые: пока партнёры не пришли, туристу нечего смотреть,
-- а партнёру незачем приходить. Разрывает круг платформа — заводит реальные
-- места сама, по ссылке на сайт или Instagram. Но такая карточка отличается
-- от той, что ведёт живой партнёр: её никто не подтверждал, на записи никто
-- не отвечает. Это должно быть видно и туристу, и в админке.
--
-- listed_by_platform = true у карточек, созданных админом; у компаний,
-- прошедших регистрацию, поле остаётся false.

alter table public.organizations
  add column if not exists listed_by_platform boolean not null default false;

comment on column public.organizations.listed_by_platform is
  'Карточку завела платформа по ссылке; владелец её ещё не подтвердил.';

-- Витрина показывает пометку и кнопку «Это наша компания», поэтому поле
-- нужно и в публичном представлении.
drop view if exists public.organizations_public;
create view public.organizations_public
with (security_invoker = false)
as
select
  o.id,
  o.name,
  o.city,
  o.country,
  o.about,
  o.services,
  o.languages,
  o.countries,
  o.client_countries,
  o.logo_url,
  o.cover_url,
  o.photos,
  o.videos,
  o.whatsapp,
  o.instagram,
  o.telegram,
  o.website,
  o.phone,
  o.address,
  o.working_hours,
  o.promo_text,
  o.promo_until,
  o.booking_schedule,
  o.status,
  o.created_at,
  o.listed_by_platform
from public.organizations o
where o.status = 'APPROVED';

grant select on public.organizations_public to anon, authenticated;
