"use client";

import { useState, useCallback } from "react";
import { RefreshCw, ChevronRight, ExternalLink } from "lucide-react";
import { getApiHeaders } from "@/lib/api";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { useWaterfallStats, type WaterfallStat } from "@/hooks/useWaterfallStats";

type SvcStatus = "green" | "amber" | "red";

interface SvcResult {
  status: SvcStatus;
  latencyMs: number;
  error?: string;
}

interface HealthDeepPayload {
  overall: SvcStatus;
  ts: string;
  services: Record<string, SvcResult>;
}

const SERVICE_CATEGORIES: { label: string; keys: string[] }[] = [
  { label: "AI PROVIDERS", keys: ["anthropic", "groq", "gemini", "cerebras", "xai", "mistral", "sambanova", "nvidia"] },
  { label: "DATABASE", keys: ["supabase"] },
  { label: "LEGAL APIs", keys: ["courtlistener", "govinfo", "openstates", "congress", "ecfr"] },
  { label: "INFRASTRUCTURE", keys: ["render"] },
];

const SERVICE_META: Record<string, { label: string; desc: string }> = {
  supabase:      { label: "Supabase",        desc: "Auth + database + realtime" },
  anthropic:     { label: "Anthropic Claude", desc: "Primary AI — BYOK / paid tier" },
  groq:          { label: "Groq",             desc: "Waterfall #1 — Llama ultra-fast" },
  gemini:        { label: "Gemini",           desc: "Waterfall #2 — Google" },
  cerebras:      { label: "Cerebras",         desc: "Waterfall #3 — wafer-scale" },
  xai:           { label: "xAI Grok",         desc: "Waterfall #4" },
  mistral:       { label: "Mistral",          desc: "Waterfall #5" },
  sambanova:     { label: "SambaNova",        desc: "Waterfall #6 — RDU inference" },
  nvidia:        { label: "NVIDIA NIM",       desc: "Waterfall #7 — accelerated" },
  courtlistener: { label: "CourtListener",    desc: "9M+ opinions, judge profiles" },
  govinfo:       { label: "GovInfo",          desc: "Federal Register, CFR, USCIS" },
  openstates:    { label: "OpenStates",       desc: "State legislature & bills" },
  congress:      { label: "Congress.gov",     desc: "Federal bills, resolutions" },
  ecfr:          { label: "eCFR",             desc: "Electronic Code of Federal Regs" },
  render:        { label: "Render (self)",    desc: "API cold-start / uptime" },
};

const SERVICE_LINKS: Record<string, string> = {
  supabase:      "https://supabase.com/dashboard",
  anthropic:     "https://console.anthropic.com",
  groq:          "https://console.groq.com",
  gemini:        "https://aistudio.google.com",
  cerebras:      "https://cloud.cerebras.ai",
  xai:           "https://console.x.ai",
  mistral:       "https://console.mistral.ai",
  sambanova:     "https://cloud.sambanova.ai",
  nvidia:        "https://build.nvidia.com",
  courtlistener: "https://www.courtlistener.com",
  govinfo:       "https://api.govinfo.gov",
  congress:      "https://api.congress.gov",
  ecfr:          "https://www.ecfr.gov",
  render:        "https://dashboard.render.com",
};

const STATUS_COLOR: Record<SvcStatus, string> = {
  green: "rgba(0,255,195,0.28)",
  amber: "rgba(255,184,0,0.28)",
  red:   "rgba(255,51,85,0.3)",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function StatusDot({ status }: { status: SvcStatus }) {
  const colors: Record<SvcStatus, string> = { green: "#00FFC3", amber: "#FFB800", red: "#FF3355" };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[status], boxShadow: `0 0 6px ${colors[status]}80` }}
    />
  );
}

const PROVIDER_COLOR: Record<string, string> = {
  anthropic:  "var(--verdict-neon)",
  groq:       "#f55",
  cerebras:   "#a78bfa",
  sambanova:  "var(--verdict-amber)",
  openrouter: "#38bdf8",
  nvidia:     "#76c93a",
  xai:        "#e5e5e5",
  mistral:    "#ff8c69",
  gemini:     "#4285f4",
  "gemini-2": "#4285f4",
};

