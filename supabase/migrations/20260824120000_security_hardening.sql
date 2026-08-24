/**
 * Ужесточение RLS после аудита.
 *
 * Разбор по пунктам:
 *  1. trip_requests  — контакты туристов видят только ОДОБРЕННЫЕ турфирмы.
 *  2. trip_requests  — турфирма больше не может переписывать чужую заявку.
 *  3. request_offers — турист может менять только статус чужого предложения.
 *  4. request_messages — турист не может писать в инбокс произвольной компании.
 *  5. company_reviews — компания правит только свой ответ, не текст отзыва;
 *                       один отзыв на компанию; нельзя отзыв самому себе.
 *  6. device_tokens  — убран OR user_id IS NULL (осиротевшие токены были общими).
 *  7. bookings       — добавлен WITH CHECK: нельзя переназначить владельца/оргу.
 *  8. tour_offers    — оператор не публикует в обход модерации.
 *  9. Зачистка дублирующихся anon-политик.
 */

-- ---------------------------------------------------------------------------
-- 0. Хелпер: организация текущего пользователя, но только если она одобрена,
--    а сам профиль активен.
-- ---------------------------------------------------------------------------
create or replace function private.my_approved_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.organization_id
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid()
    and p.status = 'active'
    and o.status = 'APPROVED';
$$;

grant execute on function private.my_approved_org_id() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Заявки туристов: contact_name / contact_phone — это ПДн.
--    Раньше хватало любого organization_id в профиле, то есть свежая
--    PENDING_APPROVAL-компания выгружала телефоны всех открытых заявок.
-- ---------------------------------------------------------------------------
drop policy if exists trip_requests_read on public.trip_requests;
create policy trip_requests_read on public.trip_requests for select to authenticated using (
  user_id = auth.uid()
  or private.is_platform_admin()
  or (
    private.my_approved_org_id() is not null
    and status in ('NEW', 'IN_REVIEW', 'OFFERS_RECEIVED')
    and not (private.my_approved_org_id() = any (declined_by_org_ids))
  )
);

-- ---------------------------------------------------------------------------
-- 2. Раньше UPDATE не имел WITH CHECK, а USING пускал любую турфирму.
--    Теперь турфирма проходит политику, но триггер ниже разрешает ей трогать
--    только статус и список отказов — контакты и chosen_offer_id закрыты.
-- ---------------------------------------------------------------------------
drop policy if exists trip_requests_update on public.trip_requests;
create policy trip_requests_update on public.trip_requests for update to authenticated
  using (
    user_id = auth.uid()
    or private.is_platform_admin()
    or private.my_approved_org_id() is not null
  )
  with check (
    user_id = auth.uid()
    or private.is_platform_admin()
    or private.my_approved_org_id() is not null
  );

create or replace function public.guard_trip_request_update()
returns trigger language plpgsql set search_path = public, private as $$
begin
  -- Автор заявки, админ и сервисная роль меняют что угодно.
  if auth.uid() is null or auth.uid() = old.user_id or private.is_platform_admin() then
    return new;
  end if;

  -- Турфирма: только реакция на заявку, без доступа к содержимому.
  if new.user_id           is distinct from old.user_id
     or new.kind           is distinct from old.kind
     or new.from_city      is distinct from old.from_city
     or new.destination_id is distinct from old.destination_id
     or new.destination_label is distinct from old.destination_label
     or new.date_start     is distinct from old.date_start
     or new.date_end       is distinct from old.date_end
     or new.adults         is distinct from old.adults
     or new.children       is distinct from old.children
     or new.budget         is distinct from old.budget
     or new.currency       is distinct from old.currency
     or new.wishes         is distinct from old.wishes
     or new.contact_name   is distinct from old.contact_name
     or new.contact_phone  is distinct from old.contact_phone
     or new.chosen_offer_id is distinct from old.chosen_offer_id
  then
    raise exception 'trip_request_field_forbidden';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_trip_request_update on public.trip_requests;
create trigger guard_trip_request_update
  before update on public.trip_requests
  for each row execute function public.guard_trip_request_update();

-- ---------------------------------------------------------------------------
-- 3. Предложения турфирм: автор заявки мог править цену и состав чужого оффера.
--    Оставляем ему только смену статуса (выбрал / отклонил).
-- ---------------------------------------------------------------------------
create or replace function public.guard_request_offer_update()
returns trigger language plpgsql set search_path = public, private as $$
declare
  is_owner boolean;
