// ARES v1.6.2 — Eval harness types.
// Shared schemas for the gold-set runner, metric calculator, and API endpoint.
// Plan: ~/.claude/plans/jaunty-dazzling-horizon.md (rows 178-185)
// DEVLOG: 1.6.2 ship gates — hallucinated cites/100 ≤ 2, counterarg ≥ 70%,
//         BOTTOM LINE 100%, Brier ≤ 0.20, median latency ≤ 1.1·v3.

import type { AresPosture, AresShadow } from "@/lib/ares/shadow-schema";

export type EvalJurisdiction = "federal" | "ca" | "ny" | "tx";

// One row in the gold set. Postures × jurisdictions matrix; v1.6.2 target
// is 5 postures × 4 jurisdictions × 10 = 200 questions. Seed set ships small.
export interface EvalQuestion {
  id: string;                          // stable slug, e.g. "msj-fed-001"
  posture: AresPosture;
  jurisdiction: EvalJurisdiction;
  question: string;                    // user prompt the model will see
  facts?: string;                      // optional matter-fact context block
  // ── Ground-truth labels (used by metric computers) ──────────────────────
  expected_outcome?: "favorable" | "adverse" | "mixed" | "unsettled";
  expected_counterarg_count?: number;  // minimum counterargs the answer should address (Brier-class)
  required_authorities?: string[];     // citations that must appear (substring match)
  prohibited_authorities?: string[];   // overruled or fabricated cites that must NOT appear
}

// Captured output of a single model run on a single question.
export interface EvalRun {
  question_id: string;
  prompt_version: string;              // e.g. "5.0"
  raw_text: string;                    // full assistant response
  shadow: AresShadow | null;           // parsed shadow JSON if present
  latency_ms: number;
  ok: boolean;                         // false on HTTP/parse error
  error?: string;
}

// Per-question metrics derived from EvalRun + gold-set entry.
export interface EvalMetrics {
  question_id: string;
  prompt_version: string;
  hallucinated_cite_count: number;     // # cites failing reporter/year heuristics
  total_cite_count: number;
  hallucinated_per_100: number;        // hallucinated_cite_count / total × 100 (0 if no cites)
  counterarg_coverage: number;         // 0..1 — addressed/expected ratio
  bottom_line_present: boolean;
  brier_term: number | null;           // (predicted - actual)^2 if expected_outcome set
  required_authority_hit_rate: number; // 0..1 — required cites that appeared
  prohibited_authority_violation: boolean;
  latency_ms: number;
}

// Aggregate report over a full prompt-version run.
export interface EvalAggregate {
  prompt_version: string;
  questions_run: number;
  questions_ok: number;
  hallucinated_per_100_avg: number;     // mean across questions
  counterarg_coverage_avg: number;
  bottom_line_present_rate: number;     // fraction
  brier_score: number | null;           // mean of brier_term where defined
  required_authority_hit_rate_avg: number;
  prohibited_authority_violation_rate: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  // Pass/fail against ship gates per row of the plan.
  gates: {
    hallucinated_cites_per_100_le_2: boolean;
    counterarg_coverage_ge_70: boolean;
    bottom_line_100: boolean;
    brier_le_20: boolean | null;
    latency_le_1_1x_baseline: boolean | null;   // null when baseline absent
  };
}

// Side-by-side comparison of two runs (e.g. v3 vs v5, or v5 vs v6).
export interface EvalComparison {
  baseline: EvalAggregate;
  candidate: EvalAggregate;
  // Negative deltas for "lower is better" metrics (hallucinated, brier, latency)
  // are improvements; positive are regressions. The verbalize helper renders
  // them with arrows for the admin dashboard.
  delta: {
    hallucinated_per_100: number;
    counterarg_coverage: number;
    bottom_line_rate: number;
    brier_score: number | null;
    latency_p50: number;
  };
  candidate_passes_all_gates: boolean;
}
