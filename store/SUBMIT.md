# TourGo. публикация в App Store и Google Play

Всё, что можно подготовить в коде, уже сделано. Вам остаётся оплатить аккаунты и пройти мастера загрузки.

## Что уже готово в репозитории

| Материал                  | Путь                                                         |
| ------------------------- | ------------------------------------------------------------ |
| Иконка 1024×1024          | `store/icons/icon-1024.png`                                  |
| Иконка 512 (Play)         | `store/icons/icon-512.png`                                   |
| Feature graphic 1024×500  | `store/icons/feature-graphic-1024x500.png`                   |
| Скриншоты iPhone 6.7"     | `store/screenshots/ios/6.7-inch/`                            |
| Скриншоты iPhone 6.5"     | `store/screenshots/ios/6.5-inch/`                            |
| Скриншоты Android         | `store/screenshots/android/phone/`                           |
| Тексты RU/EN              | `store/metadata.json`                                        |
| Review notes              | `store/review-notes.txt`                                     |
| Privacy / Terms / Support | https://tripfinder-ai.vercel.app/privacy · /terms · /support |
| iOS иконка в Xcode        | `ios/App/App/Assets.xcassets/AppIcon.appiconset/`            |
| Android иконки + splash   | `android/app/src/main/res/`                                  |

Пересобрать ассеты:

```bash
npm run store:icons          # иконки + splash + feature graphic
npm run store:screenshots    # скрины с production (?app=1)
npm run store:assets         # всё сразу
npm run cap:sync             # после иконок. sync в нативные проекты
```

---

## Шаг 1. Оплатить аккаунты (единственное обязательное с вашей стороны)

| Store                   | Ссылка                                       | Цена       |
| ----------------------- | -------------------------------------------- | ---------- |
| **Apple Developer**     | https://developer.apple.com/programs/enroll/ | $99/год    |
| **Google Play Console** | https://play.google.com/console/signup       | $25 разово |

---

## Шаг 2. iOS (после Apple Developer)

1. **App Store Connect** → My Apps → **+** → New App
   - Name: `TourGo`
   - Bundle ID: `com.tourgo.app`
   - SKU: `tourgo-ios`

2. **Загрузить материалы**
   - Icon: `store/icons/icon-1024.png`
   - Screenshots 6.7": `store/screenshots/ios/6.7-inch/*.png`
   - Screenshots 6.5": `store/screenshots/ios/6.5-inch/*.png`
   - Privacy URL: `https://tripfinder-ai.vercel.app/privacy`
   - Support URL: `https://tripfinder-ai.vercel.app/support`
   - Category: Travel
   - Age: 4+
   - Тексты: из `store/metadata.json` → `locales.ru` и `locales.en`

3. **App Privacy** (Nutrition Labels). указать:
   - Email, имя (аккаунт)
   - Device ID (push, если включите позже)
   - Данные не продаются третьим лицам

4. **Review Information**. вставить из `store/review-notes.txt`

5. **Xcode** (на Mac):

   ```bash
   npm run cap:sync
   npm run cap:ios
   ```
   - Signing → ваш Team
   - Product → Archive → Distribute → App Store Connect
   - TestFlight → Internal Testing → Submit for Review

6. **Apple Sign-In** (если модератор попросит):
   - Apple Developer → Identifiers → `com.tourgo.app` → Sign in with Apple ✓
   - Supabase → Authentication → Apple (Service ID + Key)

---

## Шаг 3. Android (после Google Play Console)

1. **Create app** → TourGo, default language Russian

2. **Store listing**
   - App icon: `store/icons/icon-512.png` (или 1024)
   - Feature graphic: `store/icons/feature-graphic-1024x500.png`
   - Phone screenshots: `store/screenshots/android/phone/*.png`
   - Short / full description: `store/metadata.json`
   - Privacy policy: `https://tripfinder-ai.vercel.app/privacy`

3. **App content**
   - Privacy policy URL ✓
   - Ads: No (если нет рекламы)
   - Target audience: general
   - **Data safety**. как в App Privacy (email, name, optional device token)
   - **Content rating**. пройти опросник IARC (обычно Everyone / 3+)

4. **App access**. тестовые логины из `store/review-notes.txt`

5. **Release → Production**
   ```bash
   npm run cap:sync
   npm run cap:android
   ```
   - Build → Generate Signed Bundle / APK → **Android App Bundle (.aab)**
   - Upload в Production track

---

## Шаг 4. Supabase (для review-логинов и удаления аккаунта)

1. Review-пользователи:
   ```bash
   SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service role из Dashboard → API> \
   npm run review:users
   ```
2. Edge Function удаления аккаунта:
   ```bash
   supabase functions deploy delete-account --project-ref mgyufoyornzbwvgdfojb
   ```
3. Apple Sign-In: см. `store/APPLE_SIGNIN.md`
4. Deep links: см. `store/DEEP_LINKS.md` (Team ID + SHA256 после enroll)

Опционально (push позже): `supabase/migrations/20260822_device_tokens.sql`. уже применена у вас.

---

## Сроки review

| Store             | Обычно             |
| ----------------- | ------------------ |
| Apple TestFlight  | сразу после upload |
| Apple Review      | 1–7 дней           |
| Google Internal   | сразу              |
| Google Production | 1–3 дня            |

---

## Контакты в карточке

- Support: support@tourgo.app (или `VITE_SUPPORT_EMAIL` на Vercel)
- Website: https://tripfinder-ai.vercel.app
