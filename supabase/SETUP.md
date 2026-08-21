# Supabase setup (TourGo)

**Проект:** [mgyufoyornzbwvgdfojb](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb)  
**URL:** `https://mgyufoyornzbwvgdfojb.supabase.co`

## Куда открывать SQL

1. Открой: https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new
2. Скопируй содержимое файла из репозитория целиком
3. Вставь в SQL Editor → **Run**
4. Если ошибка «already exists» — это нормально, иди к следующему файлу

Порядок строго сверху вниз. Файлы идемпотентные, повторный запуск безопасен.

| # | Файл | Зачем |
|---|------|--------|
| 1 | `supabase/migrations/20260807180918_foundation.sql` | таблицы, RLS, роли |
| 2 | `supabase/migrations/20260812063545_36435ae0-ace0-4eef-b2f7-d91f0af8c6bc.sql` | служебные функции |
| 3 | `supabase/migrations/20260812063637_daf657c6-c19e-4fad-b5d0-2e7bba23e423.sql` | права admin / org |
| 4 | `supabase/migrations/20260816110803_50d6f7b9-3d97-4236-8492-d146b5fc4fce.sql` | правки схемы |
| 5 | `supabase/migrations/20260816110847_6f39543e-76ce-436c-abf7-97fbee297f5d.sql` | правки схемы |
| 6 | `supabase/migrations/20260819161443_0c872b45-bbb8-40cb-92b8-983254f511e5.sql` | AI-настройки |
| 7 | `supabase/migrations/20260820035908_34934281-a9e7-495b-98f5-7396b5ecb89a.sql` | правки схемы |
| 8 | `supabase/migrations/20260820035944_dcfc4fdc-d715-4579-9890-12c61ec36002.sql` | правки схемы |
| 9 | `supabase/migrations/20260821064555_faefdbd4-86d1-4b56-a983-b398f6b7b48b.sql` | публичные вью компаний |
| 10 | `supabase/migrations/20260821064637_c004e3e1-5b2b-42ed-86e1-cebfb4030cb7.sql` | правки публичных вью |
| 11 | `supabase/migrations/20260821_requests_and_offers.sql` | заявки туристов и предложения фирм |
| 12 | `supabase/migrations/20260821_messages_and_reviews.sql` | чат по заявке, отзывы, фото компании |
| 13 | `supabase/migrations/20260821_public_company_page.sql` | публичная страница турфирмы для туриста |
| 14 | `supabase/seed.sql` | демо-пользователи и админ `zapoinov@bk.ru` |
| 15 | `supabase/seed_catalog.sql` | направления, отели, туры |
| 16 | `supabase/seed_companies.sql` | ещё 3 проверенные турфирмы для сравнения |

После шага 13 отдельно выполни в SQL Editor:

```sql
alter table public.tour_offers
  add column if not exists title text not null default '',
  add column if not exists description text not null default '',
  add column if not exists photos text[] not null default '{}',
  add column if not exists videos text[] not null default '{}';
```

## Auth

Dashboard → Authentication → Providers → Email: включи Email.  
Confirm email можно выключить на время демо, иначе новые регистрации не зайдут без письма.

## Env в Vercel и Lovable

Те же ключи, что в локальном `.env`:

```
VITE_SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=mgyufoyornzbwvgdfojb
```

Service role в фронт не класть.

## Логины после seed.sql

- Админ: `zapoinov@bk.ru` / `zapoinov@bk.ru`
- Турист: `tourist@tourgo.demo` / `demo1234`
- Турфирма: `operator@tourgo.demo` / `demo1234`

Если админ не поднимается, локально: `node scripts/ensure-owner-admin.mjs`

## Security

Не коммитить DB password и service_role.
