import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  userId?: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
  broadcast?: boolean;
  audience?: "all" | "tourists" | "operators";
};

/**
 * Вызов от Database Webhook: строка уведомления уже создана триггером базы,
 * от нас нужна только доставка на телефон. Пишет её база, значит подделать
 * отправителя нельзя — но сам вызов закрываем общим секретом.
 */
type WebhookBody = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record?: {
    id?: string;
    user_id?: string;
    type?: string;
    title?: string;
    body?: string;
    payload?: Record<string, unknown>;
  };
};

/** Какой тумблер в настройках отвечает за этот вид уведомлений. */
const PREF_BY_TYPE: Record<string, "requests" | "messages" | "reviews"> = {
  service_request: "requests",
  service_request_status: "requests",
  request_offer: "requests",
  request_offer_status: "requests",
  booking: "requests",
  service_message: "messages",
  message: "messages",
  company_review: "reviews",
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

/** Сколько отправок FCM держим в полёте одновременно. */
const FCM_CONCURRENCY = 8;
/** Верхняя граница широковещательной рассылки за один вызов функции. */
const BROADCAST_LIMIT = 2000;

// ---------------------------------------------------------------------------
// FCM HTTP v1. Legacy-эндпоинт /fcm/send с ключом сервера Google отключила
// в июне 2024, поэтому здесь OAuth2 по сервисному аккаунту.
// ---------------------------------------------------------------------------

function readServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null;
    return parsed as ServiceAccount;
  } catch {
    console.error("[push] FCM_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(account: ServiceAccount): Promise<string> {
  // Обновляем за минуту до истечения, чтобы не поймать 401 на границе.
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const assertion = `${header}.${claims}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM auth ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

type SendOutcome = { sent: number; stale: string[] };

/**
 * v1 не умеет multicast одним запросом (batch-эндпоинт закрыт вместе с legacy),
 * поэтому шлём по токену пачками и попутно собираем протухшие.
 */
async function sendFcm(
  account: ServiceAccount,
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<SendOutcome> {
  if (tokens.length === 0) return { sent: 0, stale: [] };

  const accessToken = await getAccessToken(account);
  const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
  const outcome: SendOutcome = { sent: 0, stale: [] };

  for (let i = 0; i < tokens.length; i += FCM_CONCURRENCY) {
    const chunk = tokens.slice(i, i + FCM_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (token) => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data,
              android: { priority: "HIGH" },
              apns: {
                headers: { "apns-priority": "10" },
                payload: { aps: { sound: "default" } },
              },
            },
          }),
        });

        if (res.ok) return { ok: true as const, token };

        const text = await res.text();
        // 404 UNREGISTERED / 400 INVALID_ARGUMENT — токен мёртв, убираем из базы.
        const stale =
          res.status === 404 || (res.status === 400 && text.includes("INVALID_ARGUMENT"));
        if (!stale) console.error("[push] FCM", res.status, text.slice(0, 200));
        return { ok: false as const, token, stale };
      }),
    );

    for (const r of results) {
      if (r.ok) outcome.sent += 1;
      else if (r.stale) outcome.stale.push(r.token);
    }
  }

  return outcome;
}

/**
 * Доставка уведомления, которое база уже записала.
 *
 * Триггеры пишут уведомления второй стороне — партнёру о новой записи,
 * клиенту об ответе. На экран телефона это само не улетит: здесь и есть тот
 * шаг, который превращает строку в базе в пуш.
 */
async function deliverFromWebhook(
  admin: ReturnType<typeof createClient>,
  record: NonNullable<WebhookBody["record"]>,
) {
  const userId = record.user_id;
  const title = record.title?.trim();
  const body = record.body?.trim();
  if (!userId || !title || !body) {
    return { ok: true, skipped: "empty" as const };
  }

  // Человек мог отключить этот вид сигналов в настройках.
  const pref = PREF_BY_TYPE[record.type ?? ""];
  if (pref) {
    const { data: profile } = await admin
      .from("profiles")
      .select("notify_prefs")
      .eq("id", userId)
      .maybeSingle();
    const prefs = (profile?.notify_prefs ?? {}) as Record<string, boolean | undefined>;
    if (prefs[pref] === false) return { ok: true, skipped: "muted" as const };
  }

  const account = readServiceAccount();
  if (!account) return { ok: true, skipped: "fcm_not_configured" as const };

  const { data: tokenRows } = await admin
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId);
  const tokens = (tokenRows ?? []).map((row) => row.token).filter(Boolean) as string[];
  if (tokens.length === 0) return { ok: true, skipped: "no_devices" as const };

  const stringData = Object.fromEntries(
    Object.entries({ ...(record.payload ?? {}), type: record.type ?? "system" }).map(([k, v]) => [
      k,
      String(v),
    ]),
  );
  const result = await sendFcm(account, tokens, title, body, stringData);
  if (result.stale.length) {
    await admin.from("device_tokens").delete().in("token", result.stale);
  }
  return { ok: true, tokensSent: result.sent, staleRemoved: result.stale.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Вебхук базы: приходит без пользовательского токена, поэтому закрыт
    // отдельным секретом. Проверяем до чтения тела как пользовательского.
    const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
    const givenSecret = req.headers.get("x-webhook-secret");
    if (webhookSecret && givenSecret) {
      if (givenSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const hook = (await req.json()) as WebhookBody;
      if (hook.type !== "INSERT" || hook.table !== "notifications" || !hook.record) {
        return new Response(JSON.stringify({ ok: true, skipped: "not_insert" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = createClient(supabaseUrl, serviceKey);
      const outcome = await deliverFromWebhook(admin, hook.record);
      return new Response(JSON.stringify(outcome), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const payload = (await req.json()) as Body;
    const { title, body, type = "system", data = {} } = payload;

    if (!title?.trim() || !body?.trim()) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isPlatformAdmin =
      callerProfile?.role === "PLATFORM_ADMIN" || callerProfile?.role === "PLATFORM_MANAGER";

    let targetUserIds: string[] = [];
    let truncated = false;

    if (payload.broadcast) {
      if (!isPlatformAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let q = admin
        .from("profiles")
        .select("id, role")
        .eq("status", "active")
        .limit(BROADCAST_LIMIT + 1);
      if (payload.audience === "tourists") {
        q = q.in("role", ["TOURIST", "PREMIUM_TOURIST"]);
      } else if (payload.audience === "operators") {
        q = q.like("role", "OPERATOR%");
      }
      const { data: profiles, error } = await q;
      if (error) throw error;
      targetUserIds = (profiles ?? []).map((p) => p.id);
      if (targetUserIds.length > BROADCAST_LIMIT) {
        truncated = true;
        targetUserIds = targetUserIds.slice(0, BROADCAST_LIMIT);
      }
    } else if (payload.userId) {
      if (payload.userId !== user.id && !isPlatformAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserIds = [payload.userId];
    } else {
      return new Response(JSON.stringify({ error: "userId or broadcast required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stringData = Object.fromEntries(
      Object.entries({ ...data, type }).map(([k, v]) => [k, String(v)]),
    );

    // In-app уведомления пишем одной вставкой, а не циклом по пользователям.
    const { data: inserted, error: notifError } = await admin
      .from("notifications")
      .insert(
        targetUserIds.map((userId) => ({
          user_id: userId,
          type,
          title,
          body,
          read: false,
          payload: data,
        })),
      )
      .select("id");
    if (notifError) console.error("[push] notifications insert", notifError.message);
    const notificationsCreated = inserted?.length ?? 0;

    const account = readServiceAccount();
    let tokensSent = 0;
    let staleRemoved = 0;

    if (account) {
      // Фильтр .in() уходит в query string; на широковещательной рассылке
      // список UUID не влезает в лимит длины URL — читаем токены пачками.
      const tokenList: string[] = [];
      for (let i = 0; i < targetUserIds.length; i += 200) {
        const { data: tokenRows } = await admin
          .from("device_tokens")
          .select("token")
          .in("user_id", targetUserIds.slice(i, i + 200));
        for (const row of tokenRows ?? []) {
          if (row.token) tokenList.push(row.token);
        }
      }
      const result = await sendFcm(account, tokenList, title, body, stringData);
      tokensSent = result.sent;

      if (result.stale.length) {
        await admin.from("device_tokens").delete().in("token", result.stale);
        staleRemoved = result.stale.length;
      }
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: payload.broadcast ? "push_broadcast" : "push_send",
      entity_type: "notification",
      meta: {
        audience: payload.audience ?? null,
        targets: targetUserIds.length,
        notificationsCreated,
        tokensSent,
        staleRemoved,
        truncated,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        targets: targetUserIds.length,
        notificationsCreated,
        tokensSent,
        staleRemoved,
        truncated,
        fcmConfigured: Boolean(account),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[push]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
