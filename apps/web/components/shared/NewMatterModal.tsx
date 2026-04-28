"use client";

import { useState } from "react";
import { X, Scale, AlertTriangle, CheckCircle, Loader2, FileText, ChevronRight } from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { CASE_TYPES, JURISDICTIONS } from "@/lib/settings";
import { useRouter } from "next/navigation";
import { checkMatterQuota } from "@/lib/quota";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { anthropicFetch } from "@/lib/api";
import { useSettings } from "@/providers/settings-provider";

interface NewMatterModalProps {
  onClose: () => void;
}

const STEPS = ["Matter Info", "Conflict Check", "Confirm"] as const;

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "0.5px solid rgba(224,224,224,0.10)",
  color: "var(--fg-primary)",
  outline: "none",
  borderRadius: 4,
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  width: "100%",
  fontFamily: "var(--font-sans)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.625rem",
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "var(--fg-tertiary)",
  marginBottom: "0.375rem",
};

export function NewMatterModal({ onClose }: NewMatterModalProps) {
  const router = useRouter();
  const { createMatter, matters } = useMatters();
  const { settings } = useSettings();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "",
    client: "",
    opposingParty: "",
    caseType: "",
    jurisdiction: "",
    facts: "",
    status: "Active",
  });
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictResult, setConflictResult] = useState<{ found: boolean; risk: string; reason: string } | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterContent, setLetterContent] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const runConflictCheck = async () => {
    setConflictLoading(true);
    setConflictResult(null);
    const existingList = matters
      .slice(0, 30)
      .map(m => `- ${m.title}${m.client ? ` (client: ${m.client})` : ""}`)
      .join("\n");
    const prompt = `Conflict of interest check.\n\nProposed matter:\nClient: ${form.client || "not specified"}\nOpposing Party: ${form.opposingParty || "not specified"}\nCase Type: ${form.caseType || "not specified"}\nFacts: ${form.facts || "not specified"}\n\nExisting matters:\n${existingList || "none"}\n\nCheck for conflicts (adverse parties, former clients, substantially related matters). Return exactly:\nCONFLICT_FOUND: yes/no | RISK: high/medium/low/none | REASON: [one sentence explanation]`;
    try {
      const res = await anthropicFetch(
        { model: settings.model, max_tokens: 300, system: "You are a legal conflicts checker. Return exactly the format requested, nothing else.", messages: [{ role: "user", content: prompt }] },
        undefined, {}
      );
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text ?? "";
      const foundM = text.match(/CONFLICT_FOUND:\s*(yes|no)/i);
      const riskM = text.match(/RISK:\s*(high|medium|low|none)/i);
      const reasonM = text.match(/REASON:\s*(.+)/i);
      setConflictResult({
        found: foundM?.[1]?.toLowerCase() === "yes",
        risk: riskM?.[1]?.toLowerCase() ?? "none",
        reason: reasonM?.[1]?.trim() ?? text,
      });
    } catch {
      setConflictResult({ found: false, risk: "none", reason: "Conflict check unavailable — proceed with manual review." });
    } finally {
      setConflictLoading(false);
    }
  };

  const generateLetter = async () => {
    setLetterLoading(true);
    const firmName = settings.firmName ?? "Law Office";
    const prompt = `Draft a professional engagement letter for:\nFirm: ${firmName}\nClient: ${form.client || "[Client Name]"}\nMatter: ${form.title}\nCase Type: ${form.caseType || "civil litigation"}\nJurisdiction: ${form.jurisdiction || "not specified"}\n\nInclude: introduction paragraph, scope of representation, fee arrangement (use [RATE] placeholder), client responsibilities, confidentiality, termination clause, acknowledgment signature line. Formal letterhead format.`;
    try {
      const res = await anthropicFetch(
        { model: settings.model, max_tokens: 1200, system: "You are a legal document drafter. Draft formal, professional engagement letters.", messages: [{ role: "user", content: prompt }] },
        undefined, {}
      );
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      setLetterContent(data.content?.[0]?.text ?? "");
    } catch (e) {
      setLetterContent(`Error: ${(e as Error).message}`);
    } finally {
      setLetterLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const allowed = await checkMatterQuota();
    if (!allowed) { setSaving(false); setShowUpgrade(true); return; }
    const matter = await createMatter({ ...form, engagementLetter: letterContent ?? undefined });
    setSaving(false);
    onClose();
    router.push(`/matters/${matter.id}/research`);
  };

  if (showUpgrade) {
    return (
      <UpgradeCTA
        reason="You've reached your plan's matter limit. Upgrade to create more matters."
        onClose={() => { setShowUpgrade(false); onClose(); }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: "rgba(17,17,20,0.92)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "0.5px solid rgba(224,224,224,0.12)",
          borderRadius: 10,
          padding: "1.75rem",
          boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(0,255,195,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}
            >
              <Scale size={15} style={{ color: "var(--verdict-neon)" }} />
            </div>
            <div>
              <h2 className="font-serif font-semibold text-sm tracking-tight" style={{ color: "var(--fg-primary)" }}>
                New Matter — {STEPS[step]}
              </h2>
              <p className="font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
                Step {step + 1} of {STEPS.length}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--fg-quaternary)", background: "none", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex gap-1 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-0.5 flex-1 rounded"
              style={{ background: i <= step ? "var(--verdict-neon)" : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>

        {/* Step 1 — Matter Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Matter Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g., Ashford v. Cipher Holdings" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Client Name</label>
                <input style={inputStyle} value={form.client} onChange={e => set("client", e.target.value)} placeholder="e.g., Eleanor Ashford" />
              </div>
              <div>
                <label style={labelStyle}>Opposing Party</label>
                <input style={inputStyle} value={form.opposingParty} onChange={e => set("opposingParty", e.target.value)} placeholder="e.g., Cipher Holdings LLC" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Case Type</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.caseType} onChange={e => set("caseType", e.target.value)}>
                  <option value="">Select type</option>
                  {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Jurisdiction</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.jurisdiction} onChange={e => set("jurisdiction", e.target.value)}>
                  <option value="">Select</option>
                  {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Brief Facts</label>
              <textarea style={{ ...inputStyle, resize: "none", minHeight: 72 }} value={form.facts} onChange={e => set("facts", e.target.value)} placeholder="Summarize the key facts or legal issues…" />
            </div>
          </div>
        )}

        {/* Step 2 — Conflict Check */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--fg-secondary)" }}>
              Run an AI conflict check against your {matters.length} existing matter{matters.length !== 1 ? "s" : ""} before opening a new engagement.
            </p>
            {!conflictResult && !conflictLoading && (
              <button onClick={runConflictCheck} className="w-full lex-btn lex-btn--primary justify-center">
                <AlertTriangle size={13} />
                Run Conflict Check
              </button>
            )}
            {conflictLoading && (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--verdict-neon)" }} />
                <span className="text-sm" style={{ color: "var(--fg-tertiary)" }}>Checking {matters.length} matters…</span>
              </div>
            )}
            {conflictResult && (
              <div
                className="rounded p-4"
                style={{
                  background: conflictResult.found ? "rgba(255,59,59,0.06)" : "rgba(0,255,195,0.04)",
                  border: `0.5px solid ${conflictResult.found ? "rgba(255,59,59,0.25)" : "rgba(0,255,195,0.20)"}`,
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  {conflictResult.found
                    ? <AlertTriangle size={14} style={{ color: "var(--verdict-crimson)", flexShrink: 0, marginTop: 1 }} />
                    : <CheckCircle size={14} style={{ color: "var(--verdict-neon)", flexShrink: 0, marginTop: 1 }} />}
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.16em] uppercase mb-1" style={{ color: conflictResult.found ? "var(--verdict-crimson)" : "var(--verdict-neon)" }}>
                      {conflictResult.found ? `Potential conflict — ${conflictResult.risk} risk` : "No conflicts detected"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>{conflictResult.reason}</p>
                  </div>
                </div>
                <button onClick={runConflictCheck} className="lex-btn lex-btn--secondary text-xs mt-1">Re-run</button>
              </div>
            )}
            <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>
              AI conflict checks are advisory only. Always conduct a full manual conflicts review before accepting representation.
            </p>
          </div>
        )}

        {/* Step 3 — Confirm + Engagement Letter */}
        {step === 2 && (
          <div className="space-y-4">
            <div
              className="rounded p-3 space-y-1"
              style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.08)" }}
            >
              {[
                ["Matter", form.title],
                ["Client", form.client],
                ["Opposing Party", form.opposingParty],
                ["Case Type", form.caseType],
                ["Jurisdiction", form.jurisdiction],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="font-mono text-[9px] tracking-widest uppercase w-28 flex-shrink-0" style={{ color: "var(--fg-quaternary)" }}>{k}</span>
                  <span style={{ color: "var(--fg-secondary)" }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-tertiary)" }}>Engagement Letter</span>
                {!letterContent && (
                  <button onClick={generateLetter} disabled={letterLoading} className="lex-btn lex-btn--secondary">
                    {letterLoading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                    {letterLoading ? "Drafting…" : "Generate Draft"}
                  </button>
                )}
              </div>
              {letterContent && (
                <div
                  className="rounded p-3 text-xs font-serif whitespace-pre-wrap max-h-40 overflow-y-auto"
                  style={{ background: "rgba(0,0,0,0.4)", color: "var(--fg-secondary)", border: "0.5px solid rgba(255,255,255,0.08)" }}
                >
                  {letterContent}
                </div>
              )}
              {letterContent && (
                <p className="text-xs mt-1" style={{ color: "var(--fg-quaternary)" }}>Saved with matter. Edit in the Draft tab after creation.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="lex-btn lex-btn--ghost">
              Back
            </button>
          )}
          <button onClick={onClose} className="lex-btn lex-btn--ghost">
            Cancel
          </button>
          <div className="flex-1" />
          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !form.title.trim()}
              className="lex-btn lex-btn--primary"
            >
              Next
              <ChevronRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!form.title.trim() || saving}
              className="lex-btn lex-btn--primary"
            >
              {saving ? "Creating…" : "Create Matter"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
