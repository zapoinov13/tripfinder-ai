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

**Если база уже частично залита**. не гоняй все 16 файлов с нуля. Выполни только недостающие шаги из таблицы (обычно **11 → 16**).

## Порядок SQL (строго сверху вниз)

| #   | Файл                                                                          | Зачем                                          |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | `supabase/migrations/20260807180918_foundation.sql`                           | таблицы, RLS, роли                             |
| 2   | `supabase/migrations/20260812063545_36435ae0-ace0-4eef-b2f7-d91f0af8c6bc.sql` | служебные функции                              |
| 3   | `supabase/migrations/20260812063637_daf657c6-c19e-4fad-b5d0-2e7bba23e423.sql` | права admin / org                              |
| 4   | `supabase/migrations/20260816110803_50d6f7b9-3d97-4236-8492-d146b5fc4fce.sql` | правки схемы                                   |
| 5   | `supabase/migrations/20260816110847_6f39543e-76ce-436c-abf7-97fbee297f5d.sql` | правки схемы                                   |
| 6   | `supabase/migrations/20260819161443_0c872b45-bbb8-40cb-92b8-983254f511e5.sql` | AI-настройки                                   |
| 7   | `supabase/migrations/20260820035908_34934281-a9e7-495b-98f5-7396b5ecb89a.sql` | правки схемы                                   |
| 8   | `supabase/migrations/20260820035944_dcfc4fdc-d715-4579-9890-12c61ec36002.sql` | правки схемы                                   |
| 9   | `supabase/migrations/20260821064555_faefdbd4-86d1-4b56-a983-b398f6b7b48b.sql` | публичные вью компаний                         |
| 10  | `supabase/migrations/20260821064637_c004e3e1-5b2b-42ed-86e1-cebfb4030cb7.sql` | правки публичных вью                           |
| 11  | `supabase/migrations/20260821_requests_and_offers.sql`                        | заявки туристов и предложения фирм             |
| 12  | `supabase/migrations/20260821_messages_and_reviews.sql`                       | чат по заявке, отзывы, фото компании           |
| 13  | `supabase/migrations/20260821_public_company_page.sql`                        | публичная страница турфирмы + поля фото тура   |
| 14  | `supabase/seed.sql`                                                           | демо-пользователи и админ                      |
| 15  | `supabase/seed_catalog.sql`                                                   | направления, отели, туры                       |
| 16  | `supabase/seed_companies.sql`                                                 | ещё 3 проверенные турфирмы                     |
| 17  | `supabase/migrations/20260822_device_tokens.sql`                              | push-токены (идемпотентно)                     |
| 18  | `supabase/migrations/20260822_review_replies.sql`                             | ответы на отзывы                               |
| 19  | `supabase/migrations/20260823_organizations_public_safe.sql`                  | скрыть phone/whatsapp от anon                  |
| 20  | `supabase/migrations/20260823_protect_profiles_self_escalation.sql`           | **блок смены role/status самим пользователем** |

## Edge Functions — деплой через Supabase Dashboard

CLI с этой машины к проекту `mgyufoyornzbwvgdfojb` не привязан → деплой только через Dashboard.

**Открыть:** [Edge Functions](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/functions)

Для каждой функции: **Deploy a new function** (или открыть существующую → **Edit** → вставить код из репозитория → **Deploy**).

| Функция              | Файл в репо                                      | Зачем                                    |
| -------------------- | ------------------------------------------------ | ---------------------------------------- |
| `sync-supplier-feed` | `supabase/functions/sync-supplier-feed/index.ts` | импорт feed операторов (JWT + anti-SSRF) |
| `send-push`          | `supabase/functions/send-push/index.ts`          | push только себе / admin broadcast       |
| `delete-account`     | `supabase/functions/delete-account/index.ts`     | удаление аккаунта (App Store)            |

**Secrets** (Dashboard → [Project Settings → Edge Functions → Secrets](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/settings/functions)):

- `SUPABASE_URL` — уже есть автоматически
- `SUPABASE_ANON_KEY` — уже есть
- `SUPABASE_SERVICE_ROLE_KEY` — **добавить** (Settings → API → service_role)
- `FCM_SERVICE_ACCOUNT_JSON` — опционально, для реальных push (JSON сервисного аккаунта Firebase, FCM HTTP v1)

**Проверка SQL (триггер безопасности):** [SQL Editor](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/sql/new)

```sql
SELECT tgname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'profiles' AND NOT t.tgisinternal;
```

Должна быть строка `protect_profile_self_update`.

## Edge Function — CLI (если есть доступ к проекту)

