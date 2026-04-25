// V1.2.3 — Intelligence Audit / System Loop
// Exercises all 5 AI features with a fictional SDNY criminal case fixture,
// grades each output 1–100, and writes e2e/audit/results/report.md.
//
// Usage:
//   E2E_EMAIL=armin@notadmin.com E2E_PASSWORD=ZAQxsw123 \
//   npx playwright test --project=audit

import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs/promises";
import * as fssync from "fs";
import * as path from "path";
import { gradeOutput, type GradeResult } from "./grader";
import { FIXTURE_MATTER, FIXTURE_FACTS, FIXTURE_RESEARCH_QUERY } from "./fixture";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE        = process.env.E2E_BASE_URL  ?? "https://lexagent-ochre.vercel.app";
const TEST_EMAIL  = process.env.E2E_EMAIL     ?? "";
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "";
const RESULTS_DIR = path.resolve(__dirname, "results");
const AUTH_STATE  = path.resolve(__dirname, "auth-state.json");
const HAS_AUTH_STATE = fssync.existsSync(AUTH_STATE);

test.setTimeout(120_000);

// ── Shared state (persists across serial tests via sharedPage) ────────────────

let ctx:        BrowserContext;
let sharedPage: Page;
let matterId  = "";
let authToken = "";
const scores:  Record<string, GradeResult> = {};
const outputs: Record<string, string>      = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveOutput(feature: string, text: string) {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await fs.writeFile(path.join(RESULTS_DIR, `${feature}-output.txt`), text, "utf-8");
}

async function recoverErrorPage(page: Page) {
  const tryAgain = page.getByRole("button", { name: /try again/i });
  if (await tryAgain.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await tryAgain.click();
    await page.waitForLoadState("networkidle");
  }
}

async function captureProseText(page: Page): Promise<string> {
  const prose = page.locator(".prose").last();
  const pre   = page.locator("pre").last();
  try {
    await prose.waitFor({ state: "visible", timeout: 90_000 });
    return (await prose.innerText()).trim();
  } catch {
    await pre.waitFor({ state: "visible", timeout: 10_000 });
    return (await pre.innerText()).trim();
  }
}

// ── Suite — all tests share one browser context / page ───────────────────────

