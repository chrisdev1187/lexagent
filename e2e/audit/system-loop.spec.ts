// V1.3.0 — Intelligence Audit / System Loop
// Exercises 7 AI features with a fictional SDNY criminal case fixture,
// grades each output 1–100, diffs against previous report (fail >5pt regression),
// and writes e2e/audit/results/report.md.
//
// Usage:
//   E2E_EMAIL=armin@notadmin.com E2E_PASSWORD=ZAQxsw123 \
//   npx playwright test --project=audit
//
// Optional env:
//   E2E_SNAPSHOT=1   — save raw prompts + responses to results/snapshots/
//   E2E_GRADER_KEY   — Anthropic key for direct (non-circular) grading
//   E2E_GRADER_URL   — override grading endpoint

import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "fs/promises";
import * as fssync from "fs";
import * as path from "path";
import { gradeOutput, type GradeResult } from "./grader";
import { FIXTURE_MATTER, FIXTURE_FACTS, FIXTURE_RESEARCH_QUERY } from "./fixture";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE          = process.env.E2E_BASE_URL  ?? "https://lexagent-ochre.vercel.app";
const TEST_EMAIL    = process.env.E2E_EMAIL     ?? "";
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "";
const SNAPSHOT_MODE = !!process.env.E2E_SNAPSHOT;
const RESULTS_DIR   = path.resolve(__dirname, "results");
const SNAPSHOT_DIR  = path.resolve(RESULTS_DIR, "snapshots");
const AUTH_STATE    = path.resolve(__dirname, "auth-state.json");
const HAS_AUTH_STATE = fssync.existsSync(AUTH_STATE);

test.setTimeout(120_000);

// ── Shared state ──────────────────────────────────────────────────────────────

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
  if (SNAPSHOT_MODE) {
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(path.join(SNAPSHOT_DIR, `${ts}-${feature}.txt`), text, "utf-8");
  }
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
    await prose.waitFor({ state: "visible", timeout: 110_000 });
    return (await prose.innerText()).trim();
  } catch {
    await pre.waitFor({ state: "visible", timeout: 10_000 });
    return (await pre.innerText()).trim();
  }
}

