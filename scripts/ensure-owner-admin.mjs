/**
 * Создаёт или поднимает до PLATFORM_ADMIN пользователя zapoinov@bk.ru в Supabase Auth.
 * Запуск: node scripts/ensure-owner-admin.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env["VITE_SUPABASE_URL"];
const key = env["VITE_SUPABASE_PUBLISHABLE_KEY"];
if (!url || !key) {
  console.error("Нет VITE_SUPABASE_URL или VITE_SUPABASE_PUBLISHABLE_KEY в .env");
  process.exit(1);
}

const email = "zapoinov@bk.ru";
const password = "zapoinov@bk.ru";
const name = "Юрий Запойнов";

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const signup = await sb.auth.signUp({
  email,
  password,
  options: { data: { name, city: "Алматы" } },
});

if (signup.error && !/already|registered|exists/i.test(signup.error.message)) {
  console.error("signUp:", signup.error.message);
}

const signed = await sb.auth.signInWithPassword({ email, password });
if (signed.error || !signed.data.user) {
  console.error("signIn:", signed.error?.message ?? "нет сессии");
  console.error("Если почту нужно подтвердить, выполните supabase/seed.sql в SQL Editor.");
  process.exit(1);
}

const userId = signed.data.user.id;
const { error: profileError } = await sb
  .from("profiles")
  .update({
    role: "PLATFORM_ADMIN",
    name,
    city: "Алматы",
    status: "active",
    email,
  })
  .eq("id", userId);

if (profileError) {
  console.error("profiles.update:", profileError.message);
  process.exit(1);
}

const { data: profile } = await sb.from("profiles").select("email, role, status, name").eq("id", userId).maybeSingle();
console.log("Готово:", profile ?? { id: userId, email, role: "PLATFORM_ADMIN" });
