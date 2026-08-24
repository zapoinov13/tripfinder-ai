/**
 * Лимиты для публичного AI-эндпоинта.
 *
 * /api aiChat намеренно доступен гостям, но без счётчика любой мог в цикле
 * жечь баланс LLM-провайдера: до 24 сообщений по 4000 символов за запрос.
 *
 * Счётчик живёт в БД, а не в памяти воркера: на Cloudflare/Vercel изолят
 * поднимается на каждый регион и переживает лишь несколько запросов.
 */

create table if not exists public.ai_rate_limits (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  char_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ai_rate_limits enable row level security;
-- Политик нет: таблица доступна только service_role из серверных функций.
revoke all on public.ai_rate_limits from anon, authenticated;
grant all on public.ai_rate_limits to service_role;

create index if not exists ai_rate_limits_window_idx
  on public.ai_rate_limits (window_started_at);

/**
 * Атомарно списывает квоту. Возвращает true, если запрос разрешён.
 * Окно скользит целиком: как только оно истекло, счётчики обнуляются.
 */
create or replace function public.consume_ai_quota(
  p_bucket text,
  p_chars integer,
  p_max_requests integer,
  p_max_chars integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row_state public.ai_rate_limits%rowtype;
  window_start timestamptz;
begin
  insert into public.ai_rate_limits as l (bucket, window_started_at, request_count, char_count)
  values (p_bucket, now(), 0, 0)
  on conflict (bucket) do update set updated_at = now()
  returning l.* into row_state;

  window_start := row_state.window_started_at;

  if window_start < now() - make_interval(secs => p_window_seconds) then
    update public.ai_rate_limits
      set window_started_at = now(), request_count = 1, char_count = p_chars, updated_at = now()
      where bucket = p_bucket;
    return true;
  end if;

  if row_state.request_count >= p_max_requests or row_state.char_count + p_chars > p_max_chars then
    return false;
  end if;

  update public.ai_rate_limits
    set request_count = request_count + 1,
        char_count = char_count + p_chars,
        updated_at = now()
    where bucket = p_bucket;

  return true;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text, integer, integer, integer, integer) to service_role;

/** Чистим протухшие корзины, чтобы таблица не росла бесконечно. */
create or replace function public.prune_ai_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from public.ai_rate_limits where updated_at < now() - interval '1 day';
$$;

revoke all on function public.prune_ai_rate_limits() from public, anon, authenticated;
grant execute on function public.prune_ai_rate_limits() to service_role;
