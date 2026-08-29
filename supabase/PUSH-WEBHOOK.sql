-- Пуш на телефон: новая строка в notifications → вызов функции send-push.
--
-- Почему не «вебхук из дашборда». Форма Database → Webhooks пишет триггер
-- через схему supabase_functions, а она появляется только когда эта функция
-- включена в проекте. Если её нет, SQL падает с
--
--   ERROR: 3F000: schema "supabase_functions" does not exist
--
-- Здесь тот же вызов сделан напрямую через pg_net — расширение есть на любом
-- проекте Supabase, включать ничего не нужно.
--
-- ПЕРЕД ЗАПУСКОМ заменить два значения в строках ниже:
--
--   ВАШ_СЕКРЕТ    — тот же, что в Edge Functions → Secrets → PUSH_WEBHOOK_SECRET
--   ВАШ_ANON_KEY  — Project Settings → API → anon / publishable key
--                   (без него шлюз Supabase не пропустит вызов до функции)
--
-- Запускать можно повторно: старый триггер снимается перед созданием нового.
--
--   https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new

create extension if not exists pg_net with schema extensions;

/**
 * Тело запроса повторяет формат вебхука Supabase: функция send-push уже умеет
 * его читать, и менять её из-за способа доставки не нужно.
 *
 * Ошибку сети наружу не пускаем: уведомление в базе важнее, чем доставка на
 * телефон, и падение вставки из-за недоступной функции было бы хуже
 * непришедшего пуша.
 */
create or replace function public.push_notification_to_device()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, net
as $$
begin
  perform net.http_post(
    url := 'https://mgyufoyornzbwvgdfojb.supabase.co/functions/v1/send-push',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', to_jsonb(new)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'ВАШ_СЕКРЕТ',
      'Authorization', 'Bearer ВАШ_ANON_KEY'
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception
  when others then
    raise warning 'push: не удалось вызвать send-push: %', sqlerrm;
    return new;
end;
$$;

revoke all on function public.push_notification_to_device() from public, anon, authenticated;

drop trigger if exists push_on_notification on public.notifications;
create trigger push_on_notification
  after insert on public.notifications
  for each row execute function public.push_notification_to_device();

comment on function public.push_notification_to_device() is
  'Новое уведомление в базе — вызов send-push, чтобы оно дошло на телефон.';

-- Проверка: должна вернуть строку push_on_notification со статусом O (включён).
select tgname as "Триггер", tgenabled as "Включён"
from pg_trigger
where tgrelid = to_regclass('public.notifications') and not tgisinternal;
