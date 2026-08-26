/**
 * Удаление туров и компаний из админки (по-настоящему, в базе).
 *
 * Как и с пользователями: список приезжает из Supabase, поэтому локальное
 * удаление «воскресало» при перезагрузке. RPC-функции удаляют записи в базе.
 *
 * Правила:
 *  - только платформенный админ;
 *  - тур с бронями не удаляем (финансовая история) — скрываем из выдачи;
 *  - при удалении компании: сотрудники становятся туристами, туры без броней
 *    удаляются, туры с бронями скрываются и отвязываются, брони и платежи
 *    остаются (отвязанные), остальное (участники, офферы, переписка, отзывы,
 *    кампании) уходит по каскаду.
 */

create or replace function public.admin_delete_tour(target_tour text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  has_bookings boolean;
  tour_org uuid;
begin
  select operator_org_id into tour_org from public.tour_offers where id = target_tour;
  -- Разрешено платформенному админу и компании-владельцу тура.
  if not private.is_platform_admin()
     and (tour_org is null or tour_org is distinct from private.my_org_id()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select exists (select 1 from public.bookings where tour_offer_id = target_tour)
    into has_bookings;

  if has_bookings then
    update public.tour_offers set status = 'hidden', updated_at = now()
     where id = target_tour;
    return 'archived';
  end if;

  delete from public.tour_offers where id = target_tour;
  return 'deleted';
end;
$$;

create or replace function public.admin_delete_organization(target_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Пропуск защитного триггера профилей: понижение ролей делает админ-функция.
  perform set_config('tourgo.allow_profile_bootstrap', '1', true);
  update public.profiles
     set organization_id = null, role = 'TOURIST', updated_at = now()
   where organization_id = target_org;

  -- Туры без броней удаляем; с бронями — скрываем и отвязываем.
  delete from public.tour_offers t
   where t.operator_org_id = target_org
     and not exists (select 1 from public.bookings b where b.tour_offer_id = t.id);
  update public.tour_offers
     set operator_org_id = null, status = 'hidden', updated_at = now()
   where operator_org_id = target_org;

  -- Финансовая история остаётся, но без ссылки на удалённую компанию.
  update public.bookings set organization_id = null where organization_id = target_org;
  update public.payments set organization_id = null where organization_id = target_org;

  delete from public.organizations where id = target_org;
end;
$$;

revoke all on function public.admin_delete_tour(text) from public, anon;
revoke all on function public.admin_delete_organization(uuid) from public, anon;
grant execute on function public.admin_delete_tour(text) to authenticated, service_role;
grant execute on function public.admin_delete_organization(uuid) to authenticated, service_role;
