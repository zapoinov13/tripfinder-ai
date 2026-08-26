/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Dev-вход админа без Supabase. Задаются только в локальном .env, не в репозитории. */
  readonly VITE_DEV_ADMIN_EMAIL?: string;
  readonly VITE_DEV_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
