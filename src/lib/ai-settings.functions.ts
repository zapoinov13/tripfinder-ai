import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const providerSchema = z.enum(["lovable", "openai", "anthropic", "google", "openrouter", "custom"]);

const saveSchema = z.object({
  provider: providerSchema,
  model: z.string().trim(),
  baseUrl: z.string().trim(),
  apiKey: z.string().trim(),
  enabled: z.boolean(),
  systemPrompt: z.string().trim(),
});

export type AiSettingsView = {
  provider: z.infer<typeof providerSchema>;
  model: string;
  baseUrl: string;
  keyMask: string;
  hasKey: boolean;
  /** Откуда берётся ключ: "env" — переменная окружения сервера, "db" — сохранён в настройках. */
  keySource: "env" | "db" | "none";
  enabled: boolean;
  systemPrompt: string;
  updatedAt: string | null;
};

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiSettingsView> => {
    const { assertPlatformAdmin, readSettings } = await import("@/lib/ai-settings.server");
    await assertPlatformAdmin(context.supabase, context.userId);
    const { maskKey, endpointFor } = await import("@/lib/ai-provider.server");
    const row = await readSettings();
    // У встроенного провайдера ключ живёт в переменной окружения сервера, а не
    // в настройках. Раньше страница смотрела только в настройки и писала «не
    // задан» даже когда AI работал — и наоборот, молчала, когда переменной на
    // сервере нет. Спрашиваем тот же ключ, которым пойдёт настоящий запрос.
    const effectiveKey = endpointFor(row).key;
    const fromEnv = Boolean(effectiveKey) && !row.apiKey;
    return {
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl,
      keyMask: fromEnv ? "переменная окружения LOVABLE_API_KEY" : maskKey(row.apiKey),
      hasKey: Boolean(effectiveKey),
      keySource: effectiveKey ? (fromEnv ? "env" : "db") : "none",
      enabled: row.enabled,
      systemPrompt: row.systemPrompt,
      updatedAt: row.updatedAt,
    };
  });

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertPlatformAdmin, writeSettings } = await import("@/lib/ai-settings.server");
    await assertPlatformAdmin(context.supabase, context.userId);
    await writeSettings(data);
    return { ok: true as const };
  });

export const testAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPlatformAdmin, readSettings } = await import("@/lib/ai-settings.server");
    await assertPlatformAdmin(context.supabase, context.userId);
    const { callChatCompletion } = await import("@/lib/ai-provider.server");
    const settings = await readSettings();
    const res = await callChatCompletion(settings, [
      { role: "user", content: "Ответь одним словом: ок" },
    ]);
    return res.ok
      ? { ok: true as const, text: res.text }
      : { ok: false as const, error: res.error };
  });
