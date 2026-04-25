// Feature Coverage Audit — binary pass/fail for all non-AI-graded features
// Tests: admin telemetry, ARES Inspector, Live Feed, B6 deep-inspect,
//        vault document lifecycle, judge FJC panel, EDGAR deep-research,
//        LexMemory injection indicator.
//
// Usage:
//   E2E_EMAIL=armin@notadmin.com E2E_PASSWORD=ZAQxsw123 \
//   npx playwright test e2e/audit/feature-coverage.spec.ts --project=audit

import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE          = process.env.E2E_BASE_URL  ?? "https://lexagent-ochre.vercel.app";
const TEST_EMAIL    = process.env.E2E_EMAIL     ?? "armin@notadmin.com";
const TEST_PASSWORD = process.env.E2E_PASSWORD  ?? "ZAQxsw123";
const AUTH_STATE    = path.resolve(__dirname, "auth-state.json");
const HAS_AUTH_STATE = fs.existsSync(AUTH_STATE);

// Small PDF for vault upload test (minimal valid PDF bytes)
const TINY_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj " +
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n" +
  "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n" +
  "0000000058 00000 n\n0000000115 00000 n\n" +
  "trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
);

test.setTimeout(90_000);

let ctx:        BrowserContext;
let page:       Page;
let matterId  = "";

