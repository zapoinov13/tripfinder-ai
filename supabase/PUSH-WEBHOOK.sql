-- Вебхук пуша: новая строка в notifications → уведомление на телефон.
--
-- Это последняя недостающая часть после основных миграций. Делает то же,
-- что форма Database → Webhooks в дашборде, но без кликов.
--
-- ПЕРЕД ЗАПУСКОМ заменить два значения ниже:
--
--   ВАШ_СЕКРЕТ    — тот же, что в Edge Functions → Secrets → PUSH_WEBHOOK_SECRET
--   ВАШ_ANON_KEY  — Project Settings → API → anon / publishable key
--                   (без него шлюз Supabase не пропустит вызов до функции)
--
-- Запускать можно повторно: старый триггер снимается перед созданием нового.
--
--   https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new

create extension if not exists pg_net with schema extensions;

drop trigger if exists push_on_notification on public.notifications;

create trigger push_on_notification
  after insert on public.notifications
  for each row execute function supabase_functions.http_request(
    'https://mgyufoyornzbwvgdfojb.supabase.co/functions/v1/send-push',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"ВАШ_СЕКРЕТ","Authorization":"Bearer ВАШ_ANON_KEY"}',
    '{}',
    '5000'
  );

-- Проверка: должна вернуть одну строку с именем push_on_notification.
select tgname as "Триггер", tgenabled as "Включён"
from pg_trigger
where tgrelid = to_regclass('public.notifications') and not tgisinternal;
