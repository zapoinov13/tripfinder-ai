/**
 * Local MVP platform layer (no Supabase yet).
 *
 * Demo logins (password: demo1234):
 * - tourist@voyago.demo — TOURIST
 * - premium@voyago.demo — PREMIUM_TOURIST
 * - operator@voyago.demo — OPERATOR_ADMIN (Travel Company, APPROVED)
 * - manager@voyago.demo — OPERATOR_MANAGER
 * - pending@voyago.demo — OPERATOR_ADMIN (PENDING_APPROVAL)
 * - admin@voyago.demo — PLATFORM_ADMIN
 *
 * Data lives in localStorage key `voyago:platform-v1`.
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
