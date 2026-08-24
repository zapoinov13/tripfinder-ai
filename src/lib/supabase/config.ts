/** Единственный production-проект TourGo. Lovable Cloud иногда подставляет свой пустой проект. */
export const TOURGO_SUPABASE_PROJECT_ID = "mgyufoyornzbwvgdfojb";
export const TOURGO_SUPABASE_URL = "https://mgyufoyornzbwvgdfojb.supabase.co";
export const TOURGO_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cykIutJS18rku4zxUBMkLw_LqXt9hag";

/** Встроенная пустая БД Lovable: не использовать для каталога TourGo. */
const LOVABLE_BUILTIN_PROJECT_ID = "hpernnwfdlpfaaphofmg";

export type ResolvedSupabaseConfig = {
  url: string;
  publishableKey: string;
  projectId: string;
  source: "env" | "tourgo-fallback";
};

function readEnv(name: string): string | undefined {
  const fromImportMeta = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  if (fromImportMeta) return fromImportMeta;
  if (typeof process !== "undefined") {
    return process.env[name];
  }
  return undefined;
}

function projectIdFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1];
}

function isTourGoProject(projectId: string | undefined, url: string | undefined): boolean {
  if (projectId === TOURGO_SUPABASE_PROJECT_ID) return true;
  return projectIdFromUrl(url) === TOURGO_SUPABASE_PROJECT_ID;
}

/** Предпочитаем env, но всегда возвращаем TourGo, если Lovable подставил другой проект. */
export function resolveSupabaseConfig(): ResolvedSupabaseConfig {
  const envUrl = readEnv("VITE_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
  const envKey =
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? readEnv("SUPABASE_PUBLISHABLE_KEY");
  const envProjectId =
    readEnv("VITE_SUPABASE_PROJECT_ID") ?? readEnv("SUPABASE_PROJECT_ID") ?? projectIdFromUrl(envUrl);

  if (
    envUrl &&
    envKey &&
    isTourGoProject(envProjectId, envUrl) &&
    envProjectId !== LOVABLE_BUILTIN_PROJECT_ID
  ) {
    return {
      url: envUrl,
      publishableKey: envKey,
      projectId: envProjectId ?? TOURGO_SUPABASE_PROJECT_ID,
      source: "env",
    };
  }

  return {
    url: TOURGO_SUPABASE_URL,
    publishableKey: TOURGO_SUPABASE_PUBLISHABLE_KEY,
    projectId: TOURGO_SUPABASE_PROJECT_ID,
    source: "tourgo-fallback",
  };
}
