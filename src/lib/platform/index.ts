/**
 * Local MVP platform layer (no Supabase yet).
 *
 * Demo logins (password: demo1234):
 * - tourist@tourgo.demo: TOURIST
 * - premium@tourgo.demo: PREMIUM_TOURIST
 * - operator@tourgo.demo: OPERATOR_ADMIN (Travel Company, APPROVED)
 * - manager@tourgo.demo: OPERATOR_MANAGER
 * - pending@tourgo.demo: OPERATOR_ADMIN (PENDING_APPROVAL)
 * - admin@tourgo.demo: PLATFORM_ADMIN
 *
 * Аккаунт владельца в исходниках не хранится: прод — Supabase
 * (npm run ensure:admin, пароль в env), dev — VITE_DEV_ADMIN_* из .env.
 *
 * Data lives in localStorage key `tourgo:platform-v1`.
 * Later: replace store.ts persistence with Supabase client; keep service interfaces.
 */

export * from "./types";
export * from "./store";
export * from "./hooks";
export * from "./catalog";
export * from "./auth";
export * from "./search-service";
export * from "./ai-services";
export * from "./adapters";
export * from "./booking";
export { DEMO_PASSWORD, STORE_KEY, createSeedState, defaultConfig } from "./seed";
