/**
 * Targeted diagnostic: intercepts API calls as armin and logs responses.
 * Run: npx tsx e2e/audit/diagnose2.ts
 */
import { chromium } from "@playwright/test";

const BASE     = "https://lexagent-ochre.vercel.app";
const RENDER   = "https://lexagent-0o5u.onrender.com";
const EMAIL    = "armin@notadmin.com";
const PASSWORD = "ZAQxsw123";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  // Intercept every request/response
  const log: string[] = [];
  ctx.on("request",  r  => { if (r.url().includes(RENDER) || r.url().includes("anthropic")) log.push(`→ ${r.method()} ${r.url()}`); });
  ctx.on("response", async r => {
    if (r.url().includes(RENDER) || r.url().includes("anthropic")) {
      const body = await r.text().catch(() => "(unreadable)");
      log.push(`← ${r.status()} ${r.url().split("?")[0]}\n   ${body.slice(0, 400)}`);
    }
  });
  page.on("console", msg => {
    if (["error","warn","info"].includes(msg.type()))
      log.push(`[console.${msg.type()}] ${msg.text()}`);
  });

  // Step 1: Login
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder(/lawfirm|email/i).fill(EMAIL);
  await page.locator("input[type='password']").fill(PASSWORD);
  await page.locator("button[type='submit']").click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  console.log("✅ Login OK");
  log.length = 0; // clear login noise

  // Step 2: Create a matter via the API directly
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        try { return JSON.parse(localStorage.getItem(k) ?? "{}").access_token ?? ""; } catch { return ""; }
      }
    }
    return "";
  });
  console.log("Token:", token ? token.slice(0, 30) + "..." : "MISSING");

  // Step 3: Direct API test from Node (not browser context)
  console.log("\n=== Direct API test from Node ===");
  try {
    const res = await fetch(`${RENDER}/api/anthropic/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "auto",
        max_tokens: 100,
        messages: [{ role: "user", content: "Say hello in one sentence." }],
      }),
    });
    const body = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", body.slice(0, 500));
  } catch (e) {
    console.error("Fetch failed:", e);
  }

  // Step 4: Navigate to dashboard and make a research request in-browser
  console.log("\n=== In-browser research test ===");
  await page.waitForTimeout(2000);
  const matters = await page.evaluate(() => {
    const raw = localStorage.getItem("lex4-cases");
    return raw ? JSON.parse(raw) : [];
  });

  if (matters.length > 0) {
    const mid = matters[0].id;
    console.log("Using matter:", mid);
    await page.goto(`${BASE}/matters/${mid}/research`);
    await page.waitForLoadState("networkidle");
    await page.locator("textarea").first().fill("What is wire fraud?");
    await page.getByRole("button", { name: /research/i }).first().click();
    await page.waitForTimeout(6000);
    const prose = await page.locator(".prose").last().innerText().catch(() => "no .prose");
    console.log("Research output:", prose.slice(0, 300));
  } else {
    console.log("No matters in localStorage (stored in Supabase only)");
    console.log("Skipping in-browser test");
  }

  console.log("\n=== All API calls captured ===");
  log.forEach(l => console.log(l));
  await browser.close();
})();
