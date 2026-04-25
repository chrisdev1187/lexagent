// V1.2.3 — Intelligence Audit fixture
// Fictional case; Judge Lewis J. Liman is a real sitting SDNY judge (public record).

export const FIXTURE_MATTER = {
  title: "United States v. Parker Industries Inc.",
  client: "Parker Industries Inc.",
  caseType: "Criminal Defense",
  description:
    "Federal wire fraud and securities fraud prosecution in SDNY. " +
    "Defendant made allegedly false statements in SEC quarterly filings 2021–2023.",
};

export const FIXTURE_FACTS = `Parker Industries Inc. (PKRI) is charged with:
- Wire fraud: 18 U.S.C. § 1343
- Mail fraud: 18 U.S.C. § 1341
- Securities fraud: 15 U.S.C. § 78j(b) / SEC Rule 10b-5

Alleged conduct: CEO Michael Parker and CFO Sandra Torres authorized filing of falsely optimistic revenue projections in 10-Q filings from Q1 2021 through Q4 2023. Projected revenue was overstated by an average of 34% each quarter.

Defense theories:
1. No materiality — statements were forward-looking with PSLRA safe harbor disclosures
2. No specific intent — projections made in good faith based on internal financial models
3. PSLRA safe harbor bars fraud claims for cautionary-language forward-looking statements

Key evidence:
- Government whistleblower emails showing internal awareness of projection gaps
- Defense: conflicting internal forecasts consistent with good-faith reliance

Court: U.S. District Court, Southern District of New York
Judge: Lewis J. Liman
Docket: 1:24-cr-00412-LJL`;

export const FIXTURE_RESEARCH_QUERY =
  "What is the materiality standard for wire fraud under 18 U.S.C. § 1343 in the Second Circuit? How does Neder v. United States apply to our PSLRA safe harbor defense?";

export const FIXTURE_JUDGE_CONTEXT = `Judge: Lewis J. Liman
Court: SDNY
Appointing President: Trump (2018)
Relevant tendencies: known for detailed written opinions; grants Rule 12(b)(6) motions at above-average rate; skeptical of over-broad fraud theories lacking specificity`;

export const GRADING_RUBRIC = `You are a senior legal AI quality auditor. Grade the AI-generated legal response below on a scale of 1–100.

Evaluate across exactly 5 dimensions (20 points each = 100 total):
1. Legal Accuracy (20 pts) — Are legal principles, doctrine, and case holdings stated correctly? Deduct for errors or unsupported assertions.
2. Citation Quality (20 pts) — Full Bluebook format with volume, reporter, page, court, year? Deduct heavily for hallucinated or malformed citations.
3. Strategic Depth (20 pts) — Is analysis actionable and specific to the given facts? Deduct for boilerplate, hedging, or generic advice.
4. Output Format (20 pts) — Proper markdown: ## headers, **bold** key terms, structured sections, readable length?
5. Jurisdictional Correctness (20 pts) — Appropriate for federal court / SDNY / Second Circuit? Correct statutes, rules, and standards?

Respond ONLY in this exact JSON (no prose before or after):
{
  "total": <integer 1–100>,
  "legal_accuracy": <integer 0–20>,
  "citation_quality": <integer 0–20>,
  "strategic_depth": <integer 0–20>,
  "output_format": <integer 0–20>,
  "jurisdictional_correctness": <integer 0–20>,
  "motivation": "<2–3 sentence overall assessment>",
  "issues": ["<issue 1>", "<issue 2>"]
}`;
