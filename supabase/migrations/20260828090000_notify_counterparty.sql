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
