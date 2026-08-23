import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  TOURGO_SUPABASE_PROJECT_ID,
  resolveSupabaseConfig,
} from "@/lib/supabase/config";

export { TOURGO_SUPABASE_PROJECT_ID } from "@/lib/supabase/config";

const resolved = resolveSupabaseConfig();

export const isSupabaseConfigured = Boolean(resolved.url && resolved.publishableKey);

if (import.meta.env.DEV && resolved.source === "tourgo-fallback") {
  console.warn(
    `[supabase] Using TourGo fallback (${TOURGO_SUPABASE_PROJECT_ID}). Set VITE_SUPABASE_* to this project in Lovable/Vercel.`,
  );
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(resolved.url, resolved.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export function getSupabasePublicConfig() {
  return resolved;
}
