// V1.2.3 — Intelligence Audit / System Loop
// Exercises all 5 AI features with a fictional SDNY criminal case fixture,
// grades each output 1–100 on legal accuracy / citation quality / strategic
// depth / output format / jurisdictional correctness, and writes a report.md.
//
// Usage:
//   E2E_EMAIL=you@example.com E2E_PASSWORD=secret pnpm exec playwright test e2e/audit
//
// Results (gitignored):  e2e/audit/results/report.md
//                        e2e/audit/results/<feature>-output.txt

import { test, expect } from "@playwright/test";
import * as fs from "fs/promises";
import * as path from "path";
import { gradeOutput, type GradeResult } from "./grader";
import {
  FIXTURE_MATTER,
  FIXTURE_FACTS,
  FIXTURE_RESEARCH_QUERY,
} from "./fixture";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = process.env.E2E_BASE_URL ?? "https://lexagent-ochre.vercel.app";
const TEST_EMAIL = process.env.E2E_EMAIL ?? "";
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "";
const RESULTS_DIR = path.resolve(__dirname, "results");

// Generous timeout — AI calls can take 20–40 s; allow up to 90 s per step.
test.setTimeout(120_000);

// ── Shared state ──────────────────────────────────────────────────────────────

let matterId = "";
let authToken = "";
const scores: Record<string, GradeResult> = {};
const outputs: Record<string, string> = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveOutput(feature: string, text: string) {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(RESULTS_DIR, `${feature}-output.txt`),
    text,
    "utf-8"
  );
}

