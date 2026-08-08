# Supabase setup (TourGo)

**Проект:** [mgyufoyornzbwvgdfojb](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb)  
**URL:** `https://mgyufoyornzbwvgdfojb.supabase.co`

## Куда открывать SQL (не в Cursor — в Dashboard)

Файлы лежат в репозитории локально. Их нужно **скопировать и выполнить** в SQL Editor:

1. Открой: https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new
2. В Cursor открой файл → выдели всё (Cmd+A) → скопируй (Cmd+C)
3. Вставь в SQL Editor → **Run**

Порядок (строго по очереди):

| # | Файл в проекте | Что делает |
|---|----------------|------------|
| 1 | `supabase/migrations/20260807180918_foundation.sql` | таблицы + RLS |
| 2 | `supabase/seed.sql` | демо-пользователи |
| 3 | `supabase/seed_catalog.sql` | направления / отели / туры |

Локальные пути (открыть в Cursor):

- `/supabase/migrations/20260807180918_foundation.sql`
- `/supabase/seed.sql`
- `/supabase/seed_catalog.sql`

## Env

`.env` / `.env.local` должны указывать на этот проект:

```
VITE_SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Логины

- `zapoinov@bk.ru` / `zapoinov@bk.ru` (PLATFORM_ADMIN)
- демо: `*@tourgo.demo` / `demo1234`

## Security

Не коммить DB password. Rotate если пароль светился в чате.
