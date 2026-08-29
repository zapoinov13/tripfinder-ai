/**
 * Свой счётчик посещаемости: сводка считается в базе.
 *
 * Просмотров страниц на порядок больше остальных событий, и тянуть их в
 * браузер админа, чтобы там сложить, — значит ждать загрузки десятков тысяч
 * строк ради двух десятков цифр. База складывает их сама и отдаёт готовый
 * ответ.
 *
 * Читать посещаемость может только администратор платформы: это данные обо
 * всех посетителях сайта, а не о своей компании.
 */

-- Частичный индекс: обычные события (заявки, поиски) он не раздувает.
create index if not exists analytics_events_page_view_idx
  on public.analytics_events (created_at desc)
  where type = 'PAGE_VIEW';

create or replace function public.traffic_stats(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_from timestamptz;
  v_prev_from timestamptz;
  v_result jsonb;
begin
  if not private.is_platform_admin() then
    raise exception 'Сводка по трафику доступна только администратору платформы';
  end if;

  -- Период зажимаем: запрос за десять лет положил бы базу, а смысла не даёт.
  p_days := greatest(1, least(coalesce(p_days, 30), 365));
  v_from := now() - make_interval(days => p_days);
  v_prev_from := v_from - make_interval(days => p_days);

  with pv as (
    select
      created_at,
      payload ->> 'visitor' as visitor,
      payload ->> 'session' as session,
      payload ->> 'path'    as path,
      coalesce(payload ->> 'source', 'direct')  as source,
      coalesce(payload ->> 'ref', '')           as ref,
      coalesce(payload ->> 'campaign', '')      as campaign,
      coalesce(payload ->> 'device', 'desktop') as device,
      coalesce((payload ->> 'entry')::boolean, false) as entry
    from public.analytics_events
    where type = 'PAGE_VIEW' and created_at >= v_prev_from
  ),
  cur  as (select * from pv where created_at >= v_from),
  prev as (select * from pv where created_at <  v_from),
  -- Сессию описывает её первая страница: у последующих переходов источник
  -- всегда «свой сайт», и по ним нельзя сказать, откуда человек пришёл.
  entries as (select * from cur where entry),
  per_session as (select session, count(*) as hits from cur group by session)
  select jsonb_build_object(
    'days', p_days,
    'visits',       (select count(*) from cur),
    'visitors',     (select count(distinct visitor) from cur),
    'sessions',     (select count(distinct session) from cur),
    'prevVisits',   (select count(*) from prev),
    'prevVisitors', (select count(distinct visitor) from prev),
    'prevSessions', (select count(distinct session) from prev),
    -- Отказ: человек посмотрел одну страницу и ушёл.
    'bounces',      (select count(*) from per_session where hits = 1),
    'sources', coalesce((
      select jsonb_agg(x order by x.sessions desc)
      from (
        select source as key, count(distinct session)::int as sessions
        from entries group by source
      ) x
    ), '[]'::jsonb),
    'refs', coalesce((
      select jsonb_agg(x order by x.sessions desc)
      from (
        select ref as key, source, count(distinct session)::int as sessions
        from entries where ref <> '' group by ref, source
        order by count(distinct session) desc limit 12
      ) x
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(x order by x.sessions desc)
      from (
        select campaign as key, count(distinct session)::int as sessions
        from entries where campaign <> '' group by campaign
        order by count(distinct session) desc limit 10
      ) x
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(x order by x.visits desc)
      from (
        select path as key, count(*)::int as visits, count(distinct session)::int as sessions
        from cur group by path order by count(*) desc limit 15
      ) x
    ), '[]'::jsonb),
    'entryPages', coalesce((
      select jsonb_agg(x order by x.sessions desc)
      from (
        select path as key, count(distinct session)::int as sessions
        from entries group by path order by count(distinct session) desc limit 10
      ) x
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(x order by x.sessions desc)
      from (
        select device as key, count(distinct session)::int as sessions
        from entries group by device
      ) x
    ), '[]'::jsonb),
    'byDay', coalesce((
      select jsonb_agg(x order by x.day)
      from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
               count(*)::int as visits,
               count(distinct session)::int as sessions
        from cur group by 1
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.traffic_stats(int) from public, anon;
grant execute on function public.traffic_stats(int) to authenticated;

comment on function public.traffic_stats(int) is
  'Посещаемость сайта за период: визиты, посетители, источники, страницы. Только для админа платформы.';
