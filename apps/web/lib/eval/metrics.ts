// ARES v1.6.2 — Eval metric computers.
// Pure functions over (gold-set entry, model run) → metrics. No I/O.
//
// Cite hallucination heuristic in the MVP runs without eyecite (eyecite JS
// port lands in 1.6.3 → task #4). For now we treat a cite as "hallucinated"
// if shadow JSON marks it `verified_via != "model"` AND reporter/year fail
// the structural sanity check. Once eyecite ships, swap CITE_SANITY for the
// real Bluebook parser output.

import type { AresShadow } from "@/lib/ares/shadow-schema";
import type {
  EvalQuestion,
  EvalRun,
  EvalMetrics,
  EvalAggregate,
} from "./types";

// ── Cite sanity ──────────────────────────────────────────────────────────
// Plausible Bluebook reporter shape: <volume> <reporter> <page>.
// Generous: matches "U.S.", "F.3d", "F. Supp. 2d", "Cal. App. 4th", etc.
const REPORTER_RE = /\b\d+\s+[A-Z][A-Za-z\.\s]+\d+(?:,\s*\d+)?\b/;
// Year inside parens, 1789-2099.
const YEAR_RE = /\((?:[^)]*?)(1[7-9]\d{2}|20\d{2})(?:[^)]*)\)/;
// Statute / rule shapes that should pass without a reporter match.
const STATUTE_RE = /\b\d+\s+U\.S\.C\.?\s*§/;
const RULE_RE = /\bFed\.\s*R\.\s*(?:Civ|Crim|Evid|App)\.\s*P\.\s*\d/;

function citeLooksReal(raw: string): boolean {
  if (!raw || raw.length < 4) return false;
  if (STATUTE_RE.test(raw) || RULE_RE.test(raw)) return true;
  return REPORTER_RE.test(raw) && YEAR_RE.test(raw);
}

function extractCiteRaws(shadow: AresShadow | null, text: string): string[] {
  if (shadow?.cites?.length) {
    return shadow.cites.map((c) => c.raw).filter(Boolean);
  }
  // Backstop: regex sweep of the response. Matches case + statute + rule shapes.
  const found = new Set<string>();
  const caseRe = /[A-Z][A-Za-z\.\-' ]+v\.\s*[A-Z][A-Za-z\.\-' ]+,\s*\d+\s+[A-Za-z\.\s]+\d+(?:,\s*\d+)?\s*\([^)]+\d{4}\)/g;
  for (const m of text.matchAll(caseRe)) found.add(m[0]);
  for (const m of text.matchAll(/\d+\s+U\.S\.C\.?\s*§\s*[\d\w\(\)]+/g)) found.add(m[0]);
  for (const m of text.matchAll(/Fed\.\s*R\.\s*(?:Civ|Crim|Evid|App)\.\s*P\.\s*[\d\w\(\)\.]+/g)) found.add(m[0]);
  return Array.from(found);
}

// ── Per-question ──────────────────────────────────────────────────────────

export function computeMetrics(q: EvalQuestion, run: EvalRun): EvalMetrics {
  if (!run.ok) {
    return {
      question_id: q.id,
      prompt_version: run.prompt_version,
      hallucinated_cite_count: 0,
      total_cite_count: 0,
      hallucinated_per_100: 0,
      counterarg_coverage: 0,
      bottom_line_present: false,
      brier_term: null,
      required_authority_hit_rate: 0,
      prohibited_authority_violation: false,
      latency_ms: run.latency_ms,
    };
  }

  const cites = extractCiteRaws(run.shadow, run.raw_text);
  const hallucinated = cites.filter((raw) => !citeLooksReal(raw)).length;
  const total = cites.length;
  const hPer100 = total === 0 ? 0 : (hallucinated / total) * 100;

  // Counterargument coverage. Prefer shadow JSON; fall back to header sweep.
  const cAddressed = run.shadow?.counterarguments
    ? run.shadow.counterarguments.filter((c) => c.addressed !== false).length
    : countCounterargBlocks(run.raw_text);
  const cExpected = q.expected_counterarg_count ?? 3;
  const counterCoverage = cExpected === 0 ? 1 : Math.min(1, cAddressed / cExpected);

  const blPresent = bottomLinePresent(run.shadow, run.raw_text);

  let brier: number | null = null;
  if (q.expected_outcome) {
    // Predicted: shadow.confidence.overall mapped to "favorable" prob.
    // Without a per-outcome head we use overall as P(favorable) and label
    // 1 if expected==favorable else 0. Crude but stable across versions.
    const predicted = run.shadow?.confidence?.overall ?? 0.5;
    const actual = q.expected_outcome === "favorable" ? 1 : 0;
    brier = (predicted - actual) ** 2;
  }

  const reqHits = q.required_authorities?.length
    ? q.required_authorities.filter((a) => run.raw_text.includes(a)).length / q.required_authorities.length
    : 1;
  const prohViol = !!q.prohibited_authorities?.some((a) => run.raw_text.includes(a));

  return {
    question_id: q.id,
    prompt_version: run.prompt_version,
    hallucinated_cite_count: hallucinated,
    total_cite_count: total,
    hallucinated_per_100: hPer100,
    counterarg_coverage: counterCoverage,
    bottom_line_present: blPresent,
    brier_term: brier,
    required_authority_hit_rate: reqHits,
    prohibited_authority_violation: prohViol,
    latency_ms: run.latency_ms,
  };
}

