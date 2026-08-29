-- ===========================================================================
-- TourGo · применить в Supabase SQL Editor
-- https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new
--
-- Одна часть, повторный запуск безопасен. Вставьте целиком и нажмите Run.
-- ===========================================================================

-- Администратор платформы не может завести компанию на свой же аккаунт.
--
-- Раньше register_company молча переписывала роль на OPERATOR_ADMIN кому
-- угодно, включая владельца платформы. Роли взаимоисключающие: админка пускает
-- только PLATFORM_ADMIN, кабинет партнёра — только OPERATOR_ADMIN. То есть
-- владелец, пройдя визард регистрации компании со своего аккаунта, терял
-- админку целиком — и вместе с ней возможность одобрить эту самую компанию.
-- Вернуться можно было только запросом в базу.
--
-- Теперь такая попытка честно отклоняется. Компанию заводят на отдельную почту.

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
    coalesce(p_services, '{}'), 'PENDING_APPROVAL', 'START'
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
