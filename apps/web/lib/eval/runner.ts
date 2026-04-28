// ARES v1.6.2 — Eval runner.
// Iterates a gold set, calls the model with the current ARES prompt, captures
// shadow JSON + latency, computes metrics. Pure orchestration; the model fetch
// is injected so callers can swap v3 / v5 / v6 prompts without code change.
//
// Plan: ~/.claude/plans/jaunty-dazzling-horizon.md (rows 151, 245-246)

import { parseAresShadow } from "@/lib/lex-memory/extract";
import type { AresShadow } from "@/lib/ares/shadow-schema";
import type { EvalQuestion, EvalRun } from "./types";

export interface ModelFetchOpts {
  systemPrompt: string;
  userMessage: string;
  signal?: AbortSignal;
}

// The runner doesn't care which transport is used (anthropicFetch, direct
// Render call, or a stub for tests) — it only needs `{ text, ok, error? }`.
export type ModelFetchFn = (opts: ModelFetchOpts) => Promise<{
  text: string;
  ok: boolean;
  error?: string;
}>;

export interface RunOpts {
  promptVersion: string;       // label for the run, e.g. "5.0"
  systemPrompt: string;        // ARES prompt body (DEFAULT_SYSTEM or a v3 archive)
  fetcher: ModelFetchFn;
  questions: EvalQuestion[];
  // Concurrency cap. Waterfall is shared free-tier capacity — too high
  // causes 429s and skews the latency metric. 2 is the safe default.
  concurrency?: number;
  // Optional per-question budget (ms). The runner aborts the call when
  // exceeded so a single timeout doesn't block the whole batch.
  perQuestionTimeoutMs?: number;
  onProgress?: (done: number, total: number) => void;
}

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_TIMEOUT_MS = 60_000;

export async function runGoldSet(opts: RunOpts): Promise<EvalRun[]> {
  const concurrency = Math.max(1, Math.min(8, opts.concurrency ?? DEFAULT_CONCURRENCY));
  const timeoutMs = opts.perQuestionTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: EvalRun[] = new Array(opts.questions.length);

  let cursor = 0;
  let done = 0;

  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push((async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= opts.questions.length) return;
        const q = opts.questions[idx];
        results[idx] = await runOne(q, opts.systemPrompt, opts.promptVersion, opts.fetcher, timeoutMs);
        done++;
        opts.onProgress?.(done, opts.questions.length);
      }
    })());
  }
  await Promise.all(workers);
  return results;
}

async function runOne(
  q: EvalQuestion,
  systemPrompt: string,
  promptVersion: string,
  fetcher: ModelFetchFn,
  timeoutMs: number,
): Promise<EvalRun> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const started = Date.now();
  try {
    const userMessage = q.facts
      ? `Matter facts:\n${q.facts}\n\nQuestion:\n${q.question}`
      : q.question;
    const r = await fetcher({ systemPrompt, userMessage, signal: ac.signal });
    const latency = Date.now() - started;
    if (!r.ok) {
      return blankRun(q, promptVersion, latency, false, r.error ?? "fetch failed");
    }
    // parseAresShadow returns lex-memory/extract.ts's AresShadow, which is
    // structurally identical but has a looser `posture: string`. Cast through
    // unknown — both types validate the same `schema: "ares.shadow.v1"` field.
    const shadow = parseAresShadow(r.text) as unknown as AresShadow | null;
    return {
      question_id: q.id,
      prompt_version: promptVersion,
      raw_text: r.text,
      shadow,
      latency_ms: latency,
      ok: true,
    };
  } catch (e) {
    const latency = Date.now() - started;
    return blankRun(q, promptVersion, latency, false, (e as Error).message ?? "fetch threw");
  } finally {
    clearTimeout(timer);
  }
}

function blankRun(q: EvalQuestion, promptVersion: string, latency: number, ok: boolean, error: string): EvalRun {
  return {
    question_id: q.id,
    prompt_version: promptVersion,
    raw_text: "",
    shadow: null,
    latency_ms: latency,
    ok,
    error,
  };
}