begin
  if auth.uid() is null or private.is_platform_admin() then
    return new;
  end if;

  -- Автор предложения (сотрудник турфирмы) меняет всё, кроме принадлежности.
  if old.organization_id = private.my_org_id() then
    if new.organization_id is distinct from old.organization_id
       or new.request_id is distinct from old.request_id then
      raise exception 'request_offer_field_forbidden';
    end if;
    return new;
  end if;

  select exists (
    select 1 from public.trip_requests r
    where r.id = old.request_id and r.user_id = auth.uid()
  ) into is_owner;

  if is_owner then
    if new.status is distinct from old.status then
      -- турист вправе только выбрать или отклонить
      if new.status not in ('CHOSEN', 'DECLINED') then
        raise exception 'request_offer_status_forbidden';
      end if;
    end if;
    if (
         new.organization_id is distinct from old.organization_id
      or new.request_id      is distinct from old.request_id
      or new.tour_id         is distinct from old.tour_id
      or new.hotel_name      is distinct from old.hotel_name
      or new.nights          is distinct from old.nights
      or new.meal            is distinct from old.meal
      or new.flight_included is distinct from old.flight_included
      or new.transfer_included is distinct from old.transfer_included
      or new.insurance_included is distinct from old.insurance_included
      or new.price           is distinct from old.price
      or new.currency        is distinct from old.currency
      or new.includes        is distinct from old.includes
      or new.comment         is distinct from old.comment
    ) then
      raise exception 'request_offer_field_forbidden';
    end if;
    return new;
  end if;

  raise exception 'request_offer_update_forbidden';
end;
$$;

drop trigger if exists guard_request_offer_update on public.request_offers;
create trigger guard_request_offer_update
  before update on public.request_offers
  for each row execute function public.guard_request_offer_update();

-- Предложение отправляет только одобренная турфирма.
drop policy if exists request_offers_insert on public.request_offers;
create policy request_offers_insert on public.request_offers for insert to authenticated with check (
  private.is_platform_admin()
  or organization_id = private.my_approved_org_id()
);

-- ---------------------------------------------------------------------------
-- 4. Переписка: раньше туристу хватало user_id = auth.uid(), а
--    organization_id он подставлял любой — то есть писал в инбокс любой компании.
-- ---------------------------------------------------------------------------
drop policy if exists request_messages_insert on public.request_messages;
create policy request_messages_insert on public.request_messages for insert to authenticated with check (
  private.is_platform_admin()
  or (
    author_side = 'TOURIST'
    and user_id = auth.uid()
    and exists (
      select 1 from public.trip_requests r
      where r.id = request_id and r.user_id = auth.uid()
    )
    and exists (
      select 1 from public.request_offers o
      where o.request_id = request_messages.request_id
        and o.organization_id = request_messages.organization_id
    )
  )
  or (
    author_side = 'COMPANY'
    and organization_id = private.my_approved_org_id()
  )
);

