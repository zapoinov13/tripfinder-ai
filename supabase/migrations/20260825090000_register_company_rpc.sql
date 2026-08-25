/**
 * Регистрация компании одной серверной функцией.
 *
 * Клиентский флоу из трёх вставок ломался о RLS:
 *  1. При включённом подтверждении email signUp не возвращает сессию,
 *     и insert в organizations шёл анонимно -> "new row violates RLS".
 *  2. members_write требует, чтобы профиль УЖЕ был в организации.
 *  3. Триггер protect_profile_self_update запрещает самому себе менять
 *     organization_id и роль.
 *
 * SECURITY DEFINER выполняет всё атомарно от владельца таблиц; триггер
 * пропускает изменение по локальному флагу tourgo.allow_profile_bootstrap.
 */

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

-- Триггер самозащиты профиля: пропускаем бутстрап из register_company.
create or replace function public.protect_profile_self_update()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_setting('tourgo.allow_profile_bootstrap', true) = '1' then
    return new;
  end if;
  if auth.uid() is not null and auth.uid() = old.id and not private.is_platform_admin() then
    if new.role is distinct from old.role then
      raise exception 'profile_role_change_forbidden';
    end if;
    if new.status is distinct from old.status then
      raise exception 'profile_status_change_forbidden';
    end if;
    if new.organization_id is distinct from old.organization_id then
      raise exception 'profile_organization_change_forbidden';
    end if;
  end if;
  return new;
end;
$$;
