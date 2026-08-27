-- Деньги пишет только сервер.
--
-- promotions разрешала владельцу компании любые операции (policy ALL), а
-- payments — вставку строк со своим user_id. С валидным токеном партнёр мог
-- вписать себе активную кампанию продвижения напрямую в базу, минуя оплату,
-- и нарисовать «оплачено» в отчётах платформы.
--
-- Теперь покупка идёт через серверную функцию purchasePromotion: она считает
-- цену по platform_config, проверяет принадлежность компании, списывает
-- баланс и создаёт обе строки под service role. Из браузера в эти таблицы
-- можно только читать своё.

-- promotions: чтение своих кампаний остаётся, запись уходит на сервер.
drop policy if exists promotions_org on public.promotions;

create policy promotions_read on public.promotions
  for select
  using (private.is_platform_admin() or organization_id = private.my_org_id());

-- Админ платформы включает продвижение вручную из своей панели.
create policy promotions_admin_write on public.promotions
  for all
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

-- payments: вставка из браузера больше не нужна — записи создаёт сервер.
drop policy if exists payments_insert on public.payments;

create policy payments_admin_insert on public.payments
  for insert
  with check (private.is_platform_admin());

comment on table public.promotions is
  'Кампании продвижения. Покупка — только через серверную функцию purchasePromotion.';
comment on table public.payments is
  'Платежи. Строки создаёт сервер (продвижение, Premium), из браузера доступно чтение своих.';
