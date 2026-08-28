-- Кто написал и кто подтвердил — решает база, а не поле в запросе.
--
-- Нашлось при проверке атакой:
-- 1) в переписке по записи сторону автора (CLIENT/COMPANY) и имя присылал
--    клиент. Значит, турист мог вписать сообщение «от компании» — в общем
--    треде это выглядит как обещание компании, которого та не давала;
-- 2) клиент мог менять свою запись целиком, включая статус. То есть сам себе
--    поставить «Подтверждено» — и партнёр увидел бы в расписании визит,
--    который не подтверждал.

-- ---------------------------------------------------------------------------
-- Переписка: сторона и имя автора — из личности пишущего
-- ---------------------------------------------------------------------------

create or replace function private.guard_service_message()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  actor uuid := auth.uid();
  req_org uuid;
  req_user uuid;
  actor_org uuid;
  actor_name text;
  org_name text;
begin
  -- Служебная роль (edge-функции, миграции) пишет как есть.
  if actor is null then
    return new;
  end if;

  select organization_id, user_id into req_org, req_user
  from public.service_requests where id = new.request_id;
  if req_org is null then
    raise exception 'Тред не найден';
  end if;

  -- Компанию берём из заявки: подставить чужую нельзя.
  new.organization_id := req_org;
  new.user_id := actor;

  select organization_id, name into actor_org, actor_name
  from public.profiles where id = actor;

  if actor_org is not null and actor_org = req_org then
    select name into org_name from public.organizations where id = req_org;
    new.author_side := 'COMPANY';
    new.author_name := coalesce(nullif(org_name, ''), 'Компания');
  elsif req_user is not null and req_user = actor then
    new.author_side := 'CLIENT';
    new.author_name := coalesce(nullif(actor_name, ''), 'Клиент');
  elsif private.is_platform_admin() then
    new.author_side := 'COMPANY';
    new.author_name := 'TourGo';
  else
    raise exception 'Нельзя писать в чужую переписку';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_service_message() from public, anon, authenticated;

drop trigger if exists service_messages_guard on public.service_messages;
create trigger service_messages_guard
  before insert on public.service_messages
  for each row execute function private.guard_service_message();

-- ---------------------------------------------------------------------------
-- Запись: статус ставит компания, клиент может только отменить
-- ---------------------------------------------------------------------------

create or replace function private.guard_service_request_update()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or private.is_platform_admin() then
    return new;
  end if;

  -- Компания у себя хозяйка: подтверждает, переносит, отказывает.
  if old.organization_id = private.my_org_id() then
    new.organization_id := old.organization_id;
    new.user_id := old.user_id;
    return new;
  end if;

  -- Клиент: своя запись, и единственное решение — отменить.
  if old.user_id is not null and old.user_id = actor then
    new.organization_id := old.organization_id;
    new.user_id := old.user_id;
    new.listing_id := old.listing_id;
    new.listing_name := old.listing_name;
    new.date := old.date;
    new.time := old.time;
    new.people := old.people;
    new.reply_comment := old.reply_comment;
    new.created_at := old.created_at;
    if new.status is distinct from old.status and new.status <> 'CANCELLED' then
      new.status := old.status;
    end if;
    return new;
  end if;

  raise exception 'Нет доступа к этой записи';
end;
$$;

revoke all on function private.guard_service_request_update() from public, anon, authenticated;

drop trigger if exists service_requests_guard on public.service_requests;
create trigger service_requests_guard
  before update on public.service_requests
  for each row execute function private.guard_service_request_update();

comment on function private.guard_service_message() is
  'Сторона и имя автора сообщения выводятся из личности пишущего.';
comment on function private.guard_service_request_update() is
  'Статус записи меняет компания; клиенту доступна только отмена.';
