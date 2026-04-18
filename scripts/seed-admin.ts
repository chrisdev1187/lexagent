/**
 * Seed script: create/repair admin accounts using the Supabase Admin API.
 *
 * WHY the Admin API and not raw SQL:
 *   Supabase requires an `auth.identities` row for every user — without it,
 *   signInWithPassword always returns "Invalid login credentials" even if the
 *   password hash in `auth.users` is correct. The Admin API creates both rows
 *   atomically; raw SQL inserts into `auth.users` alone will always break login.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-admin.ts
 *   (or: pnpm seed:admin  — see root package.json)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://mgiqicasllvisiwvbiuu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Get it from: Supabase Dashboard → Project Settings → API → service_role key\n" +
    "Then run: SUPABASE_SERVICE_ROLE_KEY=<key> pnpm seed:admin"
  );
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMINS = [
  { email: "drwillybum@gmail.com",        password: "P@ssword1212*#*#" },
  { email: "christiaanbothma47@gmail.com", password: "P@ssword1212*#*#" },
];

async function upsertAdmin(email: string, password: string): Promise<string> {
  // Try to create — if user already exists Supabase returns a specific error
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId: string;

  if (createErr) {
    const msg = createErr.message ?? "";
    if (createErr.status === 401) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is invalid or is the anon key. " +
        "Check Supabase Dashboard → Project Settings → API → service_role."
      );
    }

    // User already exists — find them via the DB and update
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate") || createErr.status === 422) {
      console.log(`  [exists]  ${email} — resetting password via admin update`);

      // Look up by querying auth.users directly via service role
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
      );
      const json = await res.json() as { users?: { id: string; identities?: unknown[] }[] };
      const existing = json.users?.[0];

      if (!existing) {
        throw new Error(`User ${email} exists but could not be fetched. Try deleting them in Supabase Dashboard → Auth → Users and re-running.`);
      }

      userId = existing.id;

      // Check for missing identities (orphan from raw SQL seed)
      if (!existing.identities || existing.identities.length === 0) {
        console.log(`  [repair]  No identities row — deleting orphan and re-creating`);
        const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
        if (delErr) throw new Error(`deleteUser ${email}: ${delErr.message}`);

        const { data: recreated, error: reErr } = await adminClient.auth.admin.createUser({
          email, password, email_confirm: true,
        });
        if (reErr) throw new Error(`re-createUser ${email}: ${reErr.message}`);
        userId = recreated.user.id;
        console.log(`  [created] ${email} → ${userId} (repaired with identities)`);
      } else {
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
        if (updateErr) throw new Error(`updateUser ${email}: ${updateErr.message}`);
        console.log(`  [updated] password reset + email confirmed`);
      }
    } else {
      throw new Error(`createUser ${email}: ${msg}`);
    }
  } else {
    userId = created.user.id;
    console.log(`  [created] ${email} → ${userId}`);
  }

  // Upsert user_roles → admin + premium
  const { error: roleErr } = await adminClient
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin", plan_id: "premium" }, { onConflict: "user_id" });

  if (roleErr) {
    if (roleErr.code === "42P01") {
      throw new Error(
        `user_roles table not found. Run 003_monetisation.sql in Supabase SQL editor first, then retry.`
      );
    }
    throw new Error(`user_roles upsert ${email}: ${roleErr.message}`);
  }
  console.log(`  [role]    admin / premium`);

  return userId;
}

async function verifyLogin(email: string, password: string): Promise<boolean> {
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error(`  [verify]  FAIL — ${error?.message ?? "no session"}`);
    return false;
  }
  console.log(`  [verify]  PASS (token: ${data.session.access_token.slice(0, 20)}…)`);
  await anonClient.auth.signOut();
  return true;
}

async function checkPlans(): Promise<void> {
  const { data: plans, error } = await adminClient.from("plans").select("id");
  if (error) {
    if (error.code === "42P01") {
      throw new Error(
        "plans table not found. Run these in Supabase SQL editor first:\n" +
        "  1. supabase/migrations/001_init.sql\n" +
        "  2. supabase/migrations/002_rls.sql\n" +
        "  3. supabase/migrations/003_monetisation.sql"
      );
    }
    throw new Error(`Cannot read plans: ${error.message}`);
  }
  const ids = plans?.map((p) => p.id) ?? [];
  if (!ids.includes("premium")) {
    throw new Error(
      `"premium" plan not found in plans table (found: ${ids.join(", ") || "none"}). ` +
      "Run 003_monetisation.sql in Supabase SQL editor."
    );
  }
  console.log(`  Plans OK: ${ids.join(", ")}`);
}

async function main() {
  console.log("=== LexAgent seed-admin ===\n");

  console.log("Pre-flight: checking plans table…");
  await checkPlans();
  console.log();

  let allVerified = true;

  for (const { email, password } of ADMINS) {
    console.log(`── ${email}`);
    await upsertAdmin(email, password);
    const ok = await verifyLogin(email, password);
    if (!ok) allVerified = false;
    console.log();
  }

  if (!allVerified) {
    console.error(
      "One or more logins failed verification.\n" +
      "If Supabase Dashboard → Auth → Providers → Email still has 'Confirm email' enabled,\n" +
      "disable it for testing (Auth → Providers → Email → toggle off 'Confirm email').\n" +
      "Then re-run: pnpm seed:admin"
    );
    process.exit(1);
  }

  console.log("✓ All admins seeded and verified. You can now log in at /login.");
}

main().catch((err) => {
  console.error("\nError:", err.message ?? err);
  process.exit(1);
});