function countCounterargBlocks(text: string): number {
  // Section headers seen in v3+: "Devil's Advocate", "Anticipated Counterarguments",
  // "Opposing Counsel May Argue", "OC Position", numbered "Counterargument N:".
  const headers = [
    /devil'?s\s+advocate/gi,
    /anticipated\s+counter/gi,
    /opposing\s+counsel\s+may/gi,
    /counterargument\s*\d+\s*:/gi,
    /\bOC\s+position\b/gi,
  ];
  let count = 0;
  for (const re of headers) count += (text.match(re) ?? []).length;
  return count;
}

function bottomLinePresent(shadow: AresShadow | null, text: string): boolean {
  if (shadow?.bottom_line && shadow.bottom_line.trim().length > 0) return true;
  const tail = text.slice(Math.max(0, Math.floor(text.length * 0.6)));
  return /\bBOTTOM LINE\b/i.test(tail) || /\bRecommendation\s*:/i.test(tail);
}

// ── Aggregate ─────────────────────────────────────────────────────────────

export function aggregate(metrics: EvalMetrics[], promptVersion: string): EvalAggregate {
  const ok = metrics.filter((m) => m.total_cite_count > 0 || m.bottom_line_present || m.latency_ms > 0);
  const n = metrics.length;

  const mean = (vals: number[]): number =>
    vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;

  const brierTerms = metrics.map((m) => m.brier_term).filter((v): v is number => typeof v === "number");
  const brier = brierTerms.length > 0 ? mean(brierTerms) : null;

  const latencies = metrics.map((m) => m.latency_ms).sort((a, b) => a - b);
  const p50 = latencies.length === 0 ? 0 : latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies.length === 0 ? 0 : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))];

  const hPer100Avg = mean(metrics.map((m) => m.hallucinated_per_100));
  const counterAvg = mean(metrics.map((m) => m.counterarg_coverage));
  const blRate = n === 0 ? 0 : metrics.filter((m) => m.bottom_line_present).length / n;
  const reqHitAvg = mean(metrics.map((m) => m.required_authority_hit_rate));
  const prohRate = n === 0 ? 0 : metrics.filter((m) => m.prohibited_authority_violation).length / n;

  return {
    prompt_version: promptVersion,
    questions_run: n,
    questions_ok: ok.length,
    hallucinated_per_100_avg: hPer100Avg,
    counterarg_coverage_avg: counterAvg,
    bottom_line_present_rate: blRate,
    brier_score: brier,
    required_authority_hit_rate_avg: reqHitAvg,
    prohibited_authority_violation_rate: prohRate,
    latency_p50_ms: p50,
    latency_p95_ms: p95,
    gates: {
      hallucinated_cites_per_100_le_2: hPer100Avg <= 2,
      counterarg_coverage_ge_70: counterAvg >= 0.7,
      bottom_line_100: blRate === 1,
      brier_le_20: brier === null ? null : brier <= 0.2,
      latency_le_1_1x_baseline: null,
    },
  };
}

export function compareGates(baseline: EvalAggregate, candidate: EvalAggregate): EvalAggregate {
  // Updates candidate.gates.latency_le_1_1x_baseline now that we know baseline.
  return {
    ...candidate,
    gates: {
      ...candidate.gates,
      latency_le_1_1x_baseline: candidate.latency_p50_ms <= baseline.latency_p50_ms * 1.1,
    },
  };
}
