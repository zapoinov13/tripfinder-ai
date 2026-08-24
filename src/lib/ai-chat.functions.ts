import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(24),
});

export type AiChatReply = { ok: true; text: string } | { ok: false; error: string };

/** Гость: 20 запросов или 40k символов в час с одного IP. */
const GUEST_LIMIT = { requests: 20, chars: 40_000, windowSeconds: 3600 };
/** Авторизованный: 60 запросов или 120k символов в час. */
const USER_LIMIT = { requests: 60, chars: 120_000, windowSeconds: 3600 };

function clientBucket(): { bucket: string; limit: typeof GUEST_LIMIT } {
  const request = getRequest();
  const headers = request?.headers;

  // Авторизованных считаем по токену (стабильнее IP за NAT).
  const auth = headers?.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const payload = token.split(".")[1];
    if (payload) {
      try {
        const sub = (
          JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
            sub?: string;
          }
        ).sub;
        if (sub) return { bucket: `user:${sub}`, limit: USER_LIMIT };
      } catch {
        // не JWT — считаем гостем
      }
    }
  }

  const ip =
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-real-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return { bucket: `ip:${ip}`, limit: GUEST_LIMIT };
}

/** Public: the AI concierge chat is available to guests too. */
export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => chatSchema.parse(input))
  .handler(async ({ data }): Promise<AiChatReply> => {
    const { readSettings } = await import("@/lib/ai-settings.server");
    const { callChatCompletion } = await import("@/lib/ai-provider.server");
    const settings = await readSettings();
    if (!settings.enabled) {
      return { ok: false, error: "AI-чат отключён администратором" };
    }

    // Квота на вызовы LLM: публичный эндпоинт без счётчика позволял жечь
    // баланс провайдера в цикле. Счётчик в БД, окно скользящее.
    const chars = data.messages.reduce((sum, m) => sum + m.content.length, 0);
    const { bucket, limit } = clientBucket();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: allowed, error } = await supabaseAdmin.rpc("consume_ai_quota", {
        p_bucket: bucket,
        p_chars: chars,
        p_max_requests: limit.requests,
        p_max_chars: limit.chars,
        p_window_seconds: limit.windowSeconds,
      });
      if (error) {
        // Лимитер не должен ронять чат: логируем и пропускаем.
        console.error("[ai] rate limit check failed", error.message);
      } else if (!allowed) {
        return {
          ok: false,
          error: "Слишком много запросов. Попробуйте снова через несколько минут.",
        };
      }
    } catch (err) {
      console.error("[ai] rate limit unavailable", err);
    }

    const res = await callChatCompletion(settings, [
      { role: "system", content: settings.systemPrompt },
      ...data.messages,
    ]);
    return res.ok ? { ok: true, text: res.text } : { ok: false, error: res.error };
  });
