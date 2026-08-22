# Deep links. финальная настройка

Файлы уже лежат в `public/.well-known/` и деплоятся на Vercel.

## iOS Universal Links

1. Apple Developer → Membership → скопируйте **Team ID** (10 символов).
2. Откройте `public/.well-known/apple-app-site-association`.
3. Замените `TEAM_ID` на ваш Team ID → `AB12CD34EF.com.tourgo.app`.
4. Xcode → Signing & Capabilities → **Associated Domains**:
   - `applinks:tripfinder-ai.vercel.app`
5. Entitlements уже подготовлены в `ios/App/App/App.entitlements` (раскомментируйте после enroll).

Проверка: https://tripfinder-ai.vercel.app/.well-known/apple-app-site-association

## Android App Links

1. Создайте upload keystore (Play Console → Setup → App signing).
2. Получите SHA-256:
   ```bash
   keytool -list -v -keystore upload-keystore.jks -alias upload
   ```
3. Вставьте fingerprint в `public/.well-known/assetlinks.json` вместо `REPLACE_WITH_UPLOAD_KEY_SHA256`.
4. `AndroidManifest.xml` уже содержит `android:autoVerify="true"`.

Проверка: https://tripfinder-ai.vercel.app/.well-known/assetlinks.json

## Custom scheme (уже работает)

- `tourgo://search`
- `tourgo://profile`
