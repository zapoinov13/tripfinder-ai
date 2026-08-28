-- Пометку «карточку собрал TourGo» ставит только платформа.
--
-- Флаг решает, показывать ли на странице кнопку «Это наша компания». Если бы
-- партнёр мог поднять его сам, на своей же карточке появилась бы заявка на
-- передачу — и чужой человек мог бы попросить компанию, у которой владелец
-- уже есть. Ставит и снимает флаг только админ платформы.

create or replace function private.guard_org_platform_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if private.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'PENDING_APPROVAL';
    new.plan_code := 'START';
    new.advertising_balance := 0;
    new.promotion_balance := 0;
    new.additional_tour_limit := 0;
    new.listed_by_platform := false;
    return new;
  end if;

  new.status := old.status;
  new.plan_code := old.plan_code;
  new.advertising_balance := old.advertising_balance;
  new.promotion_balance := old.promotion_balance;
  new.additional_tour_limit := old.additional_tour_limit;
  new.listed_by_platform := old.listed_by_platform;
  return new;
end;
$$;
