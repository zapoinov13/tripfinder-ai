import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SYSTEM_PROMPT, type AiProvider, type AiSettings } from "@/lib/ai-provider.server";

export async function assertPlatformAdmin(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error || !data) throw new Error("Forbidden");
  const role = String((data as { role?: string }).role ?? "");
  // Управление AI-провайдером и ключами — только владелец платформы,
  // UI /admin/ai-keys ограничен той же ролью.
  if (role !== "PLATFORM_ADMIN") throw new Error("Forbidden");
}

export type ReadSettingsResult = AiSettings & {
  updatedAt: string | null;
  /**
   * Удалось ли вообще прочитать настройки.
   *
   * Раньше при любом сбое возвращались значения по умолчанию с enabled=false —
   * и «на сервере нет служебного ключа» становилось неотличимо от «владелец
   * выключил чат». Владелец добавлял ключ, щёлкал тумблером и снова читал
   * «AI-чат отключён администратором», не понимая, за что.
   */
  readable: boolean;
  /** Почему не удалось. Наружу посетителю не показываем, админу — показываем. */
  unavailableReason?: string;
};

export async function readSettings(): Promise<ReadSettingsResult> {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin.server");
    const { data, error } = await getSupabaseAdmin()
      .from("ai_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      provider: ((data?.provider as AiProvider) ?? "lovable") as AiProvider,
      model: data?.model || "openai/gpt-5.6-sol",
      baseUrl: data?.base_url ?? "",
      apiKey: data?.api_key ?? "",
      enabled: data?.enabled ?? false,
      systemPrompt: data?.system_prompt || DEFAULT_SYSTEM_PROMPT,
      updatedAt: data?.updated_at ?? null,
      readable: true,
    };
  } catch (err) {
    const { adminTarget } = await import("@/lib/supabase/admin.server");
    const target = adminTarget();
    const base = err instanceof Error ? err.message : String(err);
    // Без адреса проекта такую ошибку не отличить от «неверный ключ», а это
    // совсем другая починка.
    const reason = `${base} (проект ${target.projectId}, ключ ${target.hasKey ? "задан" : "не задан"})`;
    console.warn("[ai-settings] настройки не прочитаны", reason);
    return {
      provider: "lovable",
      model: "openai/gpt-5.6-sol",
      baseUrl: "",
      apiKey: "",
      enabled: false,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      updatedAt: null,
      readable: false,
      unavailableReason: reason,
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
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin.server");
  const supabaseAdmin = getSupabaseAdmin();
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
