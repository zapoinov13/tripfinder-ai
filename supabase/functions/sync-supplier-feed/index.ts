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

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "::1",
  "[::]",
  "::",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

/** IPv4 в десятичной, восьмеричной и шестнадцатеричной записи → четыре октета. */
function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  const toNum = (p: string): number | null => {
    if (!p.length) return null;
    if (/^0[xX][0-9a-fA-F]+$/.test(p)) return parseInt(p, 16);
    if (/^0[0-7]+$/.test(p)) return parseInt(p, 8);
    if (/^\d+$/.test(p)) return parseInt(p, 10);
    return null;
  };

  if (parts.length === 4) {
    const nums = parts.map(toNum);
    if (nums.some((n) => n === null || n < 0 || n > 255)) return null;
    return nums as number[];
  }

  // http://2130706433/ — тот же 127.0.0.1
  if (parts.length === 1) {
    const n = toNum(parts[0]!);
    if (n === null || n < 0 || n > 0xffffffff) return null;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }

  return null;
}

function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, включая metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true; // unique local fc00::/7
  // IPv4-mapped: ::ffff:169.254.169.254
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    const octets = parseIpv4(mapped[1]!);
    return octets ? isPrivateIpv4(octets) : true;
  }
  return false;
}

function isBlockedTarget(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return true;
  }
  if (host.includes(":") || host.startsWith("[")) return isPrivateIpv6(host);

  const octets = parseIpv4(host);
  if (octets) return isPrivateIpv4(octets);

  return false;
}

/**
 * Имя может резолвиться в приватный адрес (DNS rebinding, *.nip.io и т.п.),
 * поэтому дополнительно проверяем то, что вернул резолвер. В песочнице
 * Deno.resolveDns может быть недоступен — тогда остаёмся на проверке хоста.
 */
async function resolvesToPrivate(hostname: string): Promise<boolean> {
  if (parseIpv4(hostname) || hostname.includes(":")) return false; // уже проверено литералом
  try {
    const [v4, v6] = await Promise.all([
      Deno.resolveDns(hostname, "A").catch(() => [] as string[]),
      Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]),
    ]);
    for (const ip of v4) {
      const octets = parseIpv4(ip);
      if (octets && isPrivateIpv4(octets)) return true;
    }
    for (const ip of v6) {
      if (isPrivateIpv6(ip)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function assertPublicTarget(url: URL): Promise<string | null> {
  if (!["http:", "https:"].includes(url.protocol)) {
    return "only http(s) endpoints allowed";
  }
  if (isBlockedTarget(url)) return "endpoint host not allowed";
  if (await resolvesToPrivate(url.hostname)) return "endpoint resolves to a private address";
  return null;
}

/**
 * Редиректы разворачиваем вручную: с redirect:"follow" достаточно было отдать
 * публичный URL, который 302-редиректит на 169.254.169.254, и блок-лист
 * переставал что-либо значить.
 */
async function fetchFeed(
  startUrl: URL,
  headers: Record<string, string>,
): Promise<{ ok: true; response: Response } | { ok: false; error: string; status: number }> {
  let url = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const blocked = await assertPublicTarget(url);
    if (blocked) return { ok: false, error: blocked, status: 400 };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (err) {
      const message = err instanceof Error && err.name === "AbortError" ? "upstream timeout" : "upstream unreachable";
      return { ok: false, error: message, status: 504 };
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) return { ok: false, error: "redirect without location", status: 502 };
      try {
        url = new URL(location, url);
      } catch {
        return { ok: false, error: "invalid redirect target", status: 502 };
      }
      continue;
    }

    return { ok: true, response: res };
  }

  return { ok: false, error: "too many redirects", status: 502 };
}

async function readJsonCapped(res: Response): Promise<unknown> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new Error("feed too large");

  const reader = res.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("feed too large");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(merged));
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

    const fetched = await fetchFeed(url, headers);
    if (!fetched.ok) {
      return json({ ok: false, error: fetched.error }, fetched.status);
    }

    const upstream = fetched.response;
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return json({ ok: false, error: `Upstream HTTP ${upstream.status}` }, 502);
    }

    const data = await readJsonCapped(upstream);
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