-- Правку сообщения оставляем только автору стороны (отметки о прочтении).
drop policy if exists request_messages_update on public.request_messages;
create policy request_messages_update on public.request_messages for update to authenticated
  using (
    user_id = auth.uid()
    or organization_id = private.my_org_id()
    or private.is_platform_admin()
  )
  with check (
    user_id = auth.uid()
    or organization_id = private.my_org_id()
    or private.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 5. Отзывы. Было: любой пишет сколько угодно отзывов кому угодно,
--    а компания правит текст и оценку отзыва о себе.
-- ---------------------------------------------------------------------------
delete from public.company_reviews a
using public.company_reviews b
where a.user_id = b.user_id
  and a.organization_id = b.organization_id
  and a.created_at > b.created_at;

create unique index if not exists company_reviews_one_per_org
  on public.company_reviews (user_id, organization_id);

drop policy if exists company_reviews_insert on public.company_reviews;
create policy company_reviews_insert on public.company_reviews for insert to authenticated with check (
  user_id = auth.uid()
  and organization_id is distinct from private.my_org_id()
);

create or replace function public.guard_company_review_update()
returns trigger language plpgsql set search_path = public, private as $$
begin
  if auth.uid() is null or private.is_platform_admin() then
    return new;
  end if;

  -- Автор отзыва правит свой отзыв, но не ответ компании.
  if auth.uid() = old.user_id then
    if new.reply is distinct from old.reply
       or new.reply_at is distinct from old.reply_at
       or new.reply_by_user_id is distinct from old.reply_by_user_id
       or new.reply_by_name is distinct from old.reply_by_name then
      raise exception 'review_reply_change_forbidden';
    end if;
    return new;
  end if;

  -- Компания добавляет только публичный ответ.
  if old.organization_id = private.my_org_id() then
    if new.rating is distinct from old.rating
       or new.text is distinct from old.text
       or new.user_id is distinct from old.user_id
       or new.author_name is distinct from old.author_name
       or new.organization_id is distinct from old.organization_id
       or new.request_id is distinct from old.request_id then
      raise exception 'review_content_change_forbidden';
    end if;
    return new;
  end if;

  raise exception 'review_update_forbidden';
end;
$$;

drop trigger if exists guard_company_review_update on public.company_reviews;
create trigger guard_company_review_update
  before update on public.company_reviews
  for each row execute function public.guard_company_review_update();

-- Отзывы читают все, но user_id наружу не нужен.
revoke select on public.company_reviews from anon;
grant select (id, organization_id, author_name, rating, text, created_at,
              reply, reply_at, reply_by_name)
  on public.company_reviews to anon;

-- ---------------------------------------------------------------------------
-- 6. device_tokens: OR user_id IS NULL делал осиротевшие токены (FK стоит
--    ON DELETE SET NULL) общедоступными на чтение, изменение и удаление.
-- ---------------------------------------------------------------------------
delete from public.device_tokens where user_id is null;
alter table public.device_tokens alter column user_id set not null;

drop policy if exists "Users manage own device tokens" on public.device_tokens;
create policy "Users manage own device tokens"
  on public.device_tokens for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. bookings: UPDATE был без WITH CHECK — владельца и организацию можно было
--    переназначить. Ценообразование остаётся клиентским (см. отчёт), но
--    перевесить бронь на другого пользователя больше нельзя.
-- ---------------------------------------------------------------------------
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated
  using (
    private.is_platform_admin()
    or organization_id = private.my_org_id()
    or user_id = auth.uid()
  )
  with check (
    private.is_platform_admin()
    or organization_id = private.my_org_id()
    or user_id = auth.uid()
  );

create or replace function public.guard_booking_update()
returns trigger language plpgsql set search_path = public, private as $$
begin
  if auth.uid() is null or private.is_platform_admin() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.organization_id is distinct from old.organization_id
     or new.tour_offer_id is distinct from old.tour_offer_id then
    raise exception 'booking_ownership_change_forbidden';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_booking_update on public.bookings;
create trigger guard_booking_update
  before update on public.bookings
  for each row execute function public.guard_booking_update();

-- ---------------------------------------------------------------------------
-- 8. tour_offers: status по умолчанию 'active', а INSERT/UPDATE открыты
--    оператору — публикация шла мимо модерации. Теперь оператор кладёт тур в
--    'hidden', а админка активирует его существующей кнопкой.
--    Сидирование и импорт под service_role (auth.uid() is null) не трогаем.
-- ---------------------------------------------------------------------------
create or replace function public.guard_tour_moderation()
returns trigger language plpgsql set search_path = public, private as $$
begin
  if auth.uid() is null or private.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'active' then
      new.status := 'hidden';
    end if;
    return new;
  end if;

  -- Оператор не может сам снять блокировку или вернуть тур в витрину.
  if old.status = 'blocked' and new.status is distinct from old.status then
    raise exception 'tour_unblock_forbidden';
  end if;
  if new.status = 'active' and old.status is distinct from 'active' then
    raise exception 'tour_activation_requires_moderation';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_tour_moderation on public.tour_offers;
create trigger guard_tour_moderation
  before insert or update on public.tour_offers
  for each row execute function public.guard_tour_moderation();

drop policy if exists tours_operator_write on public.tour_offers;
create policy tours_operator_write on public.tour_offers for update to authenticated
  using (private.is_platform_admin() or operator_org_id = private.my_org_id())
  with check (private.is_platform_admin() or operator_org_id = private.my_org_id());

-- ---------------------------------------------------------------------------
-- 9. Зачистка: одна и та же anon-политика создавалась в четырёх миграциях
--    подряд под разными именами. Permissive-политики складываются по OR,
--    поэтому лишние имена — источник будущих ошибок.
-- ---------------------------------------------------------------------------
drop policy if exists orgs_read_public on public.organizations;
drop policy if exists orgs_read_public_safe on public.organizations;
drop policy if exists orgs_read_public_safe_cols on public.organizations;
drop policy if exists config_read_public on public.platform_config;
drop policy if exists config_read_public_safe on public.platform_config;
drop policy if exists config_read_public_safe_cols on public.platform_config;
