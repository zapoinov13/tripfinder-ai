create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  city text not null default 'Алматы',
  role text not null default 'TOURIST'
    check (role in (
      'TOURIST','PREMIUM_TOURIST','OPERATOR_ADMIN','OPERATOR_MANAGER','PLATFORM_ADMIN','PLATFORM_MANAGER'
    )),
  status text not null default 'active' check (status in ('active','suspended')),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null default '',
  registration_number text not null default '',
  country text not null default 'Казахстан',
  city text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  contact_person text not null default '',
  status text not null default 'PENDING_APPROVAL'
    check (status in ('PENDING_APPROVAL','APPROVED','REJECTED','SUSPENDED')),
  plan_code text not null default 'START' check (plan_code in ('START','BUSINESS','PRO')),
  additional_tour_limit int not null default 0,
  advertising_balance numeric not null default 0,
  promotion_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_organization_id_fkey;
alter table public.profiles
  add constraint profiles_organization_id_fkey
  foreign key (organization_id) references public.organizations (id) on delete set null;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('OPERATOR_ADMIN','OPERATOR_MANAGER')),
  unique (organization_id, user_id)
);

create table if not exists public.platform_config (
  id int primary key default 1 check (id = 1),
  premium_monthly_price numeric not null default 4990,
  premium_currency text not null default 'KZT',
  operator_plans jsonb not null default '[]'::jsonb,
  promotion_prices jsonb not null default '{}'::jsonb,
  ranking_weights jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.destinations (
  id text primary key,
  country text not null,
  city text not null,
  flag text not null default '',
  blurb text not null default '',
  tours_count int not null default 0,
  image_key text not null default 'dest'
);

create table if not exists public.hotels (
  id text primary key,
  name text not null,
  destination_id text not null references public.destinations (id),
  city text not null,
  country text not null,
  flag text not null default '',
  stars int not null default 4,
  rating numeric not null default 8,
  reviews int not null default 0,
  district text not null default '',
  beach_line int not null default 2,
  distance_to_sea int not null default 500,
  amenities text[] not null default '{}',
  image_key text not null default 'hotel-1'
);

create table if not exists public.operators (
  id text primary key,
  name text not null,
  rating numeric not null default 4.5,
  tours_count int not null default 0,
  organization_id uuid references public.organizations (id) on delete set null
);

create table if not exists public.tour_offers (
  id text primary key,
  hotel_id text not null references public.hotels (id),
  operator_id text not null references public.operators (id),
  operator_org_id uuid references public.organizations (id),
  external_id text not null default '',
  room_type text not null default 'Standard Double',
  from_city text not null,
  nights int not null,
  date_start text not null,
  date_end text not null,
  departure date not null,
  meal_code text not null,
  meal text not null,
  price numeric not null,
  old_price numeric,
  premium_price numeric,
  currency text not null default 'KZT',
  tags text[] not null default '{}',
  adults int not null default 2,
  children int not null default 0,
  transfer boolean not null default false,
  views int not null default 0,
  bookings int not null default 0,
  availability int not null default 5,
  status text not null default 'active'
    check (status in ('active','inactive','expired','hidden','blocked')),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tour_offers_status_idx on public.tour_offers (status);
create index if not exists tour_offers_departure_idx on public.tour_offers (departure);
create index if not exists tour_offers_org_idx on public.tour_offers (operator_org_id);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  operator_id text not null,
  organization_id uuid references public.organizations (id),
  tour_offer_id text not null references public.tour_offers (id),
  external_booking_id text,
  status text not null default 'PENDING',
  passengers jsonb not null default '[]'::jsonb,
  price numeric not null,
  currency text not null default 'KZT',
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id),
  amount numeric not null,
  currency text not null default 'KZT',
  type text not null,
  provider text not null default 'mock',
  provider_payment_id text not null,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  plan_id text not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  auto_renew boolean not null default true,
  provider_subscription_id text
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tour_id text not null references public.tour_offers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, tour_id)
);

