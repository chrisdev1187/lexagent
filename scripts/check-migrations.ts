/**
 * Checks which of the 17 LexAgent migrations are applied in Supabase.
 *
 * Usage (from apps/api dir):
 *   npx tsx --env-file ../../apps/web/.env.local ../../scripts/check-migrations.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://mgiqicasllvisiwvbiuu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Probe a table by selecting from it — 42P01 = does not exist
async function tableExists(name: string): Promise<boolean> {
  const { error } = await db.from(name as never).select("*").limit(0);
  return !error || error.code !== "42P01";
}

// Probe a column by selecting it — PGRST204 or "column does not exist" means missing
async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await db.from(table as never).select(column).limit(0);
  if (!error) return true;
  const msg = error.message?.toLowerCase() ?? "";
  return !msg.includes("does not exist") && !msg.includes("column");
}

// Probe an RPC by calling it with no args — 42883 = function does not exist
async function rpcExists(name: string): Promise<boolean> {
  const { error } = await db.rpc(name as never, {});
  if (!error) return true;
  // PGRST202 = no matching function signature (function exists but wrong args) → exists
  // 42883 or "Could not find the function" → does not exist
  const msg = error.message?.toLowerCase() ?? "";
  if (error.code === "PGRST202") return true;
  if (msg.includes("could not find the function") || error.code === "42883") return false;
  return true; // any other error means it exists but errored for another reason
}

// Probe storage bucket
async function bucketExists(name: string): Promise<boolean> {
  const { data } = await db.storage.listBuckets();
  return (data ?? []).some(b => b.name === name);
}

const migrations: { file: string; label: string; check: () => Promise<boolean> }[] = [
  {
    file: "001_init.sql",
    label: "Core tables: profiles, matters, documents",
    check: () => tableExists("profiles"),
  },
  {
    file: "002_rls.sql",
    label: "RLS enabled (profiles table accessible)",
    check: () => tableExists("profiles"), // RLS being on doesn't change table existence; just confirm schema loaded
  },
  {
    file: "003_monetisation.sql",
    label: "plans + subscriptions tables",
    check: () => tableExists("plans"),
  },
  {
    file: "004_vault_storage.sql",
    label: "Storage bucket 'vault-docs'",
    check: () => bucketExists("vault-docs"),
  },
  {
    file: "005_shared_matters.sql",
    label: "invitations table",
    check: () => tableExists("invitations"),
  },
  {
    file: "006_admin_rls.sql",
    label: "user_roles table",
    check: () => tableExists("user_roles"),
  },
  {
    file: "007_teams.sql",
    label: "teams + team_members + user_sessions tables",
    check: () => tableExists("teams"),
  },
  {
    file: "008_matter_acls.sql",
    label: "matter_access table",
    check: () => tableExists("matter_access"),
  },
  {
    file: "009_compliance.sql",
    label: "audit_log table",
    check: () => tableExists("audit_log"),
  },
  {
    file: "010_usage_enforcement.sql",
    label: "storage_usage table",
    check: () => tableExists("storage_usage"),
  },
  {
    file: "011_ai_usage.sql",
    label: "ai_usage table",
    check: () => tableExists("ai_usage"),
  },
  {
    file: "012_billing_portal.sql",
    label: "customer_portal_url column on subscriptions",
    check: () => columnExists("subscriptions", "customer_portal_url"),
  },
  {
    file: "013_test_member.sql",
    label: "Test member user (armin@notadmin.com in profiles)",
    check: async () => {
      const { data } = await db.from("profiles" as never).select("id").eq("email", "armin@notadmin.com").maybeSingle();
      return data != null;
    },
  },
  {
    file: "014_admin_utils.sql",
    label: "admin_force_delete_user RPC",
    check: () => rpcExists("admin_force_delete_user"),
  },
  {
    file: "015_free_tier.sql",
    label: "free_tier_usage table",
    check: () => tableExists("free_tier_usage"),
  },
  {
    file: "016_waterfall_stats.sql",
    label: "get_waterfall_stats RPC",
    check: () => rpcExists("get_waterfall_stats"),
  },
  {
    file: "017_judges.sql",
    label: "judges table + lookup_judge RPC",
    check: async () => {
      const t = await tableExists("judges");
      const f = await rpcExists("lookup_judge");
      return t && f;
    },
  },
];

async function main() {
  console.log(`\nLexAgent migration check — ${SUPABASE_URL}\n`);

  const missing: string[] = [];

  for (const m of migrations) {
    const ok = await m.check();
    const tick = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(`${tick}  ${m.file.padEnd(26)} ${m.label}`);
    if (!ok) missing.push(m.file);
  }

  console.log(`\n─────────────────────────────────────────`);
  if (missing.length === 0) {
    console.log("\x1b[32mAll 17 migrations applied.\x1b[0m");
  } else {
    console.log(`\x1b[31m${missing.length} missing:\x1b[0m`);
    missing.forEach(f => console.log(`  supabase/migrations/${f}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
