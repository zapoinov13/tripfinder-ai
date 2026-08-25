#!/usr/bin/env node
/**
 * Ensures the platform owner exists in Supabase Auth with PLATFORM_ADMIN role.
 *
 * Пароль НИКОГДА не хранится в репозитории — только в переменной окружения.
 *
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 * OWNER_EMAIL=... OWNER_PASSWORD=... node scripts/ensure-owner-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const password = process.env.OWNER_PASSWORD ?? "";
const name = process.env.OWNER_NAME ?? "Владелец платформы";

if (!email) {
  console.error("Set OWNER_EMAIL");
  process.exit(1);
}

if (password.length < 12) {
  console.error(
    "Set OWNER_PASSWORD (минимум 12 символов). Пароль администратора не должен попадать в репозиторий.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
let authUser = list?.users?.find((u) => u.email?.toLowerCase() === email);

if (!authUser) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, city: "Алматы" },
    app_metadata: { role: "PLATFORM_ADMIN" },
  });
  if (error) throw new Error(error.message);
  authUser = data.user;
  console.log("Created auth user:", email);
} else {
  await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    app_metadata: { role: "PLATFORM_ADMIN" },
  });
  console.log("Updated auth user:", email);
}

const { error: profileError } = await admin.from("profiles").upsert(
  {
    id: authUser.id,
    email,
    name,
    city: "Алматы",
    role: "PLATFORM_ADMIN",
    status: "active",
    organization_id: null,
  },
  { onConflict: "id" },
);

if (profileError) throw new Error(profileError.message);

console.log("Admin ready:", email, "→ /admin");
