/**
 * Seed script: create admin accounts and verify plan rows exist.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-admin.ts
 *
 * The service role key bypasses RLS — never expose it client-side.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMINS = [
  { email: "drwillybum@gmail.com",        password: "P@ssword1212*#*#" },
  { email: "christiaanbothma47@gmail.com", password: "P@ssword1212*#*#" },
];

async function upsertAdmin(email: string, password: string) {
  // Check if user already exists
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);

  let userId: string;

  if (existing) {
    console.log(`[skip] ${email} already exists (${existing.id})`);
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    userId = data.user.id;
    console.log(`[created] ${email} → ${userId}`);
  }

  // Upsert user_roles to admin + premium plan
  const { error: roleErr } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin", plan_id: "premium" }, { onConflict: "user_id" });

  if (roleErr) throw new Error(`user_roles upsert ${email}: ${roleErr.message}`);
  console.log(`[role] ${email} → admin / premium`);
}

async function main() {
  console.log("=== LexAgent seed-admin ===\n");

  // Verify plans exist (migration 003 must have been run first)
  const { data: plans, error: plansErr } = await supabase.from("plans").select("id");
  if (plansErr) {
    console.error("Cannot read plans table — have you run 003_monetisation.sql?");
    process.exit(1);
  }
  console.log(`Plans found: ${plans?.map((p) => p.id).join(", ")}\n`);

  for (const { email, password } of ADMINS) {
    await upsertAdmin(email, password);
  }

  console.log("\n✓ Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
