-- ===========================================================================
-- TourGo · применить в Supabase SQL Editor
-- https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new
--
-- Категория компании отдельным полем. Вставьте целиком и нажмите Run —
-- внизу появится таблица «часть / итог».
-- ===========================================================================

-- Категория компании — настоящее поле, а не догадка по списку услуг.
--
-- Раньше категорию выводили из услуг: «есть услуга „Прокат машин“ — значит
-- это прокат». Пока услуги спрашивали в анкете, это кое-как работало. Но
-- догадка ломается на пустом списке (компания только зарегистрировалась) и
-- врёт на смешанном (турфирма, которая возит трансферы, вдруг становится
-- перевозчиком). А от категории зависит весь кабинет: какие разделы видно,
-- какие заявки приходят, что показывать на витрине.
--
-- Спортзал не должен видеть «Туры», прокат авто — «Сафари». Это требование к
-- продукту, и держаться оно должно на поле, а не на совпадении строк.

alter table public.organizations
  add column if not exists category text
    check (category is null or category in
      ('tours','excursions','stays','cars','sport','transfers','help'));

comment on column public.organizations.category is
  'Чем занимается компания. От неё зависят разделы кабинета и витрина.';

-- Витрина отдаёт категорию: карточка и фильтры опираются на неё же.
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
  o.documents_verified_at, o.category
from public.organizations o
where o.status = 'APPROVED';

grant select on public.organizations_public to anon, authenticated;

-- Регистрация записывает категорию сразу: компания без неё попадает в кабинет,
-- который не знает, что ей показывать.
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
  p_services text[] default '{}',
  p_category text default null
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

  if exists (
    select 1 from public.profiles where id = v_uid and role = 'PLATFORM_ADMIN'
  ) then
    raise exception 'platform_admin_cannot_own_company';
  end if;

  if exists (
    select 1 from public.profiles where id = v_uid and organization_id is not null
  ) then
    raise exception 'already_in_organization';
  end if;

  insert into public.organizations (
    name, legal_name, registration_number, country, city, address,
    phone, email, website, contact_person, services, status, plan_code, category
  ) values (
    trim(p_name), coalesce(p_legal_name, ''), coalesce(p_registration_number, ''),
    coalesce(nullif(trim(p_country), ''), 'Казахстан'), coalesce(p_city, ''),
    coalesce(p_address, ''), coalesce(p_phone, ''), coalesce(p_email, ''),
    coalesce(p_website, ''), coalesce(p_contact_person, ''),
    coalesce(p_services, '{}'), 'APPROVED', 'START',
    nullif(trim(coalesce(p_category, '')), '')
  )
  returning * into v_org;

  perform set_config('tourgo.allow_profile_bootstrap', '1', true);

  update public.profiles
    set role = 'OPERATOR_ADMIN',
        organization_id = v_org.id,
        city = coalesce(nullif(trim(p_city), ''), city)
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

revoke all on function public.register_company(text, text, text, text, text, text, text, text, text, text, text[], text) from public, anon;
grant execute on function public.register_company(text, text, text, text, text, text, text, text, text, text, text[], text) to authenticated, service_role;

select 'Колонка organizations.category' as "часть",
       case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='organizations' and column_name='category')
       then 'есть' else 'НЕТ' end as "итог"
union all
select 'Витрина отдаёт категорию',
       case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='organizations_public' and column_name='category')
       then 'есть' else 'НЕТ' end
union all
select 'register_company принимает категорию',
       case when to_regprocedure('public.register_company(text,text,text,text,text,text,text,text,text,text,text[],text)') is not null
       then 'есть' else 'НЕТ' end;
