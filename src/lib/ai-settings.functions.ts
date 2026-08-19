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
  enabled: boolean;
  systemPrompt: string;
  updatedAt: string | null;
};

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiSettingsView> => {
    const { assertPlatformAdmin, readSettings } = await import("@/lib/ai-settings.server");
    await assertPlatformAdmin(context.supabase, context.userId);
    const { maskKey } = await import("@/lib/ai-provider.server");
    const row = await readSettings();
    return {
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl,
      keyMask: maskKey(row.apiKey),
      hasKey: Boolean(row.apiKey),
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
    return res.ok ? { ok: true as const, text: res.text } : { ok: false as const, error: res.error };
  });