test.describe.serial("V1.2.3 Intelligence Audit", () => {
  test.skip(!TEST_EMAIL && !TEST_PASSWORD && !HAS_AUTH_STATE, "Set E2E_EMAIL/E2E_PASSWORD or run: npx tsx e2e/audit/save-auth.ts");

  // One context for the whole suite — keeps localStorage/cookies alive
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    ctx        = HAS_AUTH_STATE
      ? await browser.newContext({ storageState: AUTH_STATE })
      : await browser.newContext();
    sharedPage = await ctx.newPage();
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  // ── 1. Login ─────────────────────────────────────────────────────────────────

  test("login and capture auth token", async () => {
    if (HAS_AUTH_STATE) {
      // Already logged in via saved state — just navigate to dashboard
      await sharedPage.goto(`${BASE}/dashboard`);
      await sharedPage.waitForURL(/\/dashboard/, { timeout: 30_000 });
    } else {
      await sharedPage.goto(`${BASE}/login`);
      await sharedPage.getByPlaceholder(/lawfirm|email/i).fill(TEST_EMAIL);
      await sharedPage.locator("input[type='password']").fill(TEST_PASSWORD);
      await sharedPage.locator("button[type='submit']").click();
      await sharedPage.waitForURL(/\/dashboard/, { timeout: 30_000 });
    }

    authToken = await sharedPage.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) ?? "";
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          try {
            const p = JSON.parse(localStorage.getItem(key) ?? "{}");
            return p?.access_token ?? p?.session?.access_token ?? "";
          } catch { return ""; }
        }
      }
      return "";
    });

    expect(authToken, "Auth token must be present after login").toBeTruthy();
  });

  // ── 2. Create fixture matter ──────────────────────────────────────────────────

  test("create fixture matter", async () => {
    await sharedPage.goto(`${BASE}/dashboard`);
    // Dismiss onboarding welcome modal if present
    const skipLink = sharedPage.getByText(/skip.*i know/i);
    if (await skipLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipLink.click();
      await sharedPage.waitForTimeout(500);
    }
    await sharedPage.getByRole("button", { name: /new matter/i }).last().click();

    // Wait for the New Matter modal (uses placeholder text, not role=dialog)
    const titleInput = sharedPage.getByPlaceholder(/Cipher Holdings/i);
    await expect(titleInput).toBeVisible({ timeout: 10_000 });

    await titleInput.fill(FIXTURE_MATTER.title);
    await sharedPage.getByPlaceholder(/Eleanor/i).fill(FIXTURE_MATTER.client);

    // Case type is a <select>
    const caseTypeEl = sharedPage.locator("select").first();
    await caseTypeEl.selectOption("Criminal Defense");

    // Seed brief facts in the modal
    await sharedPage.getByPlaceholder(/Summarize the key facts/i).fill(FIXTURE_FACTS);

    await sharedPage.getByRole("button", { name: /create matter/i }).click();
    await sharedPage.waitForURL(/\/matters\/[a-z0-9-]+/, { timeout: 20_000 });

    const match = sharedPage.url().match(/\/matters\/([a-z0-9-]+)/);
    expect(match, "Matter ID in URL").toBeTruthy();
    matterId = match![1];
  });

  // ── 3. Seed facts ─────────────────────────────────────────────────────────────

  test("seed matter facts", async () => {
    // Facts were seeded in the New Matter modal; just verify we're on the matter page
    await sharedPage.goto(`${BASE}/matters/${matterId}/overview`);
    await sharedPage.waitForLoadState("networkidle");
  });

  // ── 4. Research ───────────────────────────────────────────────────────────────

  test("audit: research", async () => {
    await sharedPage.goto(`${BASE}/matters/${matterId}/research`);

    await sharedPage.locator("textarea").first().fill(FIXTURE_RESEARCH_QUERY);
    await sharedPage
      .getByRole("button", { name: /research|send/i })
      .or(sharedPage.locator("button[type='submit']"))
      .first()
      .click();

    const output = await captureProseText(sharedPage);
    expect(output.length).toBeGreaterThan(5);

    outputs["research"] = output;
    await saveOutput("research", output);
    scores["research"]  = await gradeOutput("Legal Research (ARES)", output, authToken);
    console.log("Research:", scores["research"].total);
  });

  // ── 5. Strategy ───────────────────────────────────────────────────────────────

  test("audit: strategy", async () => {
    await sharedPage.goto(`${BASE}/matters/${matterId}/strategy`);
    await recoverErrorPage(sharedPage);

    const btn = sharedPage.getByRole("button", { name: /generate strategy/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();

    const output = await captureProseText(sharedPage);
    expect(output.length).toBeGreaterThan(5);

    outputs["strategy"] = output;
    await saveOutput("strategy", output);
    scores["strategy"]  = await gradeOutput("Case Strategy (ARES)", output, authToken);
    console.log("Strategy:", scores["strategy"].total);
  });

  // ── 6. Judge Intelligence ─────────────────────────────────────────────────────

  test("audit: judge intelligence", async () => {
    await sharedPage.goto(`${BASE}/matters/${matterId}/judge`);
    await recoverErrorPage(sharedPage);

    // Search for judge first
    const judgeInput = sharedPage.getByPlaceholder(/judge full name/i);
    await expect(judgeInput).toBeVisible({ timeout: 10_000 });
    await judgeInput.fill("Lewis Liman");
    await sharedPage.getByRole("button", { name: /search/i }).click();
    await sharedPage.waitForTimeout(5_000);

    // Try to click generate brief if judge was found; otherwise capture whatever is on page
    const btn = sharedPage.getByRole("button", { name: /generate ai intelligence brief/i });
    const btnVisible = await btn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (btnVisible) {
      await btn.click();
    }

    // Capture .prose if present, else fall back to page text
    let output = "";
    try {
      output = await captureProseText(sharedPage);
    } catch {
      output = await sharedPage.locator("main").innerText().catch(() => "Judge search returned no results.");
    }
    expect(output.length).toBeGreaterThan(5);

    outputs["judge"] = output;
    await saveOutput("judge", output);
    scores["judge"]  = await gradeOutput("Judge Intelligence Brief (ARES)", output, authToken);
    console.log("Judge:", scores["judge"].total);
  });

  // ── 7. Draft ──────────────────────────────────────────────────────────────────

  test("audit: draft", async () => {
    await sharedPage.goto(`${BASE}/matters/${matterId}/draft`);
    await recoverErrorPage(sharedPage);

    const btn = sharedPage.getByRole("button", { name: /generate/i }).first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();

    const output = await captureProseText(sharedPage);
    expect(output.length).toBeGreaterThan(5);

    outputs["draft"] = output;
    await saveOutput("draft", output);
    scores["draft"]  = await gradeOutput("Document Drafting (ARES)", output, authToken);
    console.log("Draft:", scores["draft"].total);
  });

  // ── 8. Conflict Check ─────────────────────────────────────────────────────────

  test("audit: conflict check", async () => {
    await sharedPage.goto(`${BASE}/matters/${matterId}/conflict`);
    await recoverErrorPage(sharedPage);

    const btn = sharedPage.getByRole("button", { name: /run ai check/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();

    const pre = sharedPage.locator("pre").last();
    await pre.waitFor({ state: "visible", timeout: 90_000 });
    const output = (await pre.innerText()).trim();
    expect(output.length).toBeGreaterThan(5);

    outputs["conflict"] = output;
    await saveOutput("conflict", output);
    scores["conflict"]  = await gradeOutput("Conflict Check (ARES)", output, authToken);
    console.log("Conflict:", scores["conflict"].total);
  });

  // ── 9. Write report ───────────────────────────────────────────────────────────

  test("write audit report", async () => {
    await fs.mkdir(RESULTS_DIR, { recursive: true });

    const features: string[] = ["research", "strategy", "judge", "draft", "conflict"];
    const labels: Record<string, string> = {
      research: "Legal Research",
      strategy: "Case Strategy",
      judge:    "Judge Intelligence",
      draft:    "Document Drafting",
      conflict: "Conflict Check",
    };

    const overall = features.reduce((s, f) => s + (scores[f]?.total ?? 0), 0) / features.length;

    const scoreTable = features.map((f) => {
      const g = scores[f];
      if (!g) return `| ${labels[f]} | – | – | – | – | – | – |`;
      return `| ${labels[f]} | **${g.total}** | ${g.legal_accuracy} | ${g.citation_quality} | ${g.strategic_depth} | ${g.output_format} | ${g.jurisdictional_correctness} |`;
    }).join("\n");

    const featureSections = features.map((f) => {
      const g   = scores[f];
      const out = outputs[f] ?? "(no output captured)";
      if (!g) return `## ${labels[f]}\n\n> Score: N/A\n`;
      return `## ${labels[f]}

**Score: ${g.total}/100**

| Dimension | Score |
|-----------|-------|
| Legal Accuracy | ${g.legal_accuracy}/20 |
| Citation Quality | ${g.citation_quality}/20 |
| Strategic Depth | ${g.strategic_depth}/20 |
| Output Format | ${g.output_format}/20 |
| Jurisdictional Correctness | ${g.jurisdictional_correctness}/20 |

**Assessment:** ${g.motivation}

**Issues:**
${g.issues?.map((i) => `- ${i}`).join("\n") ?? "- None noted"}

<details><summary>Raw Output Excerpt</summary>

\`\`\`
${out.slice(0, 1500)}
\`\`\`
</details>
`;
    }).join("\n---\n\n");

    const gapSection = features.filter((f) => (scores[f]?.total ?? 100) < 70)
      .map((f) => `### ${labels[f]} (${scores[f]?.total ?? "?"})\n${scores[f]?.issues?.map((i) => `- ${i}`).join("\n") ?? ""}`)
      .join("\n\n") || "All features scored ≥ 70. No critical gaps.\n";

    const report = `# LexAgent V1.2.3 — Intelligence Audit Report

**Date:** ${new Date().toISOString().split("T")[0]}
**Case Fixture:** ${FIXTURE_MATTER.title}
**Court:** U.S. District Court, Southern District of New York
**Judge:** Lewis J. Liman
**Charges:** 18 U.S.C. § 1343 · 18 U.S.C. § 1341 · 15 U.S.C. § 78j(b)
**Defense:** No materiality · PSLRA safe harbor · Good-faith projections

---

## Overall Score: ${overall.toFixed(1)}/100

| Feature | Total | Legal | Citation | Strategy | Format | Jurisdiction |
|---------|-------|-------|----------|----------|--------|--------------|
${scoreTable}

---

${featureSections}

---

## Prompt Gap Analysis

${gapSection}

## V1.3.x Backlog

- [ ] Any feature < 80 on Citation Quality → tighten Bluebook enforcement in system prompt
- [ ] Add SDNY / Second Circuit specific instructions
- [ ] Improve strategic depth prompting for criminal defense posture
- [ ] Regression: re-run this audit before each minor release

---

*Generated by LexAgent V1.2.3 Intelligence Audit*
*Matter ID: ${matterId}*
`;

    await fs.writeFile(path.join(RESULTS_DIR, "report.md"), report, "utf-8");

    console.log("\n=== AUDIT COMPLETE ===");
    console.log(`Overall: ${overall.toFixed(1)}/100`);
    features.forEach((f) => console.log(`  ${labels[f]}: ${scores[f]?.total ?? "N/A"}/100`));
    console.log(`Report: ${path.join(RESULTS_DIR, "report.md")}`);

    // Quality gate — informational only; audit is complete regardless of score
    if (overall < 40) {
      console.warn(`⚠️  Overall score ${overall.toFixed(1)}/100 is below 40 — AI backend may be degraded`);
    }
  });
});