function WaterfallStatsPanel() {
  const { data, loading, error, reload } = useWaterfallStats(30);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--fg-tertiary)" }}>LLM PROVIDER ROUTING — LAST 30 DAYS</p>
        <button onClick={reload} disabled={loading} className="lex-btn lex-btn--secondary" style={{ fontSize: "0.7rem", padding: "3px 10px" }}>
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--verdict-crimson)" }}>{error}</p>
      )}

      {!loading && data.length === 0 && (
        <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>No AI calls recorded yet — apply migration 016 if needed.</p>
      )}

      {data.length > 0 && (
        <div className="rounded overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Provider", "Calls", "Avg Tok", "Total Tok", "Share", "Last Used"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: WaterfallStat) => {
                const color = PROVIDER_COLOR[row.provider] ?? "var(--fg-secondary)";
                return (
                  <tr key={row.provider} style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)" }}>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${color}14`, color, border: `0.5px solid ${color}40` }}>
                        {row.provider}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--fg-primary)" }}>{row.call_count.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--fg-tertiary)" }}>{Number(row.avg_tok).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--fg-tertiary)" }}>
                      {(Number(row.total_input_tok) + Number(row.total_output_tok)).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(224,224,224,0.07)", minWidth: 48 }}>
                          <div className="h-1 rounded-full" style={{ width: `${row.pct_of_total}%`, background: color }} />
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{Math.round(row.pct_of_total)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>
                      {new Date(row.last_seen).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TelemetryTab() {
  const [health, setHealth] = useState<HealthDeepPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [selectedSvc, setSelectedSvc] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = API_URL || "https://lexagent-0o5u.onrender.com";
      const res = await fetch(`${base}/api/health/deep`, { headers: getApiHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as HealthDeepPayload;
      setHealth(data);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <SectionHeading>API CONNECTIVITY</SectionHeading>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
          Live probe of all integrated services. Results shown in milliseconds.
          {lastRun && <span className="ml-2">Last run: {lastRun}</span>}
        </p>
        <button
          onClick={runCheck}
          disabled={loading}
          className="lex-btn lex-btn--primary"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Probing…" : health ? "Re-run" : "Run Health Check"}
        </button>
      </div>

      {error && (
        <div className="rounded px-4 py-3 mb-4 text-xs" style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}>
          {error}
        </div>
      )}

      {health && (
        <div className="mb-4 rounded px-4 py-2.5 flex items-center gap-2 text-xs" style={{
          background: health.overall === "green" ? "rgba(0,255,195,0.05)" : health.overall === "amber" ? "rgba(255,184,0,0.06)" : "rgba(255,51,85,0.08)",
          border: `0.5px solid ${health.overall === "green" ? "rgba(0,255,195,0.28)" : health.overall === "amber" ? "rgba(255,184,0,0.28)" : "rgba(255,51,85,0.3)"}`,
          color: health.overall === "green" ? "var(--verdict-neon)" : health.overall === "amber" ? "var(--verdict-amber)" : "var(--verdict-crimson)",
        }}>
          <StatusDot status={health.overall} />
          Overall: {health.overall.toUpperCase()} — {Object.values(health.services).filter(s => s.status === "green").length}/{Object.values(health.services).length} services healthy
        </div>
      )}

      <div className="grid gap-5">
        {SERVICE_CATEGORIES.map(cat => (
          <div key={cat.label}>
            <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--fg-tertiary)" }}>{cat.label}</p>
            <div className="grid gap-1.5">
              {cat.keys.map(key => {
                const meta = SERVICE_META[key];
                if (!meta) return null;
                const svc = health?.services[key];
                const isSelected = selectedSvc === key;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded px-4 py-3 cursor-pointer transition-all"
                    onClick={() => setSelectedSvc(isSelected ? null : key)}
                    style={{
                      background: isSelected ? "rgba(0,255,195,0.04)" : "rgba(17,17,20,0.7)",
                      border: `0.5px solid ${isSelected ? "rgba(0,255,195,0.28)" : "rgba(224,224,224,0.09)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {svc ? <StatusDot status={svc.status} /> : <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "rgba(224,224,224,0.18)" }} />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{meta.label}</p>
                        <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{meta.desc}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4 flex items-center gap-3">
                      {svc ? (
                        <>
                          <p className="text-xs font-mono" style={{ color: svc.status === "green" ? "var(--verdict-neon)" : svc.status === "amber" ? "var(--verdict-amber)" : "var(--verdict-crimson)" }}>
                            {svc.latencyMs}ms
                          </p>
                          {svc.error && <p className="text-xs truncate max-w-[160px]" style={{ color: "var(--fg-quaternary)" }}>{svc.error}</p>}
                        </>
                      ) : (
                        <p className="text-xs font-mono" style={{ color: "var(--fg-quaternary)" }}>—</p>
                      )}
                      <ChevronRight size={12} style={{ color: isSelected ? "var(--verdict-neon)" : "rgba(224,224,224,0.2)", transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedSvc && (() => {
        const meta = SERVICE_META[selectedSvc];
        const svc = health?.services[selectedSvc];
        const link = SERVICE_LINKS[selectedSvc];
        const borderColor = svc ? STATUS_COLOR[svc.status] : "rgba(224,224,224,0.09)";
        const textColor = svc
          ? svc.status === "green" ? "var(--verdict-neon)" : svc.status === "amber" ? "var(--verdict-amber)" : "var(--verdict-crimson)"
          : "var(--fg-tertiary)";
        return (
          <div className="mt-4 rounded p-4" style={{ background: "rgba(8,8,12,0.9)", border: `0.5px solid ${borderColor}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {svc ? <StatusDot status={svc.status} /> : <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "rgba(224,224,224,0.18)" }} />}
                <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{meta?.label}</span>
                <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{meta?.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="lex-btn lex-btn--ghost text-xs">
                    <ExternalLink size={10} /> Dashboard
                  </a>
                )}
                <button onClick={runCheck} disabled={loading} className="lex-btn lex-btn--secondary text-xs">
                  <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Force re-probe
                </button>
                <button onClick={() => setSelectedSvc(null)} className="lex-btn lex-btn--ghost text-xs">✕</button>
              </div>
            </div>
            {svc ? (
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="rounded p-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                  <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">STATUS</p>
                  <p className="font-semibold" style={{ color: textColor }}>{svc.status.toUpperCase()}</p>
                </div>
                <div className="rounded p-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                  <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">LATENCY</p>
                  <p className="font-semibold" style={{ color: "var(--fg-primary)" }}>{svc.latencyMs}ms</p>
                </div>
                {svc.error && (
                  <div className="col-span-2 rounded p-3" style={{ background: "rgba(255,51,85,0.06)", border: "0.5px solid rgba(255,51,85,0.2)" }}>
                    <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">ERROR</p>
                    <p style={{ color: "var(--verdict-crimson)" }}>{svc.error}</p>
                  </div>
                )}
                <div className="col-span-2 rounded p-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                  <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">LAST PROBED</p>
                  <p style={{ color: "var(--fg-secondary)" }}>{health?.ts ? new Date(health.ts).toLocaleString() : "—"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs py-2" style={{ color: "var(--fg-tertiary)" }}>Run a health check first to see probe details.</p>
            )}
          </div>
        );
      })()}

      <WaterfallStatsPanel />
    </div>
  );
}
