import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { TOURGO_SUPABASE_PROJECT_ID, resolveSupabaseConfig } from "@/lib/supabase/config";

/**
 * Служебный клиент Supabase — с проверкой, в какой проект он смотрит.
 *
 * Сгенерированный `integrations/supabase/client.server.ts` берёт адрес прямо из
 * `process.env.SUPABASE_URL`, без той защиты, что стоит у обычного клиента.
 * А визуальный редактор подставляет в окружение свой пустой проект. Тогда
 * сервер пишет и читает не ту базу: настройки AI «сохраняются» в пустоту,
 * тумблер возвращается в выключенное положение, а площадка отвечает, что
 * настройки прочитать не удалось. Найти это по симптомам почти невозможно —
 * всё выглядит как «ключ не тот».
 *
 * Поэтому адрес берём из общей проверенной настройки, а не из переменной. И
 * этот файл живёт отдельно: сгенерированный помечен «не править руками», его
 * может перезаписать редактор — вместе с исправлением.
 */
function resolveAdminConfig(): { url: string; key: string; projectId: string } {
  const resolved = resolveSupabaseConfig();
  // Переменную окружения принимаем, только если она про тот же проект.
  const envUrl = process.env["SUPABASE_URL"];
  const envIsTourGo = Boolean(envUrl && envUrl.includes(TOURGO_SUPABASE_PROJECT_ID));
  const url = envIsTourGo && envUrl ? envUrl : resolved.url;

  // В секретах редактора префикс SUPABASE_ запрещён — оттуда ключ приходит
  // под именем TOURGO_SERVICE_ROLE_KEY.
  const key =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["TOURGO_SERVICE_ROLE_KEY"] ?? "";

  return { url, key, projectId: resolved.projectId };
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    // Новые ключи Supabase — непрозрачные строки, а не bearer-токены.
    if (
      (supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_")) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

let client: SupabaseClient | null = null;

/**
 * Какие переменные окружения сервер вообще видит.
 *
 * Отдаём только имена и «есть/нет», без значений: служебный ключ в сообщении об
 * ошибке — это тот же служебный ключ, только на экране.
 *
 * Нужно вот зачем. Хостинг может честно показывать переменную в своей панели, а
 * до кода она не доезжать — не тот сборочный пресет, не та область видимости,
 * не пересобрано после добавления. Снаружи это неотличимо от «переменную не
 * добавили», и владелец добавляет её снова и снова. Список видимых имён
 * отвечает на этот вопрос за секунду.
 */
function visibleEnv(): string[] {
  const names = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "TOURGO_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
    "LOVABLE_API_KEY",
    "VERCEL",
    "VERCEL_ENV",
  ];
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  if (!env) return [];
  return names.filter((name) => Boolean(env[name]));
}

/** Куда смотрит служебный клиент — для честного сообщения об ошибке. */
export function adminTarget(): { projectId: string; hasKey: boolean; env: string[] } {
  const { key, projectId } = resolveAdminConfig();
  return { projectId, hasKey: Boolean(key), env: visibleEnv() };
}

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const { url, key } = resolveAdminConfig();
  if (!key) {
    throw new Error(
      "Не задан служебный ключ Supabase. На боевом сайте это SUPABASE_SERVICE_ROLE_KEY в Vercel, в превью редактора — TOURGO_SERVICE_ROLE_KEY в его секретах.",
    );
  }
  client = createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  return client;
}