create table if not exists public.comparisons (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  tour_ids text[] not null default '{}'
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tour_id text not null references public.tour_offers (id) on delete cascade,
  target_price numeric not null,
  current_price numeric not null,
  currency text not null default 'KZT',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id, tour_id)
);

create table if not exists public.ai_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  original_query text not null,
  parsed jsonb not null default '{}'::jsonb,
  search_params jsonb not null default '{}'::jsonb,
  results_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  user_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.operator_api_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null default 'MockOperator',
  endpoint text not null,
  api_key_masked text not null default '****',
  secret_masked text not null default '****',
  api_key_encrypted text not null default '',
  secret_encrypted text not null default '',
  auth_type text not null default 'api_key',
  currency text not null default 'KZT',
  sync_interval_min int not null default 60,
  status text not null default 'disconnected',
  last_sync_at timestamptz,
  last_error text
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null,
  tours_imported int not null default 0,
  tours_updated int not null default 0,
  tours_removed int not null default 0,
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tour_offer_id text not null references public.tour_offers (id) on delete cascade,
  type text not null,
  duration_days int not null,
  price numeric not null,
  currency text not null default 'KZT',
  status text not null default 'ACTIVE',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Grants (PostgREST access)
grant select on public.destinations, public.hotels, public.operators, public.tour_offers, public.platform_config, public.organizations to anon;
grant select, insert, update, delete on
  public.profiles, public.organizations, public.organization_members, public.platform_config,
  public.destinations, public.hotels, public.operators, public.tour_offers,
  public.bookings, public.payments, public.subscriptions, public.favorites, public.comparisons,
  public.price_alerts, public.ai_searches, public.notifications, public.audit_logs,
  public.analytics_events, public.operator_api_connections, public.sync_logs, public.promotions
  to authenticated;
grant all on
  public.profiles, public.organizations, public.organization_members, public.platform_config,
  public.destinations, public.hotels, public.operators, public.tour_offers,
  public.bookings, public.payments, public.subscriptions, public.favorites, public.comparisons,
  public.price_alerts, public.ai_searches, public.notifications, public.audit_logs,
  public.analytics_events, public.operator_api_connections, public.sync_logs, public.promotions
  to service_role;
grant insert on public.analytics_events to anon;

-- Helpers
create or replace function public.current_profile()
returns public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('PLATFORM_ADMIN','PLATFORM_MANAGER') and status = 'active'
  );
$$;

create or replace function public.my_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, city, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'city', 'Алматы'),
    coalesce(new.raw_app_meta_data->>'role', 'TOURIST')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.platform_config enable row level security;
alter table public.destinations enable row level security;
alter table public.hotels enable row level security;
alter table public.operators enable row level security;
alter table public.tour_offers enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.favorites enable row level security;
alter table public.comparisons enable row level security;
alter table public.price_alerts enable row level security;
alter table public.ai_searches enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.operator_api_connections enable row level security;
alter table public.sync_logs enable row level security;
alter table public.promotions enable row level security;

create policy destinations_read on public.destinations for select using (true);
create policy hotels_read on public.hotels for select using (true);
create policy operators_read on public.operators for select using (true);
create policy tours_read on public.tour_offers for select using (
  status = 'active' or public.is_platform_admin() or operator_org_id = public.my_org_id()
);
create policy config_read on public.platform_config for select using (true);
create policy config_admin_write on public.platform_config for update to authenticated using (public.is_platform_admin());

create policy profiles_read_own on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_platform_admin()
);
create policy profiles_update_own on public.profiles for update to authenticated using (
  id = auth.uid() or public.is_platform_admin()
);

create policy orgs_read on public.organizations for select using (
  public.is_platform_admin() or id = public.my_org_id() or status = 'APPROVED'
);
create policy orgs_update on public.organizations for update to authenticated using (
  public.is_platform_admin() or id = public.my_org_id()
);
create policy orgs_insert on public.organizations for insert to authenticated with check (auth.uid() is not null);

