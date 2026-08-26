/**
 * Точная статистика платформы для главной страницы админки.
 * Один RPC-вызов вместо демо-данных: пользователи, установки приложения,
 * компании (с услугами для разбивки по категориям), заявки-лиды, брони, выручка.
 * SECURITY DEFINER: считает по всем строкам, но отвечает только платформенным админам.
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

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_platform_admin() to anon, authenticated, service_role;

create or replace function public.admin_overview_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    'users', (
      select jsonb_build_object(
        'total', count(*),
        'tourists', count(*) filter (where role in ('TOURIST','PREMIUM_TOURIST')),
        'premium', count(*) filter (where role = 'PREMIUM_TOURIST'),
        'company_users', count(*) filter (where role in ('OPERATOR_ADMIN','OPERATOR_MANAGER')),
        'admins', count(*) filter (where role in ('PLATFORM_ADMIN','PLATFORM_MANAGER')),
        'suspended', count(*) filter (where status = 'suspended'),
        'new_7d', count(*) filter (where created_at >= now() - interval '7 days'),
        'new_30d', count(*) filter (where created_at >= now() - interval '30 days')
      ) from public.profiles
    ),

    'installs', (
      select jsonb_build_object(
        'total', count(*),
        'ios', count(*) filter (where platform = 'ios'),
        'android', count(*) filter (where platform = 'android'),
        'web', count(*) filter (where platform = 'web'),
        'new_30d', count(*) filter (where created_at >= now() - interval '30 days')
      ) from public.device_tokens
    ),

    'companies', (
      select jsonb_build_object(
        'total', count(*),
        'approved', count(*) filter (where status = 'APPROVED'),
        'pending', count(*) filter (where status = 'PENDING_APPROVAL'),
        'rejected', count(*) filter (where status = 'REJECTED'),
        'suspended', count(*) filter (where status = 'SUSPENDED'),
        'new_30d', count(*) filter (where created_at >= now() - interval '30 days')
      ) from public.organizations
    ),

    'tours', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status = 'active')
      ) from public.tour_offers
    ),

    'bookings', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status not in ('CANCELLED','FAILED')),
        'paid', count(*) filter (where payment_status = 'paid'),
        'gmv', coalesce(sum(price) filter (where status not in ('CANCELLED','FAILED')), 0),
        'paid_sum', coalesce(sum(price) filter (where payment_status = 'paid'), 0),
        'new_30d', count(*) filter (where created_at >= now() - interval '30 days')
      ) from public.bookings
    ),

    'requests', (
      select jsonb_build_object(
        'total', count(*),
        'open', count(*) filter (where status in ('NEW','IN_REVIEW','OFFERS_RECEIVED')),
        'tour', count(*) filter (where kind = 'tour'),
        'assistance', count(*) filter (where kind = 'assistance'),
        'new_30d', count(*) filter (where created_at >= now() - interval '30 days')
      ) from public.trip_requests
    ),

    'offers', (
      select jsonb_build_object('total', count(*)) from public.request_offers
    ),

    'reviews', (
      select jsonb_build_object(
        'total', count(*),
        'avg_rating', coalesce(round(avg(rating)::numeric, 2), 0)
      ) from public.company_reviews
    ),

    'revenue', (
      select coalesce(jsonb_object_agg(p.type, p.total), '{}'::jsonb)
      from (
        select type, sum(amount) as total
        from public.payments
        where status = 'paid'
        group by type
      ) p
    ),

    -- Пер-организационные счётчики: услуги нужны фронту, чтобы разложить
    -- компании по категориям (туры, экскурсии, жильё, авто, спорт и т. д.).
    -- Лид = уникальная заявка, дошедшая до компании (предложение или переписка).
    'organizations', (
      select coalesce(jsonb_agg(org_stat order by org_stat->>'name'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', org.id,
          'name', org.name,
          'status', org.status,
          'city', org.city,
          'services', to_jsonb(coalesce(org.services, '{}'::text[])),
          'created_at', org.created_at,
          'leads', (
            select count(*) from (
              select ro.request_id from public.request_offers ro
              where ro.organization_id = org.id
              union
              select rm.request_id from public.request_messages rm
              where rm.organization_id = org.id
            ) leads
          ),
          'offers', (
            select count(*) from public.request_offers ro where ro.organization_id = org.id
          ),
          'bookings_count', (
            select count(*) from public.bookings b
            where b.organization_id = org.id and b.status not in ('CANCELLED','FAILED')
          ),
          'bookings_sum', (
            select coalesce(sum(b.price), 0) from public.bookings b
            where b.organization_id = org.id and b.status not in ('CANCELLED','FAILED')
          ),
          'reviews', (
            select count(*) from public.company_reviews cr where cr.organization_id = org.id
          ),
          'rating', (
            select coalesce(round(avg(cr.rating)::numeric, 1), 0)
            from public.company_reviews cr where cr.organization_id = org.id
          )
        ) as org_stat
        from public.organizations org
      ) orgs
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_overview_stats() from public, anon;
grant execute on function public.admin_overview_stats() to authenticated, service_role;
