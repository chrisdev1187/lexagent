// ARES v1.6.2 — eval endpoint.
// Admin-only. POSTs run the seed gold set (or a caller-supplied subset)
// through the configured Render API using the supplied prompt version.
// Returns aggregate metrics + per-question detail.
//
// Body: {
//   promptVersion?: string,        // label for the run (default: ARES_PROMPT_VERSION)
//   systemPrompt?: string,         // override DEFAULT_SYSTEM (e.g. v3 archive)
//   questionIds?: string[],        // run only these IDs from the gold set
//   maxQuestions?: number,         // cap (default 16, all of seed)
//   concurrency?: number,          // default 2
// }
//
// Plan: ~/.claude/plans/jaunty-dazzling-horizon.md (row 151)

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../admin/_lib";
import { ARES_PROMPT_VERSION, DEFAULT_SYSTEM } from "@/lib/settings";
import {
  GOLD_SET_SEED,
  runGoldSet,
  computeMetrics,
  aggregate,
  type EvalQuestion,
  type ModelFetchFn,
  type EvalAggregate,
  type EvalMetrics,
  type EvalRun,
} from "@/lib/eval";

const RENDER_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  if (!RENDER_API_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_API_URL not configured" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const {
    promptVersion = ARES_PROMPT_VERSION,
    systemPrompt = DEFAULT_SYSTEM,
    questionIds,
    maxQuestions,
    concurrency = 2,
  } = body as {
    promptVersion?: string;
    systemPrompt?: string;
    questionIds?: string[];
    maxQuestions?: number;
    concurrency?: number;
  };

  let questions: EvalQuestion[] = GOLD_SET_SEED;
  if (Array.isArray(questionIds) && questionIds.length > 0) {
    const set = new Set(questionIds);
    questions = questions.filter((q) => set.has(q.id));
  }
  if (typeof maxQuestions === "number" && maxQuestions > 0) {
    questions = questions.slice(0, maxQuestions);
  }
  if (questions.length === 0) {
    return NextResponse.json({ error: "no questions selected" }, { status: 400 });
  }

  // Forward the admin's auth token to the Render API so the calls bill
  // against admin credits (effectively unlimited) and waterfall errors
  // surface in the admin's ai_usage logs.
  const callerToken = req.headers.get("authorization") ?? "";

  const fetcher: ModelFetchFn = async ({ systemPrompt, userMessage, signal }) => {
    try {
      const r = await fetch(`${RENDER_API_URL}/api/anthropic/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: callerToken,
          "X-Eval-Run": "1",            // server-side flag, opt-out of credits if upstream supports
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",   // proxied through 9-LLM waterfall
          max_tokens: 2_400,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
        signal,
      });
      if (!r.ok) return { text: "", ok: false, error: `HTTP ${r.status}` };
      const j = await r.json() as { content?: Array<{ text?: string }> };
      const text = j?.content?.[0]?.text ?? "";
      return { text, ok: text.length > 0, error: text ? undefined : "empty response" };
    } catch (e) {
      return { text: "", ok: false, error: (e as Error).message ?? "fetch threw" };
    }
  };

  const runs: EvalRun[] = await runGoldSet({
    promptVersion,
    systemPrompt,
    fetcher,
    questions,
    concurrency: Math.max(1, Math.min(8, concurrency)),
  });

  const metrics: EvalMetrics[] = runs.map((r, i) => computeMetrics(questions[i], r));
  const agg: EvalAggregate = aggregate(metrics, promptVersion);

  return NextResponse.json({
    promptVersion,
    questions_run: runs.length,
    aggregate: agg,
    metrics,
    // Trim raw text from the response payload — it can be hundreds of KB
    // and the admin UI only needs shadow + metadata to drill into a row.
    runs: runs.map((r) => ({
      question_id: r.question_id,
      ok: r.ok,
      error: r.error,
      latency_ms: r.latency_ms,
      shadow: r.shadow,
      raw_chars: r.raw_text.length,
    })),
  });
}
