/**
 * Apply in Supabase Dashboard → SQL Editor after foundation migration.
 * Creates demo auth users + profiles + sample catalog rows.
 * Password for all demo users: demo1234
 */
create extension if not exists pgcrypto;

-- Demo organizations
insert into public.organizations (id, name, legal_name, registration_number, country, city, address, phone, email, website, contact_person, status, plan_code)
values
  ('11111111-1111-1111-1111-111111111101', 'Travel Company', 'Travel Company LLP', 'BIN-100000', 'Казахстан', 'Алматы', 'ул. Туристов 1', '+7 701 000 000', 'ops@op-1.demo', 'https://op-1.demo', 'Алишер Оператор', 'APPROVED', 'BUSINESS'),
  ('11111111-1111-1111-1111-111111111105', 'Silk Road Voyage', 'Silk Road Voyage LLP', 'BIN-100004', 'Казахстан', 'Шымкент', 'ул. Туристов 5', '+7 701 000 004', 'ops@op-5.demo', 'https://op-5.demo', 'Новый Оператор', 'PENDING_APPROVAL', 'START')
on conflict (id) do nothing;

-- Auth users (email confirmed). Безопасно перезапускать: если email уже есть в Auth,
-- используем существующего пользователя и только обновляем профиль.
do $$
declare
  u record;
  uid uuid;
begin
  for u in
    select * from (values
      ('aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid, 'tourist@tourgo.demo', 'Айгерим Турист', 'Алматы', 'TOURIST', null::uuid, 'demo1234'),
      ('aaaaaaaa-bbbb-cccc-dddd-000000000002'::uuid, 'premium@tourgo.demo', 'Данияр Premium', 'Астана', 'PREMIUM_TOURIST', null::uuid, 'demo1234'),
      ('aaaaaaaa-bbbb-cccc-dddd-000000000003'::uuid, 'operator@tourgo.demo', 'Алишер Оператор', 'Алматы', 'OPERATOR_ADMIN', '11111111-1111-1111-1111-111111111101'::uuid, 'demo1234'),
      ('aaaaaaaa-bbbb-cccc-dddd-000000000004'::uuid, 'pending@tourgo.demo', 'Новый Оператор', 'Шымкент', 'OPERATOR_ADMIN', '11111111-1111-1111-1111-111111111105'::uuid, 'demo1234'),
      ('aaaaaaaa-bbbb-cccc-dddd-000000000005'::uuid, 'admin@tourgo.demo', 'Admin TourGo', 'Алматы', 'PLATFORM_ADMIN', null::uuid, 'demo1234'),
      ('aaaaaaaa-bbbb-cccc-dddd-000000000007'::uuid, 'zapoinov@bk.ru', 'Юрий Запойнов', 'Алматы', 'PLATFORM_ADMIN', null::uuid, 'zapoinov@bk.ru'),
      ('aaaaaaaa-bbbb-cccc-dddd-000000000006'::uuid, 'manager@tourgo.demo', 'Менеджер Оператор', 'Алматы', 'OPERATOR_MANAGER', '11111111-1111-1111-1111-111111111101'::uuid, 'demo1234')
    ) as t(id, email, name, city, role, org_id, pass)
  loop
    select id into uid from auth.users where email = u.email limit 1;

    if uid is null then
      uid := u.id;
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        uid,
        'authenticated',
        'authenticated',
        u.email,
        crypt(u.pass, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', u.role),
        jsonb_build_object('name', u.name, 'city', u.city),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) values (
        uid, uid,
        jsonb_build_object('sub', uid::text, 'email', u.email, 'email_verified', true),
        'email', uid::text, now(), now(), now()
      ) on conflict do nothing;
    end if;

    insert into public.profiles (id, email, name, city, role, organization_id, status)
    values (uid, u.email, u.name, u.city, u.role, u.org_id, 'active')
    on conflict (id) do update set
      email = excluded.email,
      role = excluded.role,
      organization_id = excluded.organization_id,
      name = excluded.name,
      city = excluded.city;
  end loop;
end $$;

insert into public.organization_members (organization_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111101', 'aaaaaaaa-bbbb-cccc-dddd-000000000003', 'OPERATOR_ADMIN'),
  ('11111111-1111-1111-1111-111111111101', 'aaaaaaaa-bbbb-cccc-dddd-000000000006', 'OPERATOR_MANAGER'),
  ('11111111-1111-1111-1111-111111111105', 'aaaaaaaa-bbbb-cccc-dddd-000000000004', 'OPERATOR_ADMIN')
on conflict do nothing;

insert into public.subscriptions (user_id, plan_id, status, started_at, expires_at, auto_renew)
values (
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'premium-monthly',
  'active',
  now(),
  now() + interval '30 days',
  true
) on conflict do nothing;