create policy members_read on public.organization_members for select to authenticated using (
  public.is_platform_admin() or organization_id = public.my_org_id()
);
create policy members_write on public.organization_members for all to authenticated using (
  public.is_platform_admin() or organization_id = public.my_org_id()
) with check (
  public.is_platform_admin() or organization_id = public.my_org_id()
);

create policy favorites_own on public.favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comparisons_own on public.comparisons for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy alerts_own on public.price_alerts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_own on public.ai_searches for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_own on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy bookings_own_read on public.bookings for select to authenticated using (
  user_id = auth.uid() or public.is_platform_admin() or organization_id = public.my_org_id()
);
create policy bookings_own_insert on public.bookings for insert to authenticated with check (user_id = auth.uid());
create policy bookings_update on public.bookings for update to authenticated using (
  public.is_platform_admin() or organization_id = public.my_org_id() or user_id = auth.uid()
);

create policy payments_read on public.payments for select to authenticated using (
  user_id = auth.uid() or public.is_platform_admin() or organization_id = public.my_org_id()
);
create policy payments_insert on public.payments for insert to authenticated with check (user_id = auth.uid());

create policy subs_read on public.subscriptions for select to authenticated using (
  user_id = auth.uid() or public.is_platform_admin() or organization_id = public.my_org_id()
);

create policy tours_operator_write on public.tour_offers for update to authenticated using (
  public.is_platform_admin() or operator_org_id = public.my_org_id()
);
create policy tours_admin_all on public.tour_offers for insert to authenticated with check (
  public.is_platform_admin() or operator_org_id = public.my_org_id()
);

create policy api_conn_org on public.operator_api_connections for all to authenticated using (
  public.is_platform_admin() or organization_id = public.my_org_id()
) with check (public.is_platform_admin() or organization_id = public.my_org_id());

create policy sync_logs_org on public.sync_logs for select to authenticated using (
  public.is_platform_admin() or organization_id = public.my_org_id()
);
create policy sync_logs_insert on public.sync_logs for insert to authenticated with check (
  public.is_platform_admin() or organization_id = public.my_org_id()
);

create policy promotions_org on public.promotions for all to authenticated using (
  public.is_platform_admin() or organization_id = public.my_org_id()
) with check (public.is_platform_admin() or organization_id = public.my_org_id());

create policy audit_admin on public.audit_logs for select to authenticated using (public.is_platform_admin());
create policy audit_insert on public.audit_logs for insert to authenticated with check (auth.uid() is not null);
create policy analytics_insert on public.analytics_events for insert with check (true);
create policy analytics_admin on public.analytics_events for select to authenticated using (public.is_platform_admin());

insert into public.platform_config (id, premium_monthly_price, premium_currency, operator_plans, promotion_prices, ranking_weights)
values (
  1, 4990, 'KZT',
  '[
    {"code":"START","name":"Start","price":49000,"currency":"KZT","tourLimit":100,"features":["basic analytics","API","basic support"]},
    {"code":"BUSINESS","name":"Business","price":149000,"currency":"KZT","tourLimit":1000,"features":["advanced analytics","promotion tools","featured placements"]},
    {"code":"PRO","name":"Pro","price":349000,"currency":"KZT","tourLimit":5000,"features":["advanced promotion","priority placement","Premium placements"]}
  ]'::jsonb,
  '{"BOOST":15000,"FEATURED":35000,"SPONSORED":55000,"PREMIUM_PLACEMENT":45000,"HOME_FEATURE":75000}'::jsonb,
  '{"relevance":1,"price":1,"quality":1,"rating":1,"availability":1,"conversion":1,"freshness":1,"sponsored":1,"premium":1}'::jsonb
)
on conflict (id) do nothing;