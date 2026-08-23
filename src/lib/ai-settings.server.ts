import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SYSTEM_PROMPT, type AiProvider, type AiSettings } from "@/lib/ai-provider.server";

export async function assertPlatformAdmin(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error || !data) throw new Error("Forbidden");
  const role = String((data as { role?: string }).role ?? "");
  if (!role.startsWith("PLATFORM_")) throw new Error("Forbidden");
}

export async function readSettings(): Promise<AiSettings & { updatedAt: string | null }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("ai_settings").select("*").eq("id", 1).maybeSingle();
    return {
      provider: ((data?.provider as AiProvider) ?? "lovable") as AiProvider,
      model: data?.model || "openai/gpt-5.6-sol",
      baseUrl: data?.base_url ?? "",
      apiKey: data?.api_key ?? "",
      enabled: data?.enabled ?? false,
      systemPrompt: data?.system_prompt || DEFAULT_SYSTEM_PROMPT,
      updatedAt: data?.updated_at ?? null,
    };
  } catch (err) {
    console.warn("[ai-settings] using defaults", err);
    return {
      provider: "lovable",
      model: "openai/gpt-5.6-sol",
      baseUrl: "",
      apiKey: "",
      enabled: false,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      updatedAt: null,
    };
  }
}

export async function writeSettings(input: {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  systemPrompt: string;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const current = await readSettings();
  // Empty key = keep the stored one (the UI only ever shows a mask).
  const apiKey = input.apiKey ? input.apiKey : current.apiKey;
  const { error } = await supabaseAdmin.from("ai_settings").upsert({
    id: 1,
    provider: input.provider,
    model: input.model || current.model,
    base_url: input.baseUrl,
    api_key: apiKey,
    enabled: input.enabled,
    system_prompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
  });
  if (error) throw new Error(error.message);
}
