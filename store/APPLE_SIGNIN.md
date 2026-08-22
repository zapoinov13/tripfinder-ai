# Apple Sign-In. настройка (после Apple Developer $99)

Кнопка уже в приложении. Чтобы модератор App Store мог войти через Apple:

## 1. Apple Developer

1. [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → `com.tourgo.app`
2. Включите **Sign in with Apple** → Save
3. Keys → **+** → Sign in with Apple → скачайте `.p8` (один раз!)
4. Запомните **Key ID** и **Team ID**

## 2. Supabase

1. [Authentication → Providers → Apple](https://supabase.com/dashboard/project/mgyufoyornzbwvgdfojb/auth/providers)
2. Enable Apple
3. **Services ID** (если нужен web): создайте в Apple → `com.tourgo.app.web`
4. **Secret Key**: содержимое `.p8`
5. **Key ID**, **Team ID**, **Bundle ID** = `com.tourgo.app`

## 3. Xcode

Entitlements уже содержат `com.apple.developer.applesignin`.

После enroll выберите Team в Signing → Capabilities подтянутся автоматически.

## 4. Проверка

1. TestFlight build на iPhone
2. Login → «Войти через Apple»
3. Должен создаться пользователь в Supabase Auth

Если OAuth не настроен. review-логины email/password всё равно работают (`store/review-notes.txt`).
