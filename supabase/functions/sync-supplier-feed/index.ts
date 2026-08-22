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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const upstream = await fetch(url.toString(), { headers });
    if (!upstream.ok) {
      return json(
        { ok: false, error: `Upstream HTTP ${upstream.status}` },
        502,
      );
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
