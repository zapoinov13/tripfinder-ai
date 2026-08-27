/**
 * Заявки туристов и предложения турфирм.
 * Применять в Supabase Dashboard → SQL Editor после foundation-миграции.
 * RLS-хелперы живут в private (шаг 3); дублируем здесь для идемпотентности.
 */
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('PLATFORM_ADMIN','PLATFORM_MANAGER') and status = 'active'
  );
$$;

create or replace function private.my_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_platform_admin(), private.my_org_id() to anon, authenticated, service_role;

create table if not exists public.trip_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'tour' check (kind in ('tour', 'assistance')),
  from_city text not null default '',
  destination_id text not null default '',
  destination_label text not null default '',
  date_start text not null default '',
  date_end text not null default '',
  adults int not null default 2,
  children int not null default 0,
  budget numeric not null default 0,
  currency text not null default 'KZT',
  wishes text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  status text not null default 'NEW'
    check (status in ('NEW', 'IN_REVIEW', 'OFFERS_RECEIVED', 'CHOSEN', 'CLOSED')),
  chosen_offer_id uuid,
  declined_by_org_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Профиль турфирмы: чем занимается, где работает, языки, документы, соцсети.
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
  add column if not exists documents text[] not null default '{}',
  add column if not exists verification_submitted_at timestamptz;

create table if not exists public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.trip_requests (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tour_id text references public.tour_offers (id) on delete set null,
  hotel_name text not null default '',
  nights int not null default 7,
  meal text not null default '',
  flight_included boolean not null default true,
  transfer_included boolean not null default true,
  insurance_included boolean not null default true,
  price numeric not null default 0,
  currency text not null default 'KZT',
  includes text not null default '',
  comment text not null default '',
  status text not null default 'SENT' check (status in ('SENT', 'CHOSEN', 'DECLINED')),
  created_at timestamptz not null default now()
);

create index if not exists trip_requests_user_idx on public.trip_requests (user_id);
create index if not exists trip_requests_status_idx on public.trip_requests (status);
create index if not exists request_offers_request_idx on public.request_offers (request_id);
create index if not exists request_offers_org_idx on public.request_offers (organization_id);

alter table public.trip_requests enable row level security;
alter table public.request_offers enable row level security;

-- Турист видит и меняет свои заявки. Проверенные турфирмы видят открытые заявки,
-- чтобы иметь возможность предложить вариант; администратор платформы видит всё.
drop policy if exists trip_requests_read on public.trip_requests;
create policy trip_requests_read on public.trip_requests for select using (
  user_id = auth.uid()
  or private.is_platform_admin()
  or (
    private.my_org_id() is not null
    and status in ('NEW', 'IN_REVIEW', 'OFFERS_RECEIVED')
  )
);

drop policy if exists trip_requests_insert on public.trip_requests;
create policy trip_requests_insert on public.trip_requests for insert with check (user_id = auth.uid());

drop policy if exists trip_requests_update on public.trip_requests;
create policy trip_requests_update on public.trip_requests for update using (
  user_id = auth.uid() or private.is_platform_admin() or private.my_org_id() is not null
);

-- Предложения: видит автор заявки, турфирма-автор предложения и админ.
drop policy if exists request_offers_read on public.request_offers;
create policy request_offers_read on public.request_offers for select using (
  private.is_platform_admin()
  or organization_id = private.my_org_id()
  or exists (
    select 1 from public.trip_requests r
    where r.id = request_offers.request_id and r.user_id = auth.uid()
  )
);

drop policy if exists request_offers_insert on public.request_offers;
create policy request_offers_insert on public.request_offers for insert with check (
  organization_id = private.my_org_id() or private.is_platform_admin()
);

drop policy if exists request_offers_update on public.request_offers;
create policy request_offers_update on public.request_offers for update using (
  private.is_platform_admin()
  or organization_id = private.my_org_id()
  or exists (
    select 1 from public.trip_requests r
    where r.id = request_offers.request_id and r.user_id = auth.uid()
  )
);
