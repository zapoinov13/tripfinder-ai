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
  /**
   * Прочитались ли настройки из базы.
   *
   * false значит, что серверу не хватает служебного ключа (или база не
   * ответила) — и тогда всё остальное на этой странице показывает значения по
   * умолчанию, а не то, что сохранено. Показать «выключено» в этом случае —
   * соврать: тумблер тут ни при чём.
   */
  readable: boolean;
  unavailableReason?: string;
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
      readable: row.readable,
      ...(row.unavailableReason ? { unavailableReason: row.unavailableReason } : {}),
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

/**
 * Список моделей провайдера — до сохранения ключа.
 *
 * Ключ приходит прямо в запросе: иначе выбрать модель можно было бы только
 * после сохранения, то есть вслепую сохранить неизвестно что, а потом
 * исправлять. Наружу ключ не возвращается и нигде не логируется.
 */
export const listAiModels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ provider: providerSchema, apiKey: z.string().trim().max(400).default("") })
      .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> => {
      const { assertPlatformAdmin, readSettings } = await import("@/lib/ai-settings.server");
      await assertPlatformAdmin(context.supabase, context.userId);
      const { listModels } = await import("@/lib/ai-provider.server");
      const stored = await readSettings();
      // Ключ из формы главнее сохранённого: админ как раз его и проверяет.
      return listModels({
        ...stored,
        provider: data.provider,
        baseUrl: data.provider === stored.provider ? stored.baseUrl : "",
        ...(data.apiKey ? { apiKey: data.apiKey } : {}),
      });
    },
  );

/** Что консультант видит и умеет прямо сейчас. */
export type AiCheck = {
  /** Ответила ли модель. */
  model: { ok: true; text: string } | { ok: false; error: string };
  /** Что консультант знает о платформе: с этим он и пойдёт отвечать людям. */
  catalog: { verticals: number; offers: number; destinations: number; companies: number };
  /** Включён ли чат для посетителей. */
  enabled: boolean;
};

/**
 * Проверка всей цепочки, а не только ключа.
 *
 * Пинг модели отвечал «ок» и когда сводка каталога приходила пустой — то
 * есть когда консультант формально работал, но отвечал «вообще», выдумывая
 * направления. Ровно такая поломка однажды и была: молчаливая, зелёная на
 * вид. Поэтому проверка теперь заодно показывает, что именно консультант
 * видит: разделы, предложения, направления, компании.
 */
export const testAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiCheck> => {
    const { assertPlatformAdmin, readSettings } = await import("@/lib/ai-settings.server");
    await assertPlatformAdmin(context.supabase, context.userId);
    const { callChatCompletion } = await import("@/lib/ai-provider.server");
    const { readCatalogSummary } = await import("@/lib/ai-catalog.server");

    const settings = await readSettings();
    const [res, summary] = await Promise.all([
      callChatCompletion(settings, [{ role: "user", content: "Ответь одним словом: ок" }]),
      readCatalogSummary(true),
    ]);

    return {
      model: res.ok ? { ok: true, text: res.text } : { ok: false, error: res.error },
      catalog: {
        verticals: summary.verticals.length,
        offers: summary.verticals.reduce((sum, v) => sum + v.count, 0),
        destinations: summary.destinations.length,
        companies: summary.companies,
      },
      enabled: settings.enabled,
    };
  });
