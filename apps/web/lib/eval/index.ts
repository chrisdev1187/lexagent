// ARES v1.6.2 — Eval harness public barrel.
// Plan: ~/.claude/plans/jaunty-dazzling-horizon.md (rows 151, 245-246)

export { GOLD_SET_SEED } from "./gold-set";
export { GOLD_SET_EXPANSION } from "./gold-set-expansion";
export { runGoldSet } from "./runner";

import { GOLD_SET_SEED } from "./gold-set";
import { GOLD_SET_EXPANSION } from "./gold-set-expansion";
export const GOLD_SET = [...GOLD_SET_SEED, ...GOLD_SET_EXPANSION];
export { computeMetrics, aggregate, compareGates } from "./metrics";

export type {
  EvalQuestion,
  EvalRun,
  EvalMetrics,
  EvalAggregate,
  EvalComparison,
  EvalJurisdiction,
} from "./types";

export type { ModelFetchFn, ModelFetchOpts, RunOpts } from "./runner";
