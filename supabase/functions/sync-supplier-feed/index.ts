import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  endpoint?: string;
  apiKey?: string;
  secret?: string;
  authType?: "api_key" | "basic" | "bearer";
};

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

function isBlockedTarget(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
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
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token || token === anonKey || token.split(".").length !== 3) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("role, organization_id, status")
      .eq("id", user.id)
      .maybeSingle();

    const role = String(profile?.role ?? "");
    const isOperator = role.startsWith("OPERATOR");
    const isPlatform = role.startsWith("PLATFORM_");
    if (!isOperator && !isPlatform) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }
    if (profile?.status && profile.status !== "active") {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const body = (await req.json()) as Body;
    const endpoint = body.endpoint?.trim();
    if (!endpoint) {
      return json({ ok: false, error: "endpoint required" }, 400);
    }

    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      return json({ ok: false, error: "invalid endpoint URL" }, 400);
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      return json({ ok: false, error: "only http(s) endpoints allowed" }, 400);
    }
    if (isBlockedTarget(url)) {
      return json({ ok: false, error: "endpoint host not allowed" }, 400);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    const apiKey = body.apiKey ?? "";
    const secret = body.secret ?? "";
    const authType = body.authType ?? "api_key";

    if (authType === "bearer" && apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    } else if (authType === "basic" && apiKey) {
      headers.Authorization = `Basic ${btoa(`${apiKey}:${secret}`)}`;
    } else if (apiKey) {
      headers["X-Api-Key"] = apiKey;
      if (secret) headers["X-Api-Secret"] = secret;
    }

    const upstream = await fetch(url.toString(), { headers, redirect: "follow" });
    if (!upstream.ok) {
      return json({ ok: false, error: `Upstream HTTP ${upstream.status}` }, 502);
    }

    const data = await upstream.json();
    return json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync failed";
    return json({ ok: false, error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
