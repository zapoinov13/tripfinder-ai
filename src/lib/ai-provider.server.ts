export type AiProvider = "lovable" | "openai" | "anthropic" | "google" | "openrouter" | "custom";

export type AiSettings = {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  systemPrompt: string;
};

export { DEFAULT_SYSTEM_PROMPT } from "@/lib/ai-prompt";

export function endpointFor(settings: AiSettings): { url: string; key: string; model: string } {
  const key =
    settings.provider === "lovable" ? (process.env["LOVABLE_API_KEY"] ?? "") : settings.apiKey;
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
      if (res.status === 401 || res.status === 403)
        return { ok: false, error: "Ключ отклонён провайдером" };
      if (res.status === 429) return { ok: false, error: "Превышен лимит запросов к модели" };
      if (res.status === 402)
        return { ok: false, error: "Недостаточно средств на балансе провайдера" };
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

/**
 * Какие модели доступны этому ключу.
 *
 * Захардкоженный список моделей устаревает молча: провайдер снимает модель с
 * обслуживания, в поле остаётся мёртвый идентификатор, и админ видит ошибку
 * от провайдера, не понимая, при чём тут ключ. Спрашиваем у самого
 * провайдера — он единственный знает точный ответ.
 */
export async function listModels(
  settings: AiSettings,
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  const { url, key } = endpointFor(settings);
  // endpointFor даёт адрес чата; список моделей лежит рядом.
  const modelsUrl = url.replace(/\/chat\/completions$/, "/models");
  if (!key) return { ok: false, error: "API-ключ не задан" };

  try {
    const res = await fetch(modelsUrl, {
      headers: {
        Authorization: `Bearer ${key}`,
        // Anthropic принимает и свой заголовок — так работает и родной API,
        // и слой совместимости.
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403)
        return { ok: false, error: "Ключ отклонён провайдером" };
      return { ok: false, error: `Провайдер вернул ошибку ${res.status}` };
    }
    const data = (await res.json()) as { data?: Array<{ id?: unknown }> };
    const ids = (data.data ?? [])
      .map((row) => String(row.id ?? ""))
      .filter(Boolean)
      .filter(isChatModel)
      .sort();
    if (ids.length === 0) return { ok: false, error: "Провайдер не вернул ни одной модели" };
    return { ok: true, models: ids };
  } catch (error) {
    console.error("[ai] models request failed", error);
    return { ok: false, error: "Не удалось получить список моделей" };
  }
}

/**
 * Отсеиваем то, что не умеет разговаривать: у OpenAI в общем списке лежат
 * ещё и распознавание речи, картинки и векторные представления. Выбрать их
 * консультанту — гарантированная ошибка при первом же вопросе.
 */
const NOT_CHAT =
  /embed|whisper|tts|audio|dall-e|image|moderation|realtime|transcribe|search|rerank/i;

function isChatModel(id: string): boolean {
  return !NOT_CHAT.test(id);
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
