/**
 * Объявления бизнесов (спорт, жильё, авто) переезжают из localStorage в базу.
 *
 * До этого «объявления» жили только в браузере владельца компании: другие
 * пользователи их не видели вовсе. Таблица + RLS делают витрины
 * /sport, /stays, /cars общими для всех устройств.
 *
 * Карточка хранится целиком в data (jsonb): набор полей у жилья, авто и
 * спорта разный и продолжит меняться; индексируемые атрибуты вынесены
 * в обычные колонки.
 *
 * Заодно бизнес получает доступ к СВОЕЙ аналитике: события
 * COMPANY_PAGE_VIEW / COMPANY_CONTACT_CLICK / COMPANY_CHECKIN несут
 * payload->>'companyId' — участник организации может читать события
 * своей компании (раньше select был только у админа платформы).
 */

create table if not exists public.vertical_listings (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vertical text not null check (vertical in ('sport', 'stay', 'car')),
  status text not null default 'published' check (status in ('published', 'hidden')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vertical_listings_org_idx on public.vertical_listings (organization_id);
create index if not exists vertical_listings_vertical_idx
  on public.vertical_listings (vertical) where status = 'published';

alter table public.vertical_listings enable row level security;

-- Опубликованные видят все (включая гостей); скрытые — только своя компания и админ.
drop policy if exists vertical_listings_read on public.vertical_listings;
create policy vertical_listings_read on public.vertical_listings for select using (
  status = 'published'
  or organization_id = private.my_org_id()
  or private.is_platform_admin()
);

drop policy if exists vertical_listings_insert on public.vertical_listings;
create policy vertical_listings_insert on public.vertical_listings
  for insert to authenticated
  with check (organization_id = private.my_org_id() or private.is_platform_admin());

drop policy if exists vertical_listings_update on public.vertical_listings;
create policy vertical_listings_update on public.vertical_listings
  for update to authenticated
  using (organization_id = private.my_org_id() or private.is_platform_admin())
  with check (organization_id = private.my_org_id() or private.is_platform_admin());

drop policy if exists vertical_listings_delete on public.vertical_listings;
create policy vertical_listings_delete on public.vertical_listings
  for delete to authenticated
  using (organization_id = private.my_org_id() or private.is_platform_admin());

grant select on public.vertical_listings to anon;
grant select, insert, update, delete on public.vertical_listings to authenticated;
grant all on public.vertical_listings to service_role;

-- Бизнес читает события своей компании (страница, контакты, визиты).
drop policy if exists analytics_org_own on public.analytics_events;
create policy analytics_org_own on public.analytics_events for select to authenticated using (
  payload ->> 'companyId' = private.my_org_id()::text
);
