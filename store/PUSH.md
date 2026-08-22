# Push-уведомления TourGo

## Что уже работает

- **In-app**. таблица `notifications`, страница `/notifications`
- **Device tokens**. `device_tokens` при регистрации в Capacitor
- **Авто-push**. заявки, сообщения, бронирования через `pushNotification()` → Edge Function
- **Админ-рассылка**. `/admin/push` (PLATFORM_ADMIN)

## Deploy Edge Function

```bash
supabase login
supabase functions deploy send-push --project-ref mgyufoyornzbwvgdfojb
supabase functions deploy delete-account --project-ref mgyufoyornzbwvgdfojb
```

Dashboard → Edge Functions → Secrets:

| Secret | Значение |
|--------|----------|
| `FCM_SERVER_KEY` | Server key из Firebase Console (Cloud Messaging) |

Без `FCM_SERVER_KEY` уведомления сохраняются in-app, push на телефон не уходит.

## Firebase (Android + iOS через FCM)

1. [Firebase Console](https://console.firebase.google.com) → Add project `TourGo`
2. Add Android app `com.tourgo.app` → скачать `google-services.json` → `android/app/`
3. Add iOS app `com.tourgo.app` → скачать `GoogleService-Info.plist` → Xcode
4. Project Settings → Cloud Messaging → **Server key** → Supabase secret `FCM_SERVER_KEY`
5. Apple: загрузить APNs key в Firebase → Cloud Messaging → Apple app configuration

## iOS native

`@capacitor/push-notifications` уже в проекте. После Firebase + APNs:

```bash
npm run cap:sync
npm run cap:ios
```

## Тест

1. Войти как admin → `/admin/push` → отправить тест туристам
2. Или создать заявку. оператор получит in-app + push (если FCM настроен)

## Админ

- URL: https://tripfinder-ai.vercel.app/admin
- Login: `zapoinov@bk.ru` / `zapoinov@bk.ru`
- Создать/обновить: `npm run ensure:admin` (нужен service role)
