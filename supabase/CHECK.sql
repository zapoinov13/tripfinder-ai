-- Что из последних миграций реально применено к базе.
--
-- Только чтение: ничего не меняет, запускать можно сколько угодно раз.
-- Вставьте целиком в SQL Editor и нажмите Run. В ответе будет таблица:
-- «есть» — объект на месте, «НЕТ» — эту часть надо применить заново.
--
--   https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new

with checks(part, kind, name, present) as (
  -- Часть: карточка компании и передача владельцу
  select 'Заявки на владение', 'таблица', 'public.company_claims',
         to_regclass('public.company_claims') is not null
  union all
  select 'Заявки на владение', 'политик RLS', 'company_claims_*',
         (select count(*) from pg_policies
           where schemaname = 'public' and tablename = 'company_claims') >= 4

  -- Часть: только админ платформы меняет служебные поля компании
  union all
  select 'Служебные поля компании', 'функция', 'private.guard_org_platform_fields',
         to_regprocedure('private.guard_org_platform_fields()') is not null

  -- Часть: уведомления второй стороне
  union all
  select 'Уведомления', 'функция', 'private.notify_user',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'private' and p.proname = 'notify_user')
  union all
  select 'Уведомления', 'функция', 'private.org_member_ids',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'private' and p.proname = 'org_member_ids')
  union all
  select 'Уведомления', 'функция', 'private.platform_admin_ids',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'private' and p.proname = 'platform_admin_ids')
  union all
  select 'Уведомления', 'триггер', 'service_requests_notify',
         exists (select 1 from pg_trigger where tgname = 'service_requests_notify' and not tgisinternal)
  union all
  select 'Уведомления', 'триггер', 'service_messages_notify',
         exists (select 1 from pg_trigger where tgname = 'service_messages_notify' and not tgisinternal)
  union all
  select 'Уведомления', 'триггер', 'request_offers_notify',
         exists (select 1 from pg_trigger where tgname = 'request_offers_notify' and not tgisinternal)
  union all
  select 'Уведомления', 'триггер', 'company_reviews_notify',
         exists (select 1 from pg_trigger where tgname = 'company_reviews_notify' and not tgisinternal)
  union all
  select 'Уведомления', 'триггер', 'company_claims_notify',
         exists (select 1 from pg_trigger where tgname = 'company_claims_notify' and not tgisinternal)

  -- Часть: чат и статусы заявок
  union all
  select 'Чат и статусы', 'функция', 'private.guard_service_message',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'private' and p.proname = 'guard_service_message')
  union all
  select 'Чат и статусы', 'триггер', 'service_messages_guard',
         exists (select 1 from pg_trigger where tgname = 'service_messages_guard' and not tgisinternal)
  union all
  select 'Чат и статусы', 'функция', 'private.guard_service_request_update',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'private' and p.proname = 'guard_service_request_update')
  union all
  select 'Чат и статусы', 'триггер', 'service_requests_guard',
         exists (select 1 from pg_trigger where tgname = 'service_requests_guard' and not tgisinternal)

  -- Отдельно: свой счётчик посещаемости
  union all
  select 'Счётчик посещаемости', 'функция', 'public.traffic_stats',
         to_regprocedure('public.traffic_stats(int)') is not null

  -- Отдельно: личные поля профиля
  union all
  select 'Профиль', 'колонка', 'profiles.phone',
         exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'profiles'
                    and column_name = 'phone')
  union all
  select 'Профиль', 'колонка', 'profiles.birthday',
         exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'profiles'
                    and column_name = 'birthday')

  -- Отдельно: документы компаний на проверку
  union all
  select 'Документы компаний', 'бакет', 'company-docs',
         exists (select 1 from storage.buckets where id = 'company-docs' and public = false)
  union all
  select 'Документы компаний', 'таблица', 'public.company_documents',
         to_regclass('public.company_documents') is not null
  union all
  select 'Документы компаний', 'функция', 'public.admin_company_documents',
         to_regprocedure('public.admin_company_documents()') is not null
  union all
  select 'Документы компаний', 'функция', 'public.review_company_document',
         to_regprocedure('public.review_company_document(uuid, text, text)') is not null
  union all
  select 'Документы компаний', 'триггер', 'company_documents_guard_review',
         exists (select 1 from pg_trigger
                  where tgname = 'company_documents_guard_review' and not tgisinternal)

  -- Отдельно: вебхук, который шлёт пуш на телефон
  union all
  -- Триггер может быть двух видов: из формы дашборда (supabase_functions.
  -- http_request) или наш на pg_net — засчитываем оба.
  select 'Пуш на телефон', 'триггер на notifications', 'вызов send-push',
         exists (select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
                  where t.tgrelid = to_regclass('public.notifications')
                    and p.proname in ('http_request', 'push_notification_to_device')
                    and not t.tgisinternal)
)
select
  part                                    as "Часть",
  kind                                    as "Что",
  name                                    as "Объект",
  case when present then 'есть' else 'НЕТ' end as "Статус"
from checks
order by (case when present then 1 else 0 end), part, kind, name;