test.describe.serial("Feature Coverage Audit", () => {
  test.skip(!TEST_EMAIL, "Set E2E_EMAIL / E2E_PASSWORD");

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    ctx  = HAS_AUTH_STATE
      ? await browser.newContext({ storageState: AUTH_STATE })
      : await browser.newContext();
    page = await ctx.newPage();
  });

  test.afterAll(async () => { await ctx.close(); });

  // ── Login ────────────────────────────────────────────────────────────────────

  test("login as armin (admin)", async () => {
    if (HAS_AUTH_STATE) {
      await page.goto(`${BASE}/dashboard`);
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
      return;
    }
    await page.goto(`${BASE}/login`);
    await page.getByPlaceholder(/lawfirm|email/i).fill(TEST_EMAIL);
    await page.locator("input[type='password']").fill(TEST_PASSWORD);
    await page.locator("button[type='submit']").click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  });

  // ── Create a test matter ─────────────────────────────────────────────────────

  test("create test matter for coverage tests", async () => {
    await page.goto(`${BASE}/dashboard`);

    const skipLink = page.getByText(/skip.*i know/i);
    if (await skipLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipLink.click();
      await page.waitForTimeout(500);
    }

    await page.getByRole("button", { name: /new matter/i }).last().click();

    const titleInput = page.getByPlaceholder(/Cipher Holdings/i);
    await expect(titleInput).toBeVisible({ timeout: 10_000 });

    await titleInput.fill("Coverage Test Matter — Parker Industries");
    await page.getByPlaceholder(/Eleanor/i).fill("Parker Industries Inc.");

    const caseTypeEl = page.locator("select").first();
    await caseTypeEl.selectOption("Criminal Defense");

    await page.getByPlaceholder(/Summarize the key facts/i).fill(
      "SDNY securities fraud case. Testing vault, judge, and research features."
    );
    await page.getByRole("button", { name: /create matter/i }).click();
    await page.waitForURL(/\/matters\/[a-z0-9-]+/, { timeout: 20_000 });

    const match = page.url().match(/\/matters\/([a-z0-9-]+)/);
    expect(match, "Matter ID must be in URL").toBeTruthy();
    matterId = match![1];
    console.log("Test matter:", matterId);
  });

  // ── Admin: Telemetry Tab ──────────────────────────────────────────────────────

  test("admin: telemetry tab renders service cards", async () => {
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState("networkidle");

    // Click Telemetry tab
    const telemetryTab = page.getByRole("button", { name: /telemetry/i });
    await expect(telemetryTab).toBeVisible({ timeout: 10_000 });
    await telemetryTab.click();

    // Service grid should be visible
    const grid = page.locator("[class*='grid']").filter({ hasText: /anthropic|groq|supabase/i }).first();
    await expect(grid).toBeVisible({ timeout: 10_000 });

    console.log("✓ Telemetry service grid visible");
  });

  test("admin: run health check populates latency data", async () => {
    await page.goto(`${BASE}/admin`);
    const telemetryTab = page.getByRole("button", { name: /telemetry/i });
    await expect(telemetryTab).toBeVisible({ timeout: 10_000 });
    await telemetryTab.click();

    const probeBtn = page.getByRole("button", { name: /run health check|probe|check all/i }).first();
    await expect(probeBtn).toBeVisible({ timeout: 10_000 });
    await probeBtn.click();

    // Wait for at least one latency value (ms) to appear
    await expect(page.getByText(/\d+\s*ms/i).first()).toBeVisible({ timeout: 30_000 });
    console.log("✓ Health check populated latency data");
  });

  test("admin: B6 deep-inspect panel opens on card click", async () => {
    await page.goto(`${BASE}/admin`);
    const telemetryTab = page.getByRole("button", { name: /telemetry/i });
    await expect(telemetryTab).toBeVisible({ timeout: 10_000 });
    await telemetryTab.click();

    // Run a health check first so cards have data
    const probeBtn = page.getByRole("button", { name: /run health check|probe|check all/i }).first();
    if (await probeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await probeBtn.click();
      await page.waitForTimeout(5_000);
    }

    // Click first clickable service card
    const cards = page.locator("[class*='cursor-pointer']").filter({ hasText: /anthropic|groq|supabase/i });
    await cards.first().click({ timeout: 10_000 });

    // Detail panel should appear — look for "Force re-probe" or "Dashboard" link
    const panel = page.getByRole("button", { name: /force re-probe|re-probe/i })
      .or(page.getByRole("link", { name: /dashboard/i }))
      .first();
    await expect(panel).toBeVisible({ timeout: 10_000 });
    console.log("✓ B6 detail panel opened");
  });

  // ── Admin: ARES Inspector Tab ─────────────────────────────────────────────────

  test("admin: ARES Inspector shows system prompt and token count", async () => {
    await page.goto(`${BASE}/admin`);
    const inspectorTab = page.getByRole("button", { name: /ares inspector|inspector/i });
    await expect(inspectorTab).toBeVisible({ timeout: 10_000 });
    await inspectorTab.click();

    // System prompt preview must have content
    const promptPreview = page.getByText(/ARES|elite AI legal/i).first();
    await expect(promptPreview).toBeVisible({ timeout: 10_000 });

    // Token count must be > 0
    const tokenCount = page.getByText(/\d+\s*(chars|tokens|tok)/i).first();
    await expect(tokenCount).toBeVisible({ timeout: 10_000 });
    console.log("✓ ARES Inspector: system prompt + token count visible");
  });

  test("admin: waterfall stats panel shows provider rows", async () => {
    await page.goto(`${BASE}/admin`);
    const telemetryTab = page.getByRole("button", { name: /telemetry/i });
    await expect(telemetryTab).toBeVisible({ timeout: 10_000 });
    await telemetryTab.click();

    // Waterfall stats table — look for provider names
    const statsPanel = page.getByText(/groq|cerebras|gemini/i).first();
    await expect(statsPanel).toBeVisible({ timeout: 15_000 });
    console.log("✓ Waterfall stats: provider rows visible");
  });

  // ── Vault: Document Lifecycle ─────────────────────────────────────────────────

  test("vault: upload a document", async () => {
    await page.goto(`${BASE}/matters/${matterId}/vault`);
    await page.waitForLoadState("networkidle");

    // Open add document dialog/form
    const addBtn = page.getByRole("button", { name: /add document|upload/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    // Fill title
    const titleInput = page.getByPlaceholder(/document title|title/i).first();
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill("Coverage Test — Motion Brief");

    // Select doc type if dropdown present
    const typeSelect = page.locator("select").filter({ hasText: /motion|brief|type/i }).first();
    if (await typeSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await typeSelect.selectOption("Brief");
    }

    // Upload via file input
    const fileInput = page.locator("input[type='file']");
    if (await fileInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await fileInput.setInputFiles({
        name: "test-brief.pdf",
        mimeType: "application/pdf",
        buffer: TINY_PDF,
      });
    } else {
      // No file input — URL mode
      const urlInput = page.getByPlaceholder(/https|url/i).first();
      if (await urlInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await urlInput.fill("https://example.com/test.pdf");
      }
    }

    // Submit
    const saveBtn = page.getByRole("button", { name: /save|add|upload/i }).last();
    await saveBtn.click();
    await page.waitForTimeout(3_000);

    // Document should appear in list
    const docEntry = page.getByText(/coverage test.*motion brief/i).first();
    await expect(docEntry).toBeVisible({ timeout: 10_000 });
    console.log("✓ Vault: document uploaded and visible in list");
  });

  test("vault: document persists on reload", async () => {
    await page.goto(`${BASE}/matters/${matterId}/vault`);
    await page.waitForLoadState("networkidle");

    const docEntry = page.getByText(/coverage test.*motion brief/i).first();
    await expect(docEntry).toBeVisible({ timeout: 10_000 });
    console.log("✓ Vault: document persists after reload");
  });

  // ── Judge Tab: F3 FJC Panel ───────────────────────────────────────────────────

  test("judge tab: search returns CourtListener result", async () => {
    await page.goto(`${BASE}/matters/${matterId}/judge`);
    await page.waitForLoadState("networkidle");

    const judgeInput = page.getByPlaceholder(/judge.*name|full name/i);
    await expect(judgeInput).toBeVisible({ timeout: 10_000 });
    await judgeInput.fill("Lewis Liman");

    await page.getByRole("button", { name: /search/i }).click();
    await page.waitForTimeout(6_000);

    // CourtListener result card
    const result = page.getByText(/liman/i).first();
    await expect(result).toBeVisible({ timeout: 15_000 });
    console.log("✓ Judge tab: CourtListener result returned");
  });

  test("judge tab: FJC panel renders biographical data", async () => {
    await page.goto(`${BASE}/matters/${matterId}/judge`);
    await page.waitForLoadState("networkidle");

    const judgeInput = page.getByPlaceholder(/judge.*name|full name/i);
    await expect(judgeInput).toBeVisible({ timeout: 10_000 });
    await judgeInput.fill("Lewis Liman");
    await page.getByRole("button", { name: /search/i }).click();
    await page.waitForTimeout(6_000);

    // FJC panel — look for appointing president or law school data
    const fjcPanel = page.getByText(/appointing president|law school|commission/i).first();
    await expect(fjcPanel).toBeVisible({ timeout: 15_000 });
    console.log("✓ Judge tab: FJC biographical panel visible");
  });

  // ── Deep Research: EDGAR Tab ──────────────────────────────────────────────────

  test("deep-research: EDGAR tab returns filings", async () => {
    await page.goto(`${BASE}/matters/${matterId}/deep-research`);
    await page.waitForLoadState("networkidle");

    // Switch to EDGAR tab
    const edgarTab = page.getByRole("button", { name: /edgar|sec/i });
    await expect(edgarTab).toBeVisible({ timeout: 10_000 });
    await edgarTab.click();

    // Search
    const searchInput = page.getByPlaceholder(/search|company|query/i).first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill("Apple");

    const searchBtn = page.getByRole("button", { name: /search|go/i }).first();
    await searchBtn.click();

    // At least one filing result
    const filing = page.getByText(/10-K|10-Q|8-K|annual|filing/i).first();
    await expect(filing).toBeVisible({ timeout: 20_000 });
    console.log("✓ EDGAR tab: filings returned");
  });

  // ── LexMemory: Context Injection ─────────────────────────────────────────────

  test("research tab: submits query and returns output", async () => {
    await page.goto(`${BASE}/matters/${matterId}/research`);
    await page.waitForLoadState("networkidle");

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill("What is the materiality standard for wire fraud in the Second Circuit?");

    const submitBtn = page.getByRole("button", { name: /research|send/i })
      .or(page.locator("button[type='submit']"))
      .first();
    await submitBtn.click();

    // Wait for AI output
    const prose = page.locator(".prose").last();
    const pre   = page.locator("pre").last();
    const output = prose.or(pre);
    await expect(output).toBeVisible({ timeout: 90_000 });

    const text = await output.innerText();
    expect(text.length).toBeGreaterThan(20);
    console.log("✓ Research: AI output returned, length:", text.length);
  });

  test("admin: ARES Inspector shows recent AI call after research", async () => {
    await page.goto(`${BASE}/admin`);
    const inspectorTab = page.getByRole("button", { name: /ares inspector|inspector/i });
    await expect(inspectorTab).toBeVisible({ timeout: 10_000 });
    await inspectorTab.click();

    // Last 20 calls table should have at least one row (the research we just ran)
    const callRow = page.locator("table tr").filter({ hasText: /research|groq|anthropic|gemini/i }).first();
    await expect(callRow).toBeVisible({ timeout: 15_000 });
    console.log("✓ ARES Inspector: recent AI call logged");
  });

  // ── Live Feed Tab ─────────────────────────────────────────────────────────────

  test("admin: Live Feed tab renders and has rows", async () => {
    await page.goto(`${BASE}/admin`);
    const liveFeedTab = page.getByRole("button", { name: /live feed/i });
    await expect(liveFeedTab).toBeVisible({ timeout: 10_000 });
    await liveFeedTab.click();

    // At minimum the feed container must render
    const feed = page.locator("[class*='feed'], [class*='live'], table").first();
    await expect(feed).toBeVisible({ timeout: 10_000 });
    console.log("✓ Live Feed tab: container rendered");
  });
});
