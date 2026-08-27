/**
 * Переписка туриста с турфирмой по заявке и отзывы о компаниях.
 * Применять в Supabase Dashboard → SQL Editor после 20260821_requests_and_offers.sql.
 */

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.trip_requests (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_side text not null check (author_side in ('TOURIST', 'COMPANY')),
  author_name text not null default '',
  text text not null default '',
  read_by_tourist boolean not null default false,
  read_by_company boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.company_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  request_id uuid references public.trip_requests (id) on delete set null,
  rating int not null default 5 check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now()
);

-- Фото и видео компании: турист выбирает глазами.
alter table public.organizations
  add column if not exists photos text[] not null default '{}',
  add column if not exists videos text[] not null default '{}';

create index if not exists request_messages_thread_idx
  on public.request_messages (request_id, organization_id);
create index if not exists request_messages_user_idx on public.request_messages (user_id);
create index if not exists company_reviews_org_idx on public.company_reviews (organization_id);

alter table public.request_messages enable row level security;
alter table public.company_reviews enable row level security;

-- Переписку видят только её участники: автор заявки и сотрудники турфирмы.
drop policy if exists request_messages_read on public.request_messages;
create policy request_messages_read on public.request_messages for select using (
  user_id = auth.uid() or organization_id = private.my_org_id() or private.is_platform_admin()
);

drop policy if exists request_messages_insert on public.request_messages;
create policy request_messages_insert on public.request_messages for insert with check (
  (author_side = 'TOURIST' and user_id = auth.uid())
  or (author_side = 'COMPANY' and organization_id = private.my_org_id())
  or private.is_platform_admin()
);

drop policy if exists request_messages_update on public.request_messages;
create policy request_messages_update on public.request_messages for update using (
  user_id = auth.uid() or organization_id = private.my_org_id() or private.is_platform_admin()
);

-- Отзывы читают все: турист выбирает компанию по рейтингу.
drop policy if exists company_reviews_read on public.company_reviews;
create policy company_reviews_read on public.company_reviews for select using (true);

drop policy if exists company_reviews_insert on public.company_reviews;
create policy company_reviews_insert on public.company_reviews for insert with check (
  user_id = auth.uid()
);

drop policy if exists company_reviews_update on public.company_reviews;
create policy company_reviews_update on public.company_reviews for update using (
  user_id = auth.uid() or private.is_platform_admin()
);
