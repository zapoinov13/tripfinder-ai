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

async function sendFcm(tokens: string[], title: string, body: string, data: Record<string, string>) {
  const key = Deno.env.get("FCM_SERVER_KEY");
  if (!key || tokens.length === 0) return { sent: 0, skipped: true };

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: { title, body },
      data,
      priority: "high",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return { sent: json.success ?? 0, failure: json.failure ?? 0, skipped: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    if (payload.broadcast) {
      if (!isPlatformAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let q = admin.from("profiles").select("id, role").eq("status", "active");
      if (payload.audience === "tourists") {
        q = q.in("role", ["TOURIST", "PREMIUM_TOURIST"]);
      } else if (payload.audience === "operators") {
        q = q.like("role", "OPERATOR%");
      }
      const { data: profiles, error } = await q;
      if (error) throw error;
      targetUserIds = (profiles ?? []).map((p) => p.id);
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

    let notificationsCreated = 0;
    let tokensSent = 0;

    for (const userId of targetUserIds) {
      const { error: notifError } = await admin.from("notifications").insert({
        user_id: userId,
        type,
        title,
        body,
        read: false,
        payload: data,
      });
      if (!notifError) notificationsCreated += 1;

      const { data: tokens } = await admin
        .from("device_tokens")
        .select("token")
        .eq("user_id", userId);

      const tokenList = (tokens ?? []).map((t) => t.token).filter(Boolean);
      if (tokenList.length) {
        const fcm = await sendFcm(tokenList, title, body, stringData);
        tokensSent += fcm.sent ?? 0;
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
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        targets: targetUserIds.length,
        notificationsCreated,
        tokensSent,
        fcmConfigured: Boolean(Deno.env.get("FCM_SERVER_KEY")),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
