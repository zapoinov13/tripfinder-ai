-- ===========================================================================
-- TourGo · применить в Supabase SQL Editor
-- https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new
--
-- ВАЖНО: запускайте ПО ОДНОЙ части. Редактор Supabase выполняет всё
-- содержимое одной транзакцией, и если взять все триггеры разом, они
-- сталкиваются с блокировками работающего приложения — получается deadlock.
-- По частям каждая транзакция короткая и конфликтовать не с чем.
--
-- Порядок частей важен. Повторный запуск любой части безопасен.
-- Если всё же выскочит deadlock — просто запустите эту часть ещё раз.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 1 из 8. Помощники: кто получает уведомление
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

-- Уведомления второй стороне создаёт база, а не браузер отправителя.
--
-- Раньше уведомление партнёру собиралось в браузере туриста и никуда не
-- доходило: RLS пишет только свои строки, а edge-функция push отвечает 403 на
-- чужой userId. То есть турист записывался — и партнёр видел это, только если
-- сам открывал кабинет. Здесь тот же путь делает база: она знает, кто с кем
-- связан, и подделать отправителя нельзя.

-- Кому писать: сотрудники компании.
create or replace function private.org_member_ids(org uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select id from public.profiles
  where organization_id = org
    and role in ('OPERATOR_ADMIN', 'OPERATOR_MANAGER')
    and status = 'active';
$$;

-- Кому писать: платформа.
create or replace function private.platform_admin_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select id from public.profiles
  where role in ('PLATFORM_ADMIN', 'PLATFORM_MANAGER')
    and status = 'active';
$$;

create or replace function private.notify_user(
  target uuid,
  ntype text,
  ntitle text,
  nbody text,
  npayload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if target is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, read, payload)
  values (target, ntype, ntitle, nbody, false, coalesce(npayload, '{}'::jsonb));
end;
$$;

revoke all on function private.org_member_ids(uuid) from public, anon, authenticated;
revoke all on function private.platform_admin_ids() from public, anon, authenticated;
revoke all on function private.notify_user(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Запись клиента в компанию
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 2 из 8. Уведомления по записям клиентов
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

create or replace function private.on_service_request_change()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  member uuid;
  org_name text;
  when_text text;
begin
  select name into org_name from public.organizations where id = new.organization_id;
  when_text := trim(coalesce(new.date, '') || ' ' || coalesce(new.time, ''));

  if tg_op = 'INSERT' then
    -- Партнёру: пришла запись. Это его деньги, он должен узнать сразу.
    for member in select * from private.org_member_ids(new.organization_id) loop
      perform private.notify_user(
        member,
        'service_request',
        'Новая запись',
        coalesce(nullif(new.contact_name, ''), 'Клиент')
          || case when new.listing_name <> '' then ' · ' || new.listing_name else '' end
          || case when when_text <> '' then ' · ' || when_text else '' end,
        jsonb_build_object('requestId', new.id, 'organizationId', new.organization_id)
      );
    end loop;
    return new;
  end if;

  -- Клиенту: компания ответила на его запись.
  if new.status is distinct from old.status then
    perform private.notify_user(
      new.user_id,
      'service_request_status',
      case new.status
        when 'CONFIRMED' then 'Запись подтверждена'
        when 'DECLINED' then 'Запись отклонена'
        when 'CANCELLED' then 'Запись отменена'
        when 'DONE' then 'Визит завершён'
        else 'Статус записи изменён'
      end,
      coalesce(org_name, 'Компания')
        || case when when_text <> '' then ' · ' || when_text else '' end
        || case when coalesce(new.reply_comment, '') <> '' then ' · ' || new.reply_comment else '' end,
      jsonb_build_object('requestId', new.id, 'organizationId', new.organization_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_notify on public.service_requests;
create trigger service_requests_notify
  after insert or update on public.service_requests
  for each row execute function private.on_service_request_change();

-- ---------------------------------------------------------------------------
-- Переписка по записи
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 3 из 8. Уведомления по переписке
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

create or replace function private.on_service_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  member uuid;
  client_id uuid;
  org_name text;
begin
  if new.author_side = 'CLIENT' then
    -- Написал клиент — читают в компании.
    for member in select * from private.org_member_ids(new.organization_id) loop
      perform private.notify_user(
        member,
        'service_message',
        'Сообщение по записи',
        coalesce(nullif(new.author_name, ''), 'Клиент') || ': ' || left(new.text, 120),
        jsonb_build_object('requestId', new.request_id, 'organizationId', new.organization_id)
      );
    end loop;
  else
    -- Ответила компания — читает клиент.
    select user_id into client_id from public.service_requests where id = new.request_id;
    select name into org_name from public.organizations where id = new.organization_id;
    perform private.notify_user(
      client_id,
      'service_message',
      'Ответ компании',
      coalesce(nullif(org_name, ''), 'Компания') || ': ' || left(new.text, 120),
      jsonb_build_object('requestId', new.request_id, 'organizationId', new.organization_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists service_messages_notify on public.service_messages;
create trigger service_messages_notify
  after insert on public.service_messages
  for each row execute function private.on_service_message_insert();

-- ---------------------------------------------------------------------------
-- Предложение турфирмы по заявке на поездку
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 4 из 8. Уведомления по предложениям турфирм
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

create or replace function private.on_request_offer_change()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  tourist_id uuid;
  member uuid;
  org_name text;
begin
  select user_id into tourist_id from public.trip_requests where id = new.request_id;
  select name into org_name from public.organizations where id = new.organization_id;

  if tg_op = 'INSERT' then
    -- Туристу: пришло предложение, есть что сравнивать.
    perform private.notify_user(
      tourist_id,
      'request_offer',
      'Новое предложение',
      coalesce(nullif(org_name, ''), 'Турфирма')
        || case when new.hotel_name <> '' then ' · ' || new.hotel_name else '' end
        || ' · ' || to_char(new.price, 'FM999999999') || ' ' || new.currency,
      jsonb_build_object('requestId', new.request_id, 'offerId', new.id)
    );
    return new;
  end if;

  -- Турфирме: турист выбрал или отказался.
  if new.status is distinct from old.status and new.status in ('CHOSEN', 'DECLINED') then
    for member in select * from private.org_member_ids(new.organization_id) loop
      perform private.notify_user(
        member,
        'request_offer_status',
        case when new.status = 'CHOSEN' then 'Ваше предложение выбрали' else 'Предложение отклонено' end,
        case when new.hotel_name <> '' then new.hotel_name else 'Заявка на поездку' end,
        jsonb_build_object('requestId', new.request_id, 'offerId', new.id)
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists request_offers_notify on public.request_offers;
create trigger request_offers_notify
  after insert or update on public.request_offers
  for each row execute function private.on_request_offer_change();

-- ---------------------------------------------------------------------------
-- Отзыв о компании
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 5 из 8. Уведомления по отзывам
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

create or replace function private.on_company_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  member uuid;
begin
  for member in select * from private.org_member_ids(new.organization_id) loop
    perform private.notify_user(
      member,
      'company_review',
      new.rating || ' из 5 — новый отзыв',
      coalesce(nullif(new.author_name, ''), 'Клиент')
        || case when new.text <> '' then ': ' || left(new.text, 120) else '' end,
      jsonb_build_object('organizationId', new.organization_id, 'reviewId', new.id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists company_reviews_notify on public.company_reviews;
create trigger company_reviews_notify
  after insert on public.company_reviews
  for each row execute function private.on_company_review_insert();

-- ---------------------------------------------------------------------------
-- Заявка «это наша компания»
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 6 из 8. Уведомления по заявкам на компанию
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

create or replace function private.on_company_claim_change()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  admin_id uuid;
  org_name text;
begin
  select name into org_name from public.organizations where id = new.organization_id;

  if tg_op = 'INSERT' then
    for admin_id in select * from private.platform_admin_ids() loop
      perform private.notify_user(
        admin_id,
        'company_claim',
        'Заявка на компанию',
        coalesce(nullif(new.contact_name, ''), 'Владелец')
          || ' просит передать «' || coalesce(org_name, 'компанию') || '»',
        jsonb_build_object('claimId', new.id, 'organizationId', new.organization_id)
      );
    end loop;
    return new;
  end if;

  if new.status is distinct from old.status and new.status in ('APPROVED', 'DECLINED') then
    perform private.notify_user(
      new.user_id,
      'company_claim_status',
      case when new.status = 'APPROVED' then 'Компания передана вам' else 'Заявка на компанию отклонена' end,
      case
        when new.status = 'APPROVED'
          then '«' || coalesce(org_name, 'Компания') || '» теперь ваша: кабинет открыт.'
        else coalesce(nullif(new.decline_reason, ''), 'Не удалось подтвердить связь с компанией.')
      end,
      jsonb_build_object('claimId', new.id, 'organizationId', new.organization_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists company_claims_notify on public.company_claims;
create trigger company_claims_notify
  after insert or update on public.company_claims
  for each row execute function private.on_company_claim_change();

comment on function private.notify_user(uuid, text, text, text, jsonb) is
  'Уведомление второй стороне: пишет база, отправителя подделать нельзя.';


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 7 из 8. Защита переписки: сторона автора не подделывается
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

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


-- ---------------------------------------------------------------------------
-- ЧАСТЬ 8 из 8. Защита записи: статус ставит компания
-- Выделите блок до следующей линии «ЧАСТЬ» и нажмите Run.
-- ---------------------------------------------------------------------------
set lock_timeout = '10s';

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


-- ===========================================================================
-- ПРИЛОЖЕНИЕ (по желанию). Вебхук пуша через SQL вместо кликов в дашборде.
--
-- Делает то же, что Database → Webhooks: на каждую новую строку в
-- notifications дёргает функцию send-push, чтобы уведомление ушло на телефон.
-- Нужно, только если не хотите заполнять форму вебхука руками.
--
-- Перед запуском заменить ДВА значения:
--   ВАШ_СЕКРЕТ    — то же, что в Edge Function Secrets → PUSH_WEBHOOK_SECRET
--   ВАШ_ANON_KEY  — Project Settings → API → anon / publishable key
-- Без Authorization шлюз Supabase не пропустит вызов до функции.
-- ===========================================================================

-- create extension if not exists pg_net with schema extensions;
--
-- drop trigger if exists push_on_notification on public.notifications;
-- create trigger push_on_notification
--   after insert on public.notifications
--   for each row execute function supabase_functions.http_request(
--     'https://mgyufoyornzbwvgdfojb.supabase.co/functions/v1/send-push',
--     'POST',
--     '{"Content-Type":"application/json","x-webhook-secret":"ВАШ_СЕКРЕТ","Authorization":"Bearer ВАШ_ANON_KEY"}',
--     '{}',
--     '5000'
--   );
