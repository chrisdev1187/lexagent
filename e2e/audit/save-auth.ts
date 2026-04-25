/**
 * Run this once to log in manually and save your session.
 * Then run the audit with: npx playwright test --project=audit --headed
 *
 * Usage:
 *   npx ts-node --esm e2e/audit/save-auth.ts
 *   -- OR --
 *   npx tsx e2e/audit/save-auth.ts
 */

import { chromium } from "@playwright/test";
import * as path from "path";

const BASE       = process.env.E2E_BASE_URL ?? "https://lexagent-ochre.vercel.app";
const STATE_FILE = path.resolve(__dirname, "auth-state.json");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  console.log("\n🔐 Opening browser — log in manually, then come back here.\n");
  await page.goto(`${BASE}/login`);

  // Wait until the URL changes away from /login (i.e. you've logged in)
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 120_000,
  });

  console.log("✅ Login detected. Saving session to", STATE_FILE);
  await ctx.storageState({ path: STATE_FILE });

  console.log("✅ Auth state saved. You can close this window.\n");
  console.log("Now run the audit:\n");
  console.log("  npx playwright test --project=audit --reporter=list --headed\n");

  await browser.close();
})();
