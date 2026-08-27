/**
 * Заявки клиентов бизнесу: запись в зал, бронь квартиры или авто.
 *
 * Туровая заявка (trip_requests) не подходит: там отели, ночи и питание.
 * Здесь только дата, время, число человек и контакт — то, что нужно
 * спортзалу, прокату и посуточной аренде.
 *
 * Доступ:
 *  - клиент видит и создаёт свои заявки (гость создаёт без user_id);
 *  - компания видит и обрабатывает заявки, адресованные ей;
 *  - админ платформы видит всё.
 * Телефон клиента — ПДн, поэтому читать заявку может только её автор,
 * адресованная компания и админ; чужим не видно ничего.
 */

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  listing_id text,
  listing_name text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  date text not null default '',
  time text not null default '',
  people integer not null default 1,
  comment text not null default '',
  status text not null default 'NEW'
    check (status in ('NEW', 'CONFIRMED', 'DECLINED', 'DONE', 'CANCELLED')),
  reply_comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_org_idx
  on public.service_requests (organization_id, created_at desc);
create index if not exists service_requests_user_idx
  on public.service_requests (user_id, created_at desc);

alter table public.service_requests enable row level security;

drop policy if exists service_requests_read on public.service_requests;
create policy service_requests_read on public.service_requests for select to authenticated using (
  user_id = auth.uid()
  or organization_id = private.my_org_id()
  or private.is_platform_admin()
);

-- Создать заявку может любой вошедший пользователь, но только от своего имени.
drop policy if exists service_requests_insert on public.service_requests;
create policy service_requests_insert on public.service_requests
  for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);

-- Статус меняет компания (или админ). Клиент может только отменить свою заявку.
drop policy if exists service_requests_update on public.service_requests;
create policy service_requests_update on public.service_requests
  for update to authenticated
  using (
    organization_id = private.my_org_id()
    or private.is_platform_admin()
    or user_id = auth.uid()
  )
  with check (
    organization_id = private.my_org_id()
    or private.is_platform_admin()
    or user_id = auth.uid()
  );

drop policy if exists service_requests_delete on public.service_requests;
create policy service_requests_delete on public.service_requests
  for delete to authenticated
  using (private.is_platform_admin());

grant select, insert, update on public.service_requests to authenticated;
grant all on public.service_requests to service_role;
