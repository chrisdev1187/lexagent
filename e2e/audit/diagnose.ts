/**
 * Quick diagnostic: logs in as armin, captures network requests to see
 * where API calls are going and what they return.
 *
 * Run: npx tsx e2e/audit/diagnose.ts
 */
import { chromium } from "@playwright/test";

const BASE     = "https://lexagent-ochre.vercel.app";
const EMAIL    = process.env.E2E_EMAIL    ?? "armin@notadmin.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "ZAQxsw123";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  // Capture ALL network requests to /anthropic
  const captured: { url: string; status: number; body: string }[] = [];
  ctx.on("response", async (res) => {
    if (res.url().includes("anthropic") || res.url().includes("api/")) {
      try {
        const body = await res.text().catch(() => "(unreadable)");
        captured.push({ url: res.url(), status: res.status(), body: body.slice(0, 500) });
      } catch {}
    }
  });

  // Capture console errors
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warn") {
      console.log(`[console.${msg.type()}] ${msg.text()}`);
    }
  });

  console.log("→ Logging in as", EMAIL);
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder(/lawfirm|email/i).fill(EMAIL);
  await page.locator("input[type='password']").fill(PASSWORD);
  await page.locator("button[type='submit']").click();

  try {
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    console.log("✅ Login OK, URL:", page.url());
  } catch {
    console.error("❌ Login failed — current URL:", page.url());
    await browser.close();
    process.exit(1);
  }

  // Capture localStorage to see auth token
  const lsKeys = await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i) ?? "");
    return keys;
  });
  console.log("localStorage keys:", lsKeys.filter(k => k.startsWith("sb-") || k.includes("supabase")));

  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        try { return JSON.parse(localStorage.getItem(key) ?? "{}").access_token ?? ""; } catch { return ""; }
      }
    }
    return "";
  });
  console.log("Auth token present:", !!token, token ? `(${token.slice(0, 20)}...)` : "NONE");

  // Check what NEXT_PUBLIC_API_URL resolves to by checking where fetch goes
  console.log("\n→ Navigating to research page...");

  // Find a matter to use
  const matters = await page.evaluate(() => {
    const raw = localStorage.getItem("lex-matters");
    return raw ? JSON.parse(raw) : [];
  });
  console.log("Local matters count:", matters.length);

  if (matters.length === 0) {
    console.log("No matters in localStorage — skipping AI test");
  } else {
    const matterId = matters[0].id;
    console.log("Using matter:", matterId);
    await page.goto(`${BASE}/matters/${matterId}/research`);
    await page.waitForLoadState("networkidle");

    // Fill and send
    await page.locator("textarea").first().fill("What is wire fraud under 18 USC 1343?");
    await page.getByRole("button", { name: /research/i }).first().click();
    await page.waitForTimeout(8000);

    const proseText = await page.locator(".prose").last().innerText().catch(() => "(no prose)");
    console.log("\nResponse captured:", proseText.slice(0, 300));
  }

  console.log("\n=== Network requests captured ===");
  for (const r of captured) {
    console.log(`${r.status} ${r.url}`);
    console.log("  Body:", r.body.slice(0, 200));
  }

  await browser.close();
})();
