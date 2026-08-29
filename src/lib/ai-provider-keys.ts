/**
 * Кто выдал этот ключ.
 *
 * Раньше провайдера выбирали руками, и ошибиться было легче, чем попасть:
 * выбрал OpenAI, вставил ключ Anthropic — и получил «ключ отклонён» без
 * намёка на причину. Префикс ключа называет провайдера сам, спрашивать
 * человека не о чем.
 *
 * Определение целиком в браузере: ключ и так набран в этом окне, никуда
 * отправлять его ради опознания не нужно.
 */
import type { AiProvider } from "@/lib/ai-provider.server";

/** Порядок важен: «sk-ant-» и «sk-or-» проверяем до общего «sk-». */
const KEY_PREFIXES: Array<{ prefix: string; provider: AiProvider }> = [
  { prefix: "sk-ant-", provider: "anthropic" },
  { prefix: "sk-or-", provider: "openrouter" },
  { prefix: "AIza", provider: "google" },
  { prefix: "sk-", provider: "openai" },
];

export function detectProviderFromKey(key: string): AiProvider | null {
  const value = key.trim();
  if (!value) return null;
  for (const { prefix, provider } of KEY_PREFIXES) {
    if (value.startsWith(prefix)) return provider;
  }
  return null;
}

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  lovable: "Встроенный AI",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  google: "Google Gemini",
  openrouter: "OpenRouter",
  custom: "Свой endpoint",
};

/** Где взять ключ — чтобы не искать по сайту провайдера. */
export const PROVIDER_KEY_SOURCE: Partial<Record<AiProvider, { label: string; url: string }>> = {
  openai: { label: "platform.openai.com", url: "https://platform.openai.com/api-keys" },
  anthropic: { label: "console.anthropic.com", url: "https://console.anthropic.com/settings/keys" },
  google: { label: "aistudio.google.com", url: "https://aistudio.google.com/app/apikey" },
  openrouter: { label: "openrouter.ai", url: "https://openrouter.ai/keys" },
};
