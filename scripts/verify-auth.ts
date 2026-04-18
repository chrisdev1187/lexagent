/**
 * Standalone smoke test — verifies admin credentials work end-to-end via anon key.
 * Run this after seed:admin to confirm login actually works before touching the browser.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_ANON_KEY=... npx tsx scripts/verify-auth.ts
 *   (SUPABASE_ANON_KEY falls back to the hardcoded project key if not set)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://mgiqicasllvisiwvbiuu.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? "";

const ACCOUNTS = [
  { email: "drwillybum@gmail.com",        password: "P@ssword1212*#*#" },
  { email: "christiaanbothma47@gmail.com", password: "P@ssword1212*#*#" },
];

async function main() {
  console.log("=== LexAgent verify-auth ===\n");

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let passed = 0;
  let failed = 0;

  for (const { email, password } of ACCOUNTS) {
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      const reason = error?.message ?? "No session returned";
      console.error(`  FAIL  ${email}`);
      console.error(`        Reason: ${reason}`);

      if (reason.toLowerCase().includes("invalid login")) {
        console.error(`        → User likely has no auth.identities row. Re-run: pnpm seed:admin`);
      } else if (reason.toLowerCase().includes("email not confirmed")) {
        console.error(`        → Email not confirmed. Re-run: pnpm seed:admin (forces email_confirm)`);
      } else if (reason.toLowerCase().includes("429") || reason.toLowerCase().includes("rate")) {
        console.error(`        → Rate limited. Wait 60s and retry.`);
      }

      failed++;
    } else {
      console.log(`  PASS  ${email} (token: ${data.session.access_token.slice(0, 20)}…)`);
      await anonClient.auth.signOut();
      passed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
  console.log("✓ All credentials verified. Login should work in the browser.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
