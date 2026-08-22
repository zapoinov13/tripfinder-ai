import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Единственный production-проект TourGo, все env должны указывать сюда. */
export const TOURGO_SUPABASE_PROJECT_ID = "mgyufoyornzbwvgdfojb";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

if (
  import.meta.env.DEV &&
  isSupabaseConfigured &&
  projectId &&
  projectId !== TOURGO_SUPABASE_PROJECT_ID
) {
  console.warn(
    `[supabase] VITE_SUPABASE_PROJECT_ID=${projectId}, expected ${TOURGO_SUPABASE_PROJECT_ID}. Tours may be empty.`,
  );
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
