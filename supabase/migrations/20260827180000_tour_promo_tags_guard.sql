-- Платные теги тура ставит оплаченная кампания, а не сам партнёр.
--
-- Выдача ранжирует туры по тегам: premium даёт +5 к оценке, sponsored +4,
-- есть и отдельная сортировка «Premium». Эти теги должны появляться только
-- после покупки продвижения — их выставляет syncTourPromotionTags по строкам
-- из promotions. Но политика tours_operator_write разрешает владельцу менять
-- свой тур целиком, и триггер модерации следит только за status. То есть
-- партнёр мог одним запросом из браузера выставить себе tags='{premium,
-- sponsored}' и получить платное продвижение даром — в обход и оплаты, и
-- закрытой на запись таблицы promotions.
--
-- Триггер сверяет платные теги с активными кампаниями компании: чего не
-- оплачено, того в тегах не будет. Свободные теги (например hot — горящий
-- тур) партнёр по-прежнему ставит сам.

create or replace function private.guard_tour_promo_tags()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  paid_tags text[] := array['premium', 'sponsored', 'best'];
  allowed text[];
  kept text[];
begin
  -- Админ платформы и служебные операции проходят как есть.
  if auth.uid() is null or private.is_platform_admin() then
    return new;
  end if;

  -- Какие платные теги действительно оплачены активной кампанией на этот тур.
  select coalesce(array_agg(distinct tag), '{}')
    into allowed
  from public.promotions p
  cross join lateral (
    -- Соответствие типов и тегов — как в tagsForPromo (promotions.ts).
    select case p.type
             when 'SPONSORED' then array['sponsored']
             when 'HOME_FEATURE' then array['sponsored']
             when 'PREMIUM_PLACEMENT' then array['premium']
             when 'FEATURED' then array['premium']
             when 'BOOST' then array['best']
             else array[]::text[]
           end as tags
  ) t
  cross join lateral unnest(t.tags) as tag
  where p.tour_offer_id = new.id
    and p.status = 'ACTIVE'
    and p.expires_at > now();

  -- Оставляем свободные теги как есть, платные — только оплаченные.
  select coalesce(array_agg(tag order by tag), '{}')
    into kept
  from unnest(coalesce(new.tags, '{}')) as tag
  where tag <> all (paid_tags) or tag = any (allowed);

  new.tags := kept;
  return new;
end;
$$;

revoke all on function private.guard_tour_promo_tags() from public, anon, authenticated;

drop trigger if exists tour_offers_guard_promo_tags on public.tour_offers;
create trigger tour_offers_guard_promo_tags
  before insert or update on public.tour_offers
  for each row execute function private.guard_tour_promo_tags();

comment on function private.guard_tour_promo_tags() is
  'Платные теги тура (premium, sponsored, best) — только при активной оплаченной кампании.';
