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

type Bucket = { bucket: string; limit: typeof GUEST_LIMIT };

/**
 * Корзины для счётчика запросов.
 *
 * Подпись токена здесь не проверяется — чат публичный, и ходить за проверкой
 * в Supabase на каждое сообщение дорого. Поэтому счёт по IP идёт ВСЕГДА:
 * подделанный `sub` даёт только новую пользовательскую корзину, а лимит по
 * адресу остаётся и не пускает жечь ключ провайдера в цикле. Токен лишь
 * поднимает потолок для тех, кто действительно вошёл.
 */
function clientBuckets(): Bucket[] {
  const request = getRequest();
  const headers = request?.headers;

  const ip =
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-real-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const auth = headers?.get("authorization");
  let sub: string | undefined;
  if (auth?.startsWith("Bearer ")) {
    const payload = auth.slice(7).split(".")[1];
    if (payload) {
      try {
        sub = (JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string })
          .sub;
      } catch {
        // не JWT — остаёмся гостем
      }
    }
  }

  const ipLimit = sub ? USER_LIMIT : GUEST_LIMIT;
  const buckets: Bucket[] = [{ bucket: `ip:${ip}`, limit: ipLimit }];
  if (sub) buckets.push({ bucket: `user:${sub}`, limit: USER_LIMIT });
  return buckets;
}

/**
 * Работает ли консультант прямо сейчас.
 *
 * Страница должна знать это до первого сообщения: показывать поле для чата,
 * который ответит «ключ не задан», — значит обманывать. Наружу отдаём только
 * «да/нет», без причины: провайдер и ключ — не дело посетителя.
 */
export const aiChatStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ available: boolean }> => {
    try {
      const { readSettings } = await import("@/lib/ai-settings.server");
      const { endpointFor } = await import("@/lib/ai-provider.server");
      const settings = await readSettings();
      return {
        available: settings.readable && settings.enabled && Boolean(endpointFor(settings).key),
      };
    } catch {
      return { available: false };
    }
  },
);

/** Public: the AI concierge chat is available to guests too. */
export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => chatSchema.parse(input))
  .handler(async ({ data }): Promise<AiChatReply> => {
    const { readSettings } = await import("@/lib/ai-settings.server");
    const { callChatCompletion } = await import("@/lib/ai-provider.server");
    const settings = await readSettings();
    // Три разных «нет», и валить их в одно — значит отправлять владельца чинить
    // не то. Именно так и вышло: он добавлял ключ, а площадка отвечала, что
    // чат выключен администратором.
    if (!settings.readable) {
      return {
        ok: false,
        error: "AI не настроен на сервере: платформа не смогла прочитать настройки",
      };
    }
    if (!settings.enabled) {
      return { ok: false, error: "AI-чат отключён администратором" };
    }

    // Квота на вызовы LLM: публичный эндпоинт без счётчика позволял жечь
    // баланс провайдера в цикле. Счётчик в БД, окно скользящее.
    const chars = data.messages.reduce((sum, m) => sum + m.content.length, 0);
    const buckets = clientBuckets();
    try {
      const { getSupabaseAdmin } = await import("@/lib/supabase/admin.server");
      const supabaseAdmin = getSupabaseAdmin();
      // bind: без него метод теряет объект и падает на this.rest.
      const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
        name: string,
        args: {
          p_bucket: string;
          p_chars: number;
          p_max_requests: number;
          p_max_chars: number;
          p_window_seconds: number;
        },
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
      // Считаем по всем корзинам: превышение любой из них закрывает запрос.
      for (const { bucket, limit } of buckets) {
        const { data: allowed, error } = await rpc("consume_ai_quota", {
          p_bucket: bucket,
          p_chars: chars,
          p_max_requests: limit.requests,
          p_max_chars: limit.chars,
          p_window_seconds: limit.windowSeconds,
        });
        if (error) {
          // Лимитер не должен ронять чат: логируем и пропускаем.
          console.error("[ai] rate limit check failed", error.message);
          break;
        }
        if (!allowed) {
          return {
            ok: false,
            error: "Слишком много запросов. Попробуйте снова через несколько минут.",
          };
        }
      }
    } catch (err) {
      console.error("[ai] rate limit unavailable", err);
    }

    // Промпт собирается из трёх частей: настройка админа, живая сводка
    // каталога и правила разговора. Без сводки модель советует направления,
    // которых никто не продаёт, — человек идёт по совету, ничего не находит
    // и уходит. Это хуже, чем отсутствие консультанта.
    const { readCatalogSummary, describeCatalog, CONSULTANT_RULES } =
      await import("@/lib/ai-catalog.server");
    const summary = await readCatalogSummary();
    const system = [settings.systemPrompt, describeCatalog(summary), CONSULTANT_RULES]
      .filter(Boolean)
      .join("\n\n");

    const res = await callChatCompletion(settings, [
      { role: "system", content: system },
      ...data.messages,
    ]);
    return res.ok ? { ok: true, text: res.text } : { ok: false, error: res.error };
  });