async function captureProseText(page: import("@playwright/test").Page): Promise<string> {
  // Prefer .prose (Markdown component); fall back to <pre> (conflict page)
  const prose = page.locator(".prose").last();
  const pre = page.locator("pre").last();
  try {
    await prose.waitFor({ state: "visible", timeout: 90_000 });
    return (await prose.innerText()).trim();
  } catch {
    await pre.waitFor({ state: "visible", timeout: 10_000 });
    return (await pre.innerText()).trim();
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial("V1.2.3 Intelligence Audit", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "E2E_EMAIL / E2E_PASSWORD not set");

  // ── Step 1: Login + capture auth token ──────────────────────────────────────

  test("login and capture auth token", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    // Read Supabase session token from localStorage
    const session = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) ?? "";
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
            return parsed?.access_token ?? parsed?.session?.access_token ?? "";
          } catch {
            return "";
          }
        }
      }
      return "";
    });

    expect(session, "Auth token must be present after login").toBeTruthy();
    authToken = session;
  });

  // ── Step 2: Create fixture matter ────────────────────────────────────────────

  test("create fixture matter", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.getByRole("button", { name: /new matter/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/title/i).fill(FIXTURE_MATTER.title);
    await dialog.getByLabel(/client/i).fill(FIXTURE_MATTER.client);

    // Case type selector — try select element or combobox
    const caseTypeEl = dialog.getByLabel(/case type/i);
    const tagName = await caseTypeEl.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === "select") {
      await caseTypeEl.selectOption({ label: /criminal/i });
    } else {
      await caseTypeEl.fill(FIXTURE_MATTER.caseType);
    }

    await dialog.getByRole("button", { name: /create|save/i }).click();

    // Wait for redirect to matter page
    await page.waitForURL(/\/matters\/[a-z0-9-]+/, { timeout: 20_000 });
    const url = page.url();
    const match = url.match(/\/matters\/([a-z0-9-]+)/);
    expect(match, "Matter ID must be present in URL").toBeTruthy();
    matterId = match![1];
  });

  // ── Step 3: Seed facts ───────────────────────────────────────────────────────

  test("seed matter facts via overview", async ({ page }) => {
    await page.goto(`${BASE}/matters/${matterId}/overview`);

    // Find and fill facts textarea
    const factsArea = page.getByLabel(/facts|background/i).or(
      page.locator("textarea").first()
    );
    await factsArea.fill(FIXTURE_FACTS);

    // Save if there is an explicit save button; otherwise changes auto-save
    const saveBtn = page.getByRole("button", { name: /save/i }).first();
    if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await saveBtn.click();
    }

    await page.waitForTimeout(1_500);
  });

  // ── Step 4: Research ─────────────────────────────────────────────────────────

  test("audit: research", async ({ page }) => {
    await page.goto(`${BASE}/matters/${matterId}/research`);

    const textarea = page.locator("textarea").first();
    await textarea.fill(FIXTURE_RESEARCH_QUERY);

    // Click send (button next to textarea or an icon button)
    const sendBtn = page
      .getByRole("button", { name: /send/i })
      .or(page.locator("button[type='submit']"))
      .first();
    await sendBtn.click();

    const output = await captureProseText(page);
    expect(output.length, "Research output must not be empty").toBeGreaterThan(50);

    outputs["research"] = output;
    await saveOutput("research", output);

    scores["research"] = await gradeOutput("Legal Research (ARES)", output, authToken);
    console.log("Research score:", scores["research"].total);
  });

  // ── Step 5: Strategy ─────────────────────────────────────────────────────────

  test("audit: strategy", async ({ page }) => {
    await page.goto(`${BASE}/matters/${matterId}/strategy`);

    const generateBtn = page.getByRole("button", { name: /generate strategy/i });
    await expect(generateBtn).toBeVisible({ timeout: 10_000 });
    await generateBtn.click();

    const output = await captureProseText(page);
    expect(output.length).toBeGreaterThan(50);

    outputs["strategy"] = output;
    await saveOutput("strategy", output);

    scores["strategy"] = await gradeOutput("Case Strategy (ARES)", output, authToken);
    console.log("Strategy score:", scores["strategy"].total);
  });

  // ── Step 6: Judge Intelligence ───────────────────────────────────────────────

  test("audit: judge intelligence", async ({ page }) => {
    await page.goto(`${BASE}/matters/${matterId}/judge`);

    const synthBtn = page.getByRole("button", { name: /generate ai intelligence brief/i });
    await expect(synthBtn).toBeVisible({ timeout: 10_000 });
    await synthBtn.click();

    const output = await captureProseText(page);
    expect(output.length).toBeGreaterThan(50);

    outputs["judge"] = output;
    await saveOutput("judge", output);

    scores["judge"] = await gradeOutput("Judge Intelligence Brief (ARES)", output, authToken);
    console.log("Judge score:", scores["judge"].total);
  });

  // ── Step 7: Draft ────────────────────────────────────────────────────────────

  test("audit: draft", async ({ page }) => {
    await page.goto(`${BASE}/matters/${matterId}/draft`);

    // Default docType is already selected; just click generate
    const generateBtn = page
      .getByRole("button", { name: /generate/i })
      .first();
    await expect(generateBtn).toBeVisible({ timeout: 10_000 });
    await generateBtn.click();

    const output = await captureProseText(page);
    expect(output.length).toBeGreaterThan(50);

    outputs["draft"] = output;
    await saveOutput("draft", output);

    scores["draft"] = await gradeOutput("Document Drafting (ARES)", output, authToken);
    console.log("Draft score:", scores["draft"].total);
  });

  // ── Step 8: Conflict Check ───────────────────────────────────────────────────

  test("audit: conflict check", async ({ page }) => {
    await page.goto(`${BASE}/matters/${matterId}/conflict`);

    const aiCheckBtn = page.getByRole("button", { name: /run ai check/i });
    await expect(aiCheckBtn).toBeVisible({ timeout: 10_000 });
    await aiCheckBtn.click();

    // Conflict page uses <pre> not .prose
    const preEl = page.locator("pre").last();
    await preEl.waitFor({ state: "visible", timeout: 90_000 });
    const output = (await preEl.innerText()).trim();
    expect(output.length).toBeGreaterThan(50);

    outputs["conflict"] = output;
    await saveOutput("conflict", output);

    scores["conflict"] = await gradeOutput("Conflict Check (ARES)", output, authToken);
    console.log("Conflict score:", scores["conflict"].total);
  });

  // ── Step 9: Write report ─────────────────────────────────────────────────────

  test("write audit report", async () => {
    await fs.mkdir(RESULTS_DIR, { recursive: true });

    const features = ["research", "strategy", "judge", "draft", "conflict"];
    const labels: Record<string, string> = {
      research: "Legal Research",
      strategy: "Case Strategy",
      judge: "Judge Intelligence",
      draft: "Document Drafting",
      conflict: "Conflict Check",
    };

    const overall =
      features.reduce((sum, f) => sum + (scores[f]?.total ?? 0), 0) /
      features.length;

    const scoreTable = features
      .map((f) => {
        const g = scores[f];
        if (!g) return `| ${labels[f]} | – | – | – | – | – | – |`;
        return `| ${labels[f]} | **${g.total}** | ${g.legal_accuracy} | ${g.citation_quality} | ${g.strategic_depth} | ${g.output_format} | ${g.jurisdictional_correctness} |`;
      })
      .join("\n");

    const featureSections = features
      .map((f) => {
        const g = scores[f];
        const out = outputs[f] ?? "(no output captured)";
        if (!g) {
          return `## ${labels[f]}\n\n> Score: N/A (grading failed)\n\n<details><summary>Raw Output</summary>\n\n\`\`\`\n${out.slice(0, 1000)}\n\`\`\`\n</details>\n`;
        }
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
      })
      .join("\n---\n\n");

    const report = `# LexAgent V1.2.3 — Intelligence Audit Report

**Date:** ${new Date().toISOString().split("T")[0]}
**Case Fixture:** ${FIXTURE_MATTER.title}
**Court:** U.S. District Court, Southern District of New York
**Judge:** Lewis J. Liman
**Charges:** 18 U.S.C. § 1343 (wire fraud), 18 U.S.C. § 1341 (mail fraud), 15 U.S.C. § 78j(b) (securities fraud)
**Defense Theory:** No materiality; PSLRA safe harbor; good-faith projections

---

## Overall Score: ${overall.toFixed(1)}/100

| Feature | Total | Legal | Citation | Strategy | Format | Jurisdiction |
|---------|-------|-------|----------|----------|--------|--------------|
${scoreTable}

---

${featureSections}

---

## Prompt Gap Analysis

Based on scores above, the following gaps should be addressed in V1.3.x:

${features
  .filter((f) => scores[f]?.total < 70)
  .map((f) => {
    const g = scores[f];
    return `### ${labels[f]} (${g?.total ?? "?"})\n${g?.issues?.map((i) => `- ${i}`).join("\n") ?? "- Review needed"}\n`;
  })
  .join("\n") || "All features scored ≥ 70. No critical gaps found.\n"}

## V1.3.x Backlog (from this audit)

- [ ] Review prompt for any feature scoring < 80 on Citation Quality
- [ ] Add jurisdiction-specific instructions for SDNY / Second Circuit to system prompt
- [ ] Improve strategic depth prompting for Defense strategy generation
- [ ] Add fixture regression tests: re-run this audit before each minor release

---

*Generated by LexAgent V1.2.3 Intelligence Audit / System Loop*
*Matter ID: ${matterId}*
`;

    await fs.writeFile(path.join(RESULTS_DIR, "report.md"), report, "utf-8");
    console.log("\n=== AUDIT COMPLETE ===");
    console.log(`Overall: ${overall.toFixed(1)}/100`);
    features.forEach((f) =>
      console.log(`  ${labels[f]}: ${scores[f]?.total ?? "N/A"}/100`)
    );
    console.log(`Report: ${path.join(RESULTS_DIR, "report.md")}`);

    // Audit passes if average ≥ 40 (baseline — early run may be unoptimised)
    expect(overall).toBeGreaterThanOrEqual(40);
  });
});
