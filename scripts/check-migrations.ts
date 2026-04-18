/**
 * Verify that all required migrations have been applied to the live Supabase project.
 * Usage: SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/check-migrations.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://mgiqicasllvisiwvbiuu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const REQUIRED_TABLES: { table: string; migration: string }[] = [
  { table: "profiles",       migration: "001_init.sql" },
  { table: "matters",        migration: "001_init.sql" },
  { table: "documents",      migration: "001_init.sql" },
  { table: "logs",           migration: "001_init.sql" },
  { table: "plans",          migration: "003_monetisation.sql" },
  { table: "user_roles",     migration: "003_monetisation.sql" },
  { table: "subscriptions",  migration: "003_monetisation.sql" },
  { table: "usage_events",   migration: "003_monetisation.sql" },
  { table: "usage_monthly",  migration: "003_monetisation.sql" },
  { table: "premium_leads",  migration: "003_monetisation.sql" },
];

async function main() {
  console.log("=== LexAgent check-migrations ===\n");

  const { data, error } = await supabase
    .from("information_schema.tables" as never)
    .select("table_name")
    .eq("table_schema", "public");

  if (error) {
    // Fallback: query each table directly
    console.log("information_schema query blocked by RLS — probing tables directly...\n");
    let missing = 0;
    for (const { table, migration } of REQUIRED_TABLES) {
      const { error: tErr } = await supabase.from(table as never).select("*").limit(0);
      if (tErr && tErr.code === "42P01") {
        console.error(`  MISSING  ${table.padEnd(20)} ← run supabase/migrations/${migration}`);
        missing++;
      } else {
        console.log(`  OK       ${table}`);
      }
    }
    if (missing > 0) {
      console.error(`\n${missing} table(s) missing. Run the indicated migrations in Supabase SQL editor first.`);
      process.exit(1);
    }
    console.log("\n✓ All tables present.");
    return;
  }

  const existing = new Set((data as { table_name: string }[]).map((r) => r.table_name));
  let missing = 0;

  for (const { table, migration } of REQUIRED_TABLES) {
    if (existing.has(table)) {
      console.log(`  OK       ${table}`);
    } else {
      console.error(`  MISSING  ${table.padEnd(20)} ← run supabase/migrations/${migration}`);
      missing++;
    }
  }

  if (missing > 0) {
    console.error(`\n${missing} table(s) missing. Run the indicated migrations in Supabase SQL editor first.`);
    process.exit(1);
  }

  console.log("\n✓ All tables present. Safe to run seed:admin.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
