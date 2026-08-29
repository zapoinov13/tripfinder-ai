import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { TOURGO_SUPABASE_PROJECT_ID, resolveSupabaseConfig } from "@/lib/supabase/config";

export { TOURGO_SUPABASE_PROJECT_ID } from "@/lib/supabase/config";

const resolved = resolveSupabaseConfig();

export const isSupabaseConfigured = Boolean(resolved.url && resolved.publishableKey);

if (import.meta.env.DEV && resolved.source === "tourgo-fallback") {
  console.warn(
    `[supabase] Using TourGo fallback (${TOURGO_SUPABASE_PROJECT_ID}). Set VITE_SUPABASE_* to this project in the deploy environment.`,
  );
}

/**
 * Клиент Supabase на всё приложение — ровно один.
 *
 * Здесь раньше создавался второй `createClient`. Оба писали сессию под одним и
 * тем же ключом хранилища и оба сами обновляли токен — браузер честно ругался
 * «Multiple GoTrueClient instances detected in the same browser context».
 *
 * Это не косметика. Токен обновления одноразовый: который клиент успел первым,
 * тот и обновил, а второй уходит в базу со старым, получает отказ и сносит
 * сессию. Человека выбрасывает из аккаунта посреди работы, без всякой
 * закономерности, а следом сыплются 401 — от сохранений, которые всё ещё
 * думают, что вход живой.
 *
 * Поэтому берём тот единственный клиент, что заведён в integrations: у него
 * есть хранилище, умеющее работать и внутри превью визуального редактора.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return supabase as unknown as SupabaseClient;
}

export function getSupabasePublicConfig() {
  return resolved;
}
