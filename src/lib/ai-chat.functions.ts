import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(24),
});

export type AiChatReply = { ok: true; text: string } | { ok: false; error: string };

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
    const res = await callChatCompletion(settings, [
      { role: "system", content: settings.systemPrompt },
      ...data.messages,
    ]);
    return res.ok ? { ok: true, text: res.text } : { ok: false, error: res.error };
  });
