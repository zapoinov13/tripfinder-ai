export type AiProvider = "lovable" | "openai" | "anthropic" | "google" | "openrouter" | "custom";

export type AiSettings = {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  systemPrompt: string;
};

export const DEFAULT_SYSTEM_PROMPT =
  "Ты — TourGo AI, travel-консьерж маркетплейса туров. Отвечай кратко, дружелюбно, по-русски. " +
  "Помогай подобрать тур: уточняй город вылета, направление, даты, количество туристов, бюджет и питание. " +
  "Если данных достаточно — предложи параметры поиска и следующий шаг.";

export function endpointFor(settings: AiSettings): { url: string; key: string; model: string } {
  const key = settings.provider === "lovable" ? (process.env["LOVABLE_API_KEY"] ?? "") : settings.apiKey;
  const base =
    settings.baseUrl.trim() ||
    (settings.provider === "openai"
      ? "https://api.openai.com/v1"
      : settings.provider === "anthropic"
        ? "https://api.anthropic.com/v1"
        : settings.provider === "google"
          ? "https://generativelanguage.googleapis.com/v1beta/openai"
          : settings.provider === "openrouter"
            ? "https://openrouter.ai/api/v1"
            : "https://ai.gateway.lovable.dev/v1");
  return { url: `${base.replace(/\/$/, "")}/chat/completions`, key, model: settings.model };
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * All supported providers expose an OpenAI-compatible /chat/completions endpoint
 * (Anthropic via its OpenAI-compat layer), so one call path covers them all.
 */
export async function callChatCompletion(
  settings: AiSettings,
  messages: ChatMessage[],
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const { url, key, model } = endpointFor(settings);
  if (!key) return { ok: false, error: "API-ключ не задан" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[ai] provider error", res.status, detail.slice(0, 500));
      if (res.status === 401 || res.status === 403) return { ok: false, error: "Ключ отклонён провайдером" };
      if (res.status === 429) return { ok: false, error: "Превышен лимит запросов к модели" };
      if (res.status === 402) return { ok: false, error: "Недостаточно средств на балансе провайдера" };
      return { ok: false, error: `Провайдер вернул ошибку ${res.status}` };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "Пустой ответ модели" };
    return { ok: true, text };
  } catch (error) {
    console.error("[ai] request failed", error);
    return { ok: false, error: "Не удалось связаться с провайдером" };
  }
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
