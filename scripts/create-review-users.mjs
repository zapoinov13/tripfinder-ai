#!/usr/bin/env node
/**
 * Creates App Store / Google Play review users in Supabase Auth + profiles.
 *
 * Usage:
 *   SUPABASE_URL=https://mgyufoyornzbwvgdfojb.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   REVIEW_PASSWORD='...' \
 *   node scripts/create-review-users.mjs
 *
 * Пароль демо-аккаунтов задаётся через REVIEW_PASSWORD и попадает только в
 * store/review-notes.txt (этот файл в сторы отдаётся вручную), но не в код.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.REVIEW_PASSWORD ?? "";

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (password.length < 12) {
  console.error("Set REVIEW_PASSWORD (минимум 12 символов)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const reviewUsers = [
  {
    email: "tourist@test.tourgo.app",
    password,
    name: "Review Tourist",
    role: "TOURIST",
  },
  {
    email: "operator@test.tourgo.app",
    password,
    name: "Review Operator",
    role: "OPERATOR_ADMIN",
  },
];

async function ensureUser(user) {
  const email = user.email.toLowerCase();

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let authUser = list?.users?.find((u) => u.email?.toLowerCase() === email);

  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    authUser = data.user;
    console.log("Created auth user:", email);
  } else {
    await admin.auth.admin.updateUserById(authUser.id, {
      password: user.password,
      email_confirm: true,
    });
    console.log("Updated auth user:", email);
  }

  let orgId = null;
  if (user.role.startsWith("OPERATOR")) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id")
      .eq("status", "approved")
      .limit(1);
    orgId = orgs?.[0]?.id ?? null;
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: authUser.id,
      email,
      name: user.name,
      city: "Алматы",
      role: user.role,
      status: "active",
      organization_id: orgId,
    },
    { onConflict: "id" },
  );

  if (profileError) throw new Error(`${email} profile: ${profileError.message}`);
  console.log("Profile OK:", email, user.role);
}

async function main() {
  for (const user of reviewUsers) {
    await ensureUser(user);
  }
  console.log("\nReview accounts ready:");
  console.log("  tourist@test.tourgo.app");
  console.log("  operator@test.tourgo.app");
  console.log("  пароль: значение REVIEW_PASSWORD (в логи не пишем)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
