/**
 * Полная очистка демоданных из продакшена.
 *
 * Удаляет: демо-компании сида (Travel Company, Sunrise Tours, Blue Horizon,
 * Nomad Travel, Silk Road Voyage) со всеми их турами и данными, демо-туры
 * сида (id вида tour-N), демо-операторов каталога и всех пользователей
 * @tourgo.demo (вместе с auth-аккаунтами).
 *
 * НЕ трогает: реальных пользователей и компании, справочники (направления,
 * отели), ревью-аккаунты @test.tourgo.app для проверки App Store.
 * Идемпотентно: повторный запуск ничего не ломает.
 */

do $$
declare
  demo_orgs uuid[];
begin
  select array_agg(id) into demo_orgs
    from public.organizations
   where name in ('Travel Company','Sunrise Tours','Blue Horizon','Nomad Travel','Silk Road Voyage');

  if demo_orgs is not null then
    -- Брони ссылаются на туры без каскада: сначала они.
    delete from public.bookings
     where organization_id = any(demo_orgs)
        or tour_offer_id in (select id from public.tour_offers where operator_org_id = any(demo_orgs));
    delete from public.tour_offers where operator_org_id = any(demo_orgs);

    update public.payments set organization_id = null where organization_id = any(demo_orgs);

    perform set_config('tourgo.allow_profile_bootstrap', '1', true);
    update public.profiles set organization_id = null where organization_id = any(demo_orgs);

    -- Участники, офферы, переписка, отзывы, кампании уходят каскадом.
    delete from public.organizations where id = any(demo_orgs);
  end if;
end $$;

-- Демо-туры сида, не привязанные к перечисленным компаниям.
delete from public.bookings where tour_offer_id ~ '^tour-[0-9]+$';
delete from public.tour_offers where id ~ '^tour-[0-9]+$';

-- Демо-операторы каталога (строки op-1..op-5 из сида).
delete from public.operators where id ~ '^op-[0-9]+$'
  and not exists (select 1 from public.tour_offers t where t.operator_id = public.operators.id);

-- Демо-пользователи: удаление auth-записи каскадом сносит профиль,
-- избранное, заявки и прочие пользовательские данные.
delete from auth.users
 where id in (select id from public.profiles where email like '%@tourgo.demo');
delete from public.profiles where email like '%@tourgo.demo';
