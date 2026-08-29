-- ===========================================================================
-- TourGo · применить в Supabase SQL Editor
-- https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new
--
-- Автоодобрение компаний и отдельный знак «документы проверены».
-- Вставьте целиком и нажмите Run. Повторный запуск безопасен.
-- ===========================================================================

-- Автоодобрение компаний + отдельный знак «документы проверены».
--
-- Раньше status='APPROVED' значил сразу две вещи: «компания может работать» и
-- «документы проверены, ей можно доверять». Пока одобрение было ручным, это
-- сходило: админ смотрел документы и ставил статус. Теперь компания
-- открывается сразу — и если знак доверия оставить на статусе, он окажется у
-- всех подряд и перестанет что-либо значить. Хуже, чем не иметь его вовсе:
-- турист видит «Проверена» там, где никто ничего не проверял.
--
-- Поэтому смыслы разводятся:
--   status = 'APPROVED'      — компания работает, карточка видна;
--   documents_verified_at    — документы посмотрел человек, знак заслужен.

-- 1. Поле под ручную проверку документов.
alter table public.organizations
  add column if not exists documents_verified_at timestamptz,
  add column if not exists documents_verified_by uuid references auth.users (id);

comment on column public.organizations.documents_verified_at is
  'Когда админ платформы подтвердил документы. Знак «Проверена» только по нему.';

-- 2. Партнёр не выдаёт знак себе сам.
create or replace function private.guard_org_platform_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Компания открывается сразу: одобрение больше не ручное. Знак доверия при
    -- этом не выдаётся — за него отвечает documents_verified_at, и его ставит
    -- только админ платформы, посмотрев документы.
    new.status := 'APPROVED';
    new.plan_code := 'START';
    new.advertising_balance := 0;
    new.promotion_balance := 0;
    new.additional_tour_limit := 0;
    new.documents_verified_at := null;
    new.documents_verified_by := null;
    return new;
  end if;

  new.status := old.status;
  new.plan_code := old.plan_code;
  new.advertising_balance := old.advertising_balance;
  new.promotion_balance := old.promotion_balance;
  new.additional_tour_limit := old.additional_tour_limit;
  new.documents_verified_at := old.documents_verified_at;
  new.documents_verified_by := old.documents_verified_by;
  return new;
end;
$$;

-- 3. Регистрация сразу открывает компанию.
create or replace function public.register_company(
  p_name text,
  p_legal_name text default '',
  p_registration_number text default '',
  p_country text default 'Казахстан',
  p_city text default '',
  p_address text default '',
  p_phone text default '',
  p_email text default '',
  p_website text default '',
  p_contact_person text default '',
  p_services text[] default '{}'
)
returns public.organizations
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_org public.organizations;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'company_name_required';
  end if;

  -- Смена роли ниже необратима для владельца платформы: потеряв
  -- PLATFORM_ADMIN, он теряет и доступ к разделу, где эту роль возвращают.
  if exists (
    select 1 from public.profiles
    where id = v_uid and role = 'PLATFORM_ADMIN'
  ) then
    raise exception 'platform_admin_cannot_own_company';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_uid and organization_id is not null
  ) then
    raise exception 'already_in_organization';
  end if;

  insert into public.organizations (
    name, legal_name, registration_number, country, city, address,
    phone, email, website, contact_person, services, status, plan_code
  ) values (
    trim(p_name), coalesce(p_legal_name, ''), coalesce(p_registration_number, ''),
    coalesce(nullif(trim(p_country), ''), 'Казахстан'), coalesce(p_city, ''),
    coalesce(p_address, ''), coalesce(p_phone, ''), coalesce(p_email, ''),
    coalesce(p_website, ''), coalesce(p_contact_person, ''),
    coalesce(p_services, '{}'), 'APPROVED', 'START'
  )
  returning * into v_org;

  perform set_config('tourgo.allow_profile_bootstrap', '1', true);

  update public.profiles
    set role = 'OPERATOR_ADMIN', organization_id = v_org.id
    where id = v_uid;

  if not found then
    insert into public.profiles (id, email, name, city, role, organization_id, status)
    values (
      v_uid,
      coalesce(nullif(p_email, ''), v_uid::text),
      coalesce(nullif(p_contact_person, ''), 'Поставщик'),
      coalesce(nullif(p_city, ''), 'Алматы'),
      'OPERATOR_ADMIN', v_org.id, 'active'
    );
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, v_uid, 'OPERATOR_ADMIN')
  on conflict do nothing;

  return v_org;
end;
$$;

revoke all on function public.register_company(text, text, text, text, text, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.register_company(text, text, text, text, text, text, text, text, text, text, text[]) to authenticated, service_role;

-- 4. Знак проверки виден снаружи: по нему рисуется «Проверена» на карточке.
drop view if exists public.organizations_public;
create view public.organizations_public
with (security_invoker = false)
as
select
  o.id, o.name, o.city, o.country, o.about, o.services, o.languages,
  o.countries, o.client_countries, o.logo_url, o.cover_url, o.photos, o.videos,
  o.whatsapp, o.instagram, o.telegram, o.website, o.phone, o.address,
  o.working_hours, o.promo_text, o.promo_until, o.booking_schedule,
  o.status, o.created_at, o.listed_by_platform,
  o.documents_verified_at
from public.organizations o
where o.status = 'APPROVED';

grant select on public.organizations_public to anon, authenticated;

-- 5. Отдельная функция под знак проверки.
--
-- Нарочно не через общее сохранение организации: пока эта миграция не
-- применена, общий набор полей с новой колонкой уронил бы всё редактирование
-- компании разом. Отдельный вызов до миграции просто честно не находится.
create or replace function public.set_company_documents_verified(
  p_org uuid,
  p_verified boolean
)
returns public.organizations
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_org public.organizations;
begin
  if not private.is_platform_admin() then
    raise exception 'platform_admin_only';
  end if;

  update public.organizations
    set documents_verified_at = case when p_verified then now() else null end,
        documents_verified_by = case when p_verified then auth.uid() else null end
    where id = p_org
    returning * into v_org;

  if v_org.id is null then
    raise exception 'organization_not_found';
  end if;

  return v_org;
end;
$$;

revoke all on function public.set_company_documents_verified(uuid, boolean) from public, anon;
grant execute on function public.set_company_documents_verified(uuid, boolean) to authenticated, service_role;