```bash
supabase functions deploy sync-supplier-feed --project-ref mgyufoyornzbwvgdfojb
supabase functions deploy send-push --project-ref mgyufoyornzbwvgdfojb
supabase functions deploy delete-account --project-ref mgyufoyornzbwvgdfojb
```

Функция: `supabase/functions/delete-account`. удаляет пользователя из Auth + помечает profile.

## Review-аккаунты для App Store / Play

```bash
SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role> \
REVIEW_PASSWORD=<пароль демо-аккаунтов, >= 12 символов> \
npm run review:users
```

Создаёт `tourist@test.tourgo.app` и `operator@test.tourgo.app` с паролем
из `REVIEW_PASSWORD`. Этот же пароль впишите в `store/review-notes.txt`
перед отправкой в стор — в репозитории он не хранится.

Если база уже частично залита: достаточно проверить, что шаги **11–16** точно выполнены. Шаги 1–10 можно прогнать повторно.

### Частые ошибки

| Ошибка                                               | Причина                           | Что сделать                                                                      |
| ---------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `function public.is_platform_admin() does not exist` | Шаг 3 перенёс хелперы в `private` | Перезапусти **11** `requests_and_offers.sql` (исправлен: использует `private.*`) |
| `column "whatsapp" does not exist`                   | Шаг 13 до шага 11                 | Сначала **11**, потом **13** `public_company_page.sql`                           |
| `relation "public.trip_requests" does not exist`     | Шаг 11 не выполнился              | Сначала почини **11**, потом **12**                                              |
| `duplicate key … users_email_partial_key`            | пользователь уже есть в Auth      | Перезапусти **14** `seed.sql`. подхватит существующего пользователя              |

## Env в Lovable

**Secrets. не сюда.** Cloud → Secrets принимает только backend-ключи (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`).  
Имена `VITE_*` и `SUPABASE_*` Lovable **запрещает** в Secrets. отсюда ваша ошибка.

### Способ 1. подключить ваш Supabase (рекомендуется)

1. Lovable → проект **Voyage Finder** → **Cloud** (или **More → Cloud**)
2. **Already have a Supabase project? Connect it here**
3. Выберите организацию Supabase → проект **`mgyufoyornzbwvgdfojb`**
4. **Connect** → **Publish**

Lovable сам пропишет `VITE_SUPABASE_*` и server env. SQL вы уже залили в этот проект. повторно не нужно.

### Способ 2. файл `.env` в редакторе кода

Если connector не используете: в Lovable открой **Code** → файл **`.env`** (не Secrets!) и вставь:

```
VITE_SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key из Supabase API>
VITE_SUPABASE_PROJECT_ID=mgyufoyornzbwvgdfojb
SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co
SUPABASE_PUBLISHABLE_KEY=<тот же publishable key>
```

Publishable key: [Supabase → Settings → API](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/settings/api).

После сохранения. **Publish**.

### Vercel (если деплоите отдельно)

Project Settings → **Environment Variables**. там можно добавить и `VITE_*`, и остальное.

**Обязательно для Premium и admin AI на сервере:**

| Где                 | Variable                    | Environments                                      |
| ------------------- | --------------------------- | ------------------------------------------------- |
| **Vercel**          | `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development                  |
| **Lovable Secrets** | `TOURGO_SERVICE_ROLE_KEY`   | (Lovable запрещает имена с префиксом `SUPABASE_`) |

Значение одно и то же: service_role из [Settings → API](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/settings/api).

Без ключа `activatePremiumSubscription` и server-side admin операции не работают (клиент не может менять `role` — это правильно).

Локально: `.env` и `.env.local` → **`mgyufoyornzbwvgdfojb`** (не `hpernnwfdlpfaaphofmg`).

Service role на фронт не класть.

## Логины после seed.sql

Перед запуском `seed.sql` задайте пароль демо-пользователей:

```sql
set tourgo.demo_password = 'минимум-12-символов';
```

- Турист: `tourist@tourgo.demo` / `$tourgo.demo_password`
- Турфирма: `operator@tourgo.demo` / `$tourgo.demo_password`

Владельца платформы `seed.sql` больше не создаёт — заведите его отдельно,
паролем из менеджера паролей:

```bash
OWNER_EMAIL=<ваш email> OWNER_PASSWORD=<пароль> npm run ensure:admin
```

Демо-пользователи с ролью `PLATFORM_ADMIN` (`admin@tourgo.demo`) нужны только
для локального стенда. На боевом проекте их заводить не надо.

## Security

Не коммитить DB password и service_role.
