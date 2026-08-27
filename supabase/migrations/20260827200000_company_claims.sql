-- Владелец забирает карточку, которую завела платформа.
--
-- Карточки из витрины созданы по открытым данным: за ними никто не стоит,
-- на записи там могут не ответить. Владелец должен иметь возможность
-- получить кабинет, а платформа — проверить, что это действительно он.
-- Заявка на передачу и есть эта проверка: контакты, чем подтверждает,
-- решение админа.

create table if not exists public.company_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  proof text not null default '',
  status text not null default 'NEW' check (status in ('NEW', 'APPROVED', 'DECLINED')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decline_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_claims_org_idx on public.company_claims (organization_id);
create index if not exists company_claims_user_idx on public.company_claims (user_id);
create index if not exists company_claims_status_idx on public.company_claims (status);

-- Одна открытая заявка на компанию от одного человека.
create unique index if not exists company_claims_open_unique
  on public.company_claims (organization_id, user_id)
  where status = 'NEW';

alter table public.company_claims enable row level security;

-- Заявку подаёт вошедший человек — только от своего имени.
drop policy if exists company_claims_insert on public.company_claims;
create policy company_claims_insert on public.company_claims
  for insert
  with check (user_id = auth.uid());

-- Видит свою заявку её автор; все заявки — админ платформы.
drop policy if exists company_claims_read on public.company_claims;
create policy company_claims_read on public.company_claims
  for select
  using (user_id = auth.uid() or private.is_platform_admin());

-- Решение принимает только платформа: заявитель не может одобрить себя сам.
drop policy if exists company_claims_admin_write on public.company_claims;
create policy company_claims_admin_write on public.company_claims
  for update
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop policy if exists company_claims_admin_delete on public.company_claims;
create policy company_claims_admin_delete on public.company_claims
  for delete
  using (private.is_platform_admin());

grant select, insert on public.company_claims to authenticated;
grant update, delete on public.company_claims to authenticated;

comment on table public.company_claims is
  'Заявки владельцев на передачу карточки, заведённой платформой.';