function parsePreviousScores(reportPath: string): Record<string, number> {
  if (!fssync.existsSync(reportPath)) return {};
  const content = fssync.readFileSync(reportPath, "utf-8");
  const scores: Record<string, number> = {};
  // Match lines like: | Legal Research | **88** |
  for (const match of content.matchAll(/\|\s*([^|]+?)\s*\|\s*\*\*(\d+)\*\*/g)) {
    scores[match[1].trim()] = parseInt(match[2]);
  }
  return scores;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial("V1.3.0 Intelligence Audit", () => {
  test.skip(!TEST_EMAIL && !TEST_PASSWORD && !HAS_AUTH_STATE, "Set E2E_EMAIL/E2E_PASSWORD or run: npx tsx e2e/audit/save-auth.ts");

  let previousScores: Record<string, number> = {};

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    previousScores = parsePreviousScores(path.join(RESULTS_DIR, "report.md"));
    ctx        = HAS_AUTH_STATE
      ? await browser.newContext({ storageState: AUTH_STATE })
      : await browser.newContext();
    sharedPage = await ctx.newPage();
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  // ── 1. Login ──────────────────────────────────────────────────────────────────

  test("login and capture auth token", async () => {
    if (HAS_AUTH_STATE) {
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
    const skipLink = sharedPage.getByText(/skip.*i know/i);
    if (await skipLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipLink.click();
      await sharedPage.waitForTimeout(500);
    }
    await sharedPage.getByRole("button", { name: /new matter/i }).last().click();

    const titleInput = sharedPage.getByPlaceholder(/Cipher Holdings/i);
    await expect(titleInput).toBeVisible({ timeout: 10_000 });

    await titleInput.fill(FIXTURE_MATTER.title);
    await sharedPage.getByPlaceholder(/Eleanor/i).fill(FIXTURE_MATTER.client);

    const caseTypeEl = sharedPage.locator("select").first();
    await caseTypeEl.selectOption("Criminal Defense");

    await sharedPage.getByPlaceholder(/Summarize the key facts/i).fill(FIXTURE_FACTS);
    await sharedPage.getByRole("button", { name: /create matter/i }).click();
    await sharedPage.waitForURL(/\/matters\/[a-z0-9-]+/, { timeout: 20_000 });

    const match = sharedPage.url().match(/\/matters\/([a-z0-9-]+)/);
    expect(match, "Matter ID in URL").toBeTruthy();
    matterId = match![1];
  });

  // ── 3. Seed facts ─────────────────────────────────────────────────────────────

  test("seed matter facts", async () => {
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

    const judgeInput = sharedPage.getByPlaceholder(/judge full name/i);
    await expect(judgeInput).toBeVisible({ timeout: 10_000 });
    await judgeInput.fill("Lewis Liman");
    await sharedPage.getByRole("button", { name: /search/i }).click();
    await sharedPage.waitForTimeout(5_000);

    const btn = sharedPage.getByRole("button", { name: /generate ai intelligence brief/i });
    const btnVisible = await btn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (btnVisible) await btn.click();

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
    await pre.waitFor({ state: "visible", timeout: 110_000 });
    const output = (await pre.innerText()).trim();
    expect(output.length).toBeGreaterThan(5);

    outputs["conflict"] = output;
    await saveOutput("conflict", output);
    scores["conflict"]  = await gradeOutput("Conflict Check (ARES)", output, authToken);
    console.log("Conflict:", scores["conflict"].total);
  });

  // ── 9. Deep Research (CourtListener data quality) ─────────────────────────────

  test("audit: deep-research", async () => {
    await sharedPage.goto(`${BASE}/matters/${matterId}/deep-research`);
    await recoverErrorPage(sharedPage);

    // Click the CourtListener tab to fetch opinions
    const clTab = sharedPage.getByRole("tab", { name: /courtlistener/i })
      .or(sharedPage.getByText(/courtlistener/i).first());
    const clVisible = await clTab.isVisible({ timeout: 5_000 }).catch(() => false);
    if (clVisible) await clTab.click();

    // Wait for any result card or list item
    const resultCard = sharedPage.locator("[class*='result'], [class*='card'], li").first();
    let output = "";
    try {
      await resultCard.waitFor({ state: "visible", timeout: 30_000 });
      output = await sharedPage.locator("main").innerText();
    } catch {
      output = await sharedPage.locator("main").innerText().catch(() => "Deep research returned no results.");
    }
    expect(output.length).toBeGreaterThan(5);

    outputs["deep-research"] = output;
    await saveOutput("deep-research", output);
    // Grade as data retrieval quality: did we get case citations back?
    scores["deep-research"] = await gradeOutput("Deep Research (CourtListener data)", output.slice(0, 2000), authToken);
    console.log("Deep Research:", scores["deep-research"].total);
  });

  // ── 10. Citations Batch Verify ────────────────────────────────────────────────

  test("audit: citations", async () => {
    await sharedPage.goto(`${BASE}/matters/${matterId}/citations`);
    await recoverErrorPage(sharedPage);

    const BATCH = `Neder v. United States, 527 U.S. 1 (1999)
United States v. Weimert, 819 F.3d 351 (7th Cir. 2016)
Basic Inc. v. Levinson, 485 U.S. 224 (1988)`;

    const textarea = sharedPage.locator("textarea").first();
    const inputVisible = await textarea.isVisible({ timeout: 5_000 }).catch(() => false);
    if (inputVisible) {
      await textarea.fill(BATCH);
      const verifyBtn = sharedPage.getByRole("button", { name: /verify/i }).first();
      const btnVisible = await verifyBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      if (btnVisible) await verifyBtn.click();
      await sharedPage.waitForTimeout(8_000);
    }

    const output = await sharedPage.locator("main").innerText().catch(() => "Citations page loaded.");
    expect(output.length).toBeGreaterThan(5);

    outputs["citations"] = output;
    await saveOutput("citations", output);
    scores["citations"] = await gradeOutput("Citation Verification (Shield)", output.slice(0, 2000), authToken);
    console.log("Citations:", scores["citations"].total);
  });

  // ── 11. Write report + regression check ───────────────────────────────────────

  test("write audit report", async () => {
    await fs.mkdir(RESULTS_DIR, { recursive: true });

    const features: string[] = ["research", "strategy", "judge", "draft", "conflict", "deep-research", "citations"];
    const labels: Record<string, string> = {
      research:       "Legal Research",
      strategy:       "Case Strategy",
      judge:          "Judge Intelligence",
      draft:          "Document Drafting",
      conflict:       "Conflict Check",
      "deep-research":"Deep Research",
      citations:      "Citations Shield",
    };

    const overall = features.reduce((s, f) => s + (scores[f]?.total ?? 0), 0) / features.length;

    // ── Regression check ──────────────────────────────────────────────────────
    const regressions: string[] = [];
    for (const f of features) {
      const prev = previousScores[labels[f]];
      const curr = scores[f]?.total;
      if (prev !== undefined && curr !== undefined && prev - curr > 5) {
        regressions.push(`${labels[f]}: ${prev} → ${curr} (−${prev - curr})`);
      }
    }
    if (regressions.length > 0) {
      console.error("⛔ REGRESSIONS DETECTED (>5pts):\n" + regressions.map(r => `  ${r}`).join("\n"));
      throw new Error(`Audit regression: ${regressions.join("; ")}`);
    }

    const scoreTable = features.map((f) => {
      const g = scores[f];
      if (!g) return `| ${labels[f]} | – | – | – | – | – | – |`;
      const prev = previousScores[labels[f]];
      const delta = prev !== undefined ? ` (${g.total >= prev ? "+" : ""}${g.total - prev})` : "";
      return `| ${labels[f]} | **${g.total}**${delta} | ${g.legal_accuracy} | ${g.citation_quality} | ${g.strategic_depth} | ${g.output_format} | ${g.jurisdictional_correctness} |`;
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

    const targets: Record<string, number> = {
      research: 92, strategy: 96, judge: 96, draft: 95, conflict: 92,
    };
    const misses = features
      .filter(f => targets[f] !== undefined && (scores[f]?.total ?? 0) < targets[f])
      .map(f => `- ${labels[f]}: ${scores[f]?.total ?? "?"} (target ≥${targets[f]})`);

    const report = `# LexAgent V1.3.0 — Intelligence Audit Report

**Date:** ${new Date().toISOString().split("T")[0]}
**Grader:** ${process.env.E2E_GRADER_KEY ? "Anthropic claude-sonnet-4-6 (direct)" : "LexAgent waterfall (auto)"}
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

${misses.length > 0 ? `### Targets Not Met\n${misses.join("\n")}` : "### All targets met ✓"}

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

*Generated by LexAgent V1.3.0 Intelligence Audit*
*Matter ID: ${matterId}*
`;

    await fs.writeFile(path.join(RESULTS_DIR, "report.md"), report, "utf-8");

    console.log("\n=== AUDIT COMPLETE ===");
    console.log(`Overall: ${overall.toFixed(1)}/100`);
    features.forEach((f) => console.log(`  ${labels[f]}: ${scores[f]?.total ?? "N/A"}/100`));
    console.log(`Report: ${path.join(RESULTS_DIR, "report.md")}`);

    if (overall < 40) {
      console.warn(`⚠️  Overall score ${overall.toFixed(1)}/100 is below 40 — AI backend may be degraded`);
    }
    if (misses.length > 0) {
      console.warn("⚠️  Targets not met:\n" + misses.join("\n"));
    }
  });
});
