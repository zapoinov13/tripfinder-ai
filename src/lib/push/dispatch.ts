import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

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
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) return { ok: false, skipped: true };

  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "Нужен вход" };

  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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
