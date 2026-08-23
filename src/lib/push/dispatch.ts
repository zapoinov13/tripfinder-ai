import { getSupabase, getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/client";

type PushPayload = {
  userId: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
};

export async function dispatchPushNotification(input: PushPayload) {
  if (!isSupabaseConfigured) return { ok: false, skipped: true };

  const sb = getSupabase();
  if (!sb) return { ok: false, skipped: true };
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) return { ok: false, skipped: true };

  const { url: baseUrl, publishableKey: apiKey } = getSupabasePublicConfig();

  try {
    const res = await fetch(`${baseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type ?? "system",
        data: input.data ?? {},
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[push] dispatch failed", err);
      return { ok: false, error: String(err.error ?? res.status) };
    }
    return { ok: true, ...(await res.json().catch(() => ({}))) };
  } catch (err) {
    console.warn("[push] dispatch error", err);
    return { ok: false, error: String(err) };
  }
}

export async function dispatchPushBroadcast(input: {
  title: string;
  body: string;
  audience: "all" | "tourists" | "operators";
}) {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase не настроен" };

  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase не настроен" };
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "Нужен вход" };

  const { url: baseUrl, publishableKey: apiKey } = getSupabasePublicConfig();

  const res = await fetch(`${baseUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ broadcast: true, ...input }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: String(body.error ?? res.status) };
  return { ok: true, ...body };
}
