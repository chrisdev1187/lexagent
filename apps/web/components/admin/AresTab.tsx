"use client";

import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

interface AiUsageRow {
  id: string;
  user_id: string;
  matter_id: string | null;
  tab: string;
  input_tok: number;
  output_tok: number;
  mem_injected: number;
  model: string | null;
  created_at: string;
  user_email?: string;
  matter_title?: string;
}

interface RealEvalAggregate {
  prompt_version: string;
  questions_run: number;
  questions_ok: number;
  hallucinated_per_100_avg: number;
  counterarg_coverage_avg: number;
  bottom_line_present_rate: number;
  brier_score: number | null;
  required_authority_hit_rate_avg: number;
  prohibited_authority_violation_rate: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  gates: {
    hallucinated_cites_per_100_le_2: boolean;
    counterarg_coverage_ge_70: boolean;
    bottom_line_100: boolean;
    brier_le_20: boolean | null;
    latency_le_1_1x_baseline: boolean | null;
  };
}
interface EvalRunResult { aggregate: RealEvalAggregate; promptVersion: string; durationMs: number; }

export function AresTab() {
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lexStats, setLexStats] = useState<{ mattersWithMemory: number; avgNodes: number; totalInputTok: number; totalOutputTok: number; memRatio: number } | null>(null);
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalRunResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<RealEvalAggregate | null>(null);

  async function runEval() {
    setEvalRunning(true);
    setEvalError(null);
    setEvalResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ares-eval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ maxQuestions: 16, concurrency: 2 }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})) as {error?:string}; throw new Error(j.error ?? `HTTP ${res.status}`); }
      const data = await res.json() as EvalRunResult;
      setEvalResult(data);
    } catch (e) {
      setEvalError(String(e));
    } finally {
      setEvalRunning(false);
    }
  }

  useEffect(() => {
    async function load() {
      const [usageRes, statsRes] = await Promise.all([
        supabase
          .from("ai_usage")
          .select("id, user_id, matter_id, tab, input_tok, output_tok, mem_injected, model, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.rpc("get_admin_token_summary"),
      ]);

      setRows(usageRes.data ?? []);

      if (statsRes.data) {
        const d = statsRes.data as { total_input_tok: number; total_output_tok: number; total_mem_injected: number } | null;
        if (d) {
          const totalIn = Number(d.total_input_tok ?? 0);
          const totalOut = Number(d.total_output_tok ?? 0);
          const memIn = Number(d.total_mem_injected ?? 0);
          setLexStats({ mattersWithMemory: 0, avgNodes: 0, totalInputTok: totalIn, totalOutputTok: totalOut, memRatio: totalIn > 0 ? Math.round((memIn / totalIn) * 100) : 0 });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      {lexStats && (
        <>
          <SectionHeading>LEXMEMORY EFFICIENCY</SectionHeading>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Input Tokens", value: lexStats.totalInputTok.toLocaleString(), color: "var(--verdict-neon)" },
              { label: "Output Tokens", value: lexStats.totalOutputTok.toLocaleString(), color: "var(--verdict-violet)" },
              { label: "Memory Inject %", value: `${lexStats.memRatio}%`, color: "var(--verdict-amber)" },
            ].map(stat => (
              <div key={stat.label} className="rounded p-3 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <p className="text-lg font-mono font-semibold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeading>LAST 20 AI CALLS</SectionHeading>
      {loading ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--fg-quaternary)" }}>No AI usage logged yet</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(row => (
            <div key={row.id} className="flex items-center justify-between rounded px-4 py-2.5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.2)" }}>
                  {row.tab}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-mono truncate" style={{ color: "var(--fg-secondary)" }}>
                    {row.model ?? "waterfall"} · in:{row.input_tok} out:{row.output_tok}
                    {row.mem_injected > 0 && <span style={{ color: "var(--verdict-amber)" }}> mem:{row.mem_injected}</span>}
                  </p>
                </div>
              </div>
              <span className="text-xs flex-shrink-0 ml-4 font-mono" style={{ color: "var(--fg-quaternary)" }}>
                {new Date(row.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <SectionHeading>GOLD SET EVAL</SectionHeading>
      <div className="rounded p-4" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <p className="text-xs mb-3" style={{ color: "var(--fg-tertiary)" }}>
          Runs 16 questions from the 200-question gold set through the live ARES prompt. Takes ~2 min.
          {baseline && <span style={{ color: "var(--verdict-amber)" }}> Baseline saved: {baseline.prompt_version}.</span>}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={runEval} disabled={evalRunning} className="lex-btn lex-btn--primary text-xs">
            {evalRunning ? "Running eval…" : "Run Eval (16q)"}
          </button>
          {evalResult && !baseline && (
            <button onClick={() => setBaseline(evalResult.aggregate)} className="lex-btn lex-btn--ghost text-xs">
              Save as Baseline
            </button>
          )}
          {baseline && (
            <button onClick={() => setBaseline(null)} className="lex-btn lex-btn--ghost text-xs">
              Clear Baseline
            </button>
          )}
        </div>
        {evalError && (
          <p className="text-xs mt-3 font-mono" style={{ color: "var(--verdict-crimson)" }}>{evalError}</p>
        )}
        {evalResult && (() => {
          const agg = evalResult.aggregate;
          const gates = agg.gates;
          const gatePass = (v: boolean | null) => v === null ? "—" : v ? "✓" : "✗";
          const gateColor = (v: boolean | null) => v === null ? "var(--fg-quaternary)" : v ? "var(--verdict-neon)" : "var(--verdict-crimson)";
          const delta = baseline ? {
            hallucinated: agg.hallucinated_per_100_avg - baseline.hallucinated_per_100_avg,
            counterarg: agg.counterarg_coverage_avg - baseline.counterarg_coverage_avg,
            brier: agg.brier_score !== null && baseline.brier_score !== null ? agg.brier_score - baseline.brier_score : null,
            latency: agg.latency_p50_ms - baseline.latency_p50_ms,
          } : null;
          const deltaStr = (v: number | null, lowerBetter: boolean) => {
            if (v === null) return null;
            const sign = v > 0 ? "+" : "";
            const arrow = lowerBetter ? (v < 0 ? "↓" : v > 0 ? "↑" : "") : (v > 0 ? "↑" : v < 0 ? "↓" : "");
            const col = lowerBetter ? (v < 0 ? "var(--verdict-neon)" : v > 0 ? "var(--verdict-crimson)" : "var(--fg-tertiary)") : (v > 0 ? "var(--verdict-neon)" : v < 0 ? "var(--verdict-crimson)" : "var(--fg-tertiary)");
            return { text: `${arrow}${sign}${v.toFixed(2)}`, color: col };
          };
          return (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Questions", value: `${agg.questions_ok}/${agg.questions_run}`, color: "var(--fg-secondary)" },
                  { label: "Brier Score", value: agg.brier_score !== null ? agg.brier_score.toFixed(3) : "n/a", color: "var(--verdict-amber)", d: delta ? deltaStr(delta.brier, true) : null },
                  { label: "Duration", value: `${(evalResult.durationMs / 1000).toFixed(1)}s`, color: "var(--fg-tertiary)" },
                  { label: "p50 Latency", value: `${agg.latency_p50_ms}ms`, color: "var(--fg-tertiary)", d: delta ? deltaStr(delta.latency, true) : null },
                ].map(s => (
                  <div key={s.label} className="rounded p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                    <p className="text-lg font-mono font-semibold" style={{ color: s.color }}>{s.value}</p>
                    {"d" in s && s.d && <p className="text-[10px] font-mono" style={{ color: s.d.color }}>{s.d.text}</p>}
                    <p className="text-[10px] mt-0.5 font-mono tracking-widest uppercase" style={{ color: "var(--fg-quaternary)" }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-quaternary)" }}>Ship Gates</p>
                {[
                  { label: "Hallucinated cites/100 ≤ 2", pass: gates.hallucinated_cites_per_100_le_2, val: agg.hallucinated_per_100_avg.toFixed(2), d: delta ? deltaStr(delta.hallucinated, true) : null },
                  { label: "Counterarg coverage ≥ 70%", pass: gates.counterarg_coverage_ge_70, val: `${Math.round(agg.counterarg_coverage_avg * 100)}%`, d: delta ? deltaStr(delta.counterarg, false) : null },
                  { label: "Bottom line 100%", pass: gates.bottom_line_100, val: `${Math.round(agg.bottom_line_present_rate * 100)}%`, d: null },
                  { label: "Brier ≤ 0.20", pass: gates.brier_le_20, val: agg.brier_score !== null ? agg.brier_score.toFixed(3) : "n/a", d: null },
                  { label: "Latency ≤ 1.1× baseline", pass: gates.latency_le_1_1x_baseline, val: `${agg.latency_p50_ms}ms`, d: null },
                ].map(g => (
                  <div key={g.label} className="flex items-center justify-between rounded px-3 py-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(224,224,224,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold" style={{ color: gateColor(g.pass) }}>{gatePass(g.pass)}</span>
                      <span className="text-xs" style={{ color: "var(--fg-secondary)" }}>{g.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {g.d && <span className="text-[10px] font-mono" style={{ color: g.d.color }}>{g.d.text}</span>}
                      <span className="text-[10px] font-mono" style={{ color: "var(--fg-quaternary)" }}>{g.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
