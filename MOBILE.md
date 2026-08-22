# TourGo — мобильное приложение

Инструкция по сборке, тестированию и публикации iOS / Android без оплаты сторов на этапе разработки.

## Что уже настроено

- **Capacitor 8** — оболочка iOS + Android (`ios/`, `android/`)
- **App ID:** `com.tourgo.app`
- **Production URL:** приложение грузит `https://tripfinder-ai.vercel.app`
- **Tab bar:** Главная · Поиск · Поездки · Профиль
- **Компактный UI** в нативном приложении (без лишнего лендинга)
- **Deep links:** `https://tripfinder-ai.vercel.app/...` и `tourgo://path`
- **Push (заготовка):** регистрация токена → таблица `device_tokens` в Supabase
- **Юридические страницы:** `/privacy`, `/terms`
- **Метаданные для сторов:** `store/metadata.json`

## Быстрый старт

```bash
# 1. Сборка веб-приложения + sync в нативные проекты
npm run cap:sync

# 2. iOS (нужен Mac + Xcode)
npm run cap:ios
# В Xcode: Run на симуляторе или устройстве

# 3. Android (Android Studio)
npm run cap:android
# Run на эмуляторе или устройстве
```

## Тест в браузере (без Xcode)

Откройте на телефоне:

```
https://tripfinder-ai.vercel.app/?app=1
```

Параметр `?app=1` включает компактный режим приложения.

## Локальная разработка с live reload

```bash
npm run dev
# В другом терминале:
CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:8080 npx cap sync
npm run cap:ios
```

## Push-уведомления (следующий шаг)

1. Выполните миграцию `supabase/migrations/20260822_device_tokens.sql` в SQL Editor
2. **iOS:** Apple Developer → Keys → APNs → загрузить в Firebase
3. **Android:** Firebase Console → добавить приложение `com.tourgo.app` → `google-services.json` в `android/app/`
4. Edge Function для отправки push через FCM/APNs (ещё не реализована)

## Публикация в сторы (когда будете готовы платить)

| Шаг | iOS | Android |
|-----|-----|---------|
| Аккаунт | Apple Developer $99/год | Google Play $25 разово |
| Сборка | Xcode → Archive → TestFlight | Android Studio → Signed AAB |
| Материалы | `store/metadata.json` | то же |
| Privacy URL | https://tripfinder-ai.vercel.app/privacy | то же |
| Test accounts | см. `store/metadata.json` | то же |

## Тестовые аккаунты для модераторов

| Роль | Email | Пароль |
|------|-------|--------|
| Турист | tourist@test.tourgo.app | Test1234! |
| Турфирма | operator@test.tourgo.app | Test1234! |

## Структура файлов

```
capacitor.config.ts          # конфиг Capacitor
src/lib/native/              # app detection, push, deep links
src/components/site/app-tab-bar.tsx
src/components/native/       # bootstrap, network banner
ios/                         # Xcode project
android/                     # Gradle project
store/metadata.json          # тексты для App Store / Google Play
```
