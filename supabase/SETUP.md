# Supabase setup (TourGo)

**Проект:** [mgyufoyornzbwvgdfojb](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb)  
**URL:** `https://mgyufoyornzbwvgdfojb.supabase.co`  
**SQL Editor:** https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new

## Что сделать сейчас (коротко)

1. Открой SQL Editor по ссылке выше.
2. По очереди выполни **все 16 файлов** из таблицы ниже: открыл файл → скопировал целиком → вставил → **Run**.
3. Auth: Dashboard → Authentication → Providers → Email включи. Confirm email для демо можно выключить.
4. В Lovable и Vercel проверь env (см. ниже).
5. В Lovable: Security → ignore/resolve critical finding → **Publish**.

Ошибка `already exists` при Run нормальна: иди к следующему файлу.

**Если база уже частично залита** — не гоняй все 16 файлов с нуля. Выполни только недостающие шаги из таблицы (обычно **11 → 16**).

## Порядок SQL (строго сверху вниз)

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
| 13 | `supabase/migrations/20260821_public_company_page.sql` | публичная страница турфирмы + поля фото тура |
| 14 | `supabase/seed.sql` | демо-пользователи и админ |
| 15 | `supabase/seed_catalog.sql` | направления, отели, туры |
| 16 | `supabase/seed_companies.sql` | ещё 3 проверенные турфирмы |

Если база уже частично залита: достаточно проверить, что шаги **11–16** точно выполнены. Шаги 1–10 можно прогнать повторно.

### Частые ошибки

| Ошибка | Причина | Что сделать |
|--------|---------|-------------|
| `function public.is_platform_admin() does not exist` | Шаг 3 перенёс хелперы в `private` | Перезапусти **11** `requests_and_offers.sql` (исправлен: использует `private.*`) |
| `column "whatsapp" does not exist` | Шаг 13 до шага 11 | Сначала **11**, потом **13** `public_company_page.sql` |
| `relation "public.trip_requests" does not exist` | Шаг 11 не выполнился | Сначала почини **11**, потом **12** |
| `duplicate key … users_email_partial_key` | `zapoinov@bk.ru` уже есть в Auth | Перезапусти **14** `seed.sql` — подхватит существующего пользователя |

## Env в Lovable

**Secrets — не сюда.** Cloud → Secrets принимает только backend-ключи (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`).  
Имена `VITE_*` и `SUPABASE_*` Lovable **запрещает** в Secrets — отсюда ваша ошибка.

### Способ 1 — подключить ваш Supabase (рекомендуется)

1. Lovable → проект **Voyage Finder** → **Cloud** (или **More → Cloud**)
2. **Already have a Supabase project? Connect it here**
3. Выберите организацию Supabase → проект **`mgyufoyornzbwvgdfojb`**
4. **Connect** → **Publish**

Lovable сам пропишет `VITE_SUPABASE_*` и server env. SQL вы уже залили в этот проект — повторно не нужно.

### Способ 2 — файл `.env` в редакторе кода

Если connector не используете: в Lovable открой **Code** → файл **`.env`** (не Secrets!) и вставь:

```
VITE_SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key из Supabase API>
VITE_SUPABASE_PROJECT_ID=mgyufoyornzbwvgdfojb
SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co
SUPABASE_PUBLISHABLE_KEY=<тот же publishable key>
```

Publishable key: [Supabase → Settings → API](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/settings/api).

После сохранения — **Publish**.

### Vercel (если деплоите отдельно)

Project Settings → **Environment Variables** — там можно добавить и `VITE_*`, и остальное.

Локально: `.env` и `.env.local` → **`mgyufoyornzbwvgdfojb`** (не `hpernnwfdlpfaaphofmg`).

Service role на фронт не класть.

## Логины после seed.sql

- Админ: `zapoinov@bk.ru` / `zapoinov@bk.ru`
- Турист: `tourist@tourgo.demo` / `demo1234`
- Турфирма: `operator@tourgo.demo` / `demo1234`

## Security

Не коммитить DB password и service_role.
