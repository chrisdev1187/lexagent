"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, ArrowRight, BookOpen, Shield, Brain, Search } from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { checkMatterQuota } from "@/lib/quota";
import { CASE_TYPES, JURISDICTIONS } from "@/lib/settings";

interface FirstMatterWizardProps {
  onDismiss: () => void;
}

const FEATURES = [
  { icon: Search, label: "Legal Research", desc: "10 live databases + AI synthesis" },
  { icon: Shield, label: "Citation Shield", desc: "Real-time hallucination detection" },
  { icon: Brain, label: "LexMemory", desc: "Persistent case intelligence across sessions" },
  { icon: BookOpen, label: "Document Drafting", desc: "AI-assisted briefs, motions, letters" },
];

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
  textTransform: "uppercase",
  color: "var(--fg-tertiary)",
  marginBottom: "0.375rem",
};

export function FirstMatterWizard({ onDismiss }: FirstMatterWizardProps) {
  const router = useRouter();
  const { createMatter } = useMatters();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client: "",
    caseType: "",
    jurisdiction: "",
    facts: "",
    status: "Active",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const allowed = await checkMatterQuota();
    if (!allowed) { setSaving(false); return; }
    const matter = await createMatter(form);
    setSaving(false);
    onDismiss();
    router.push(`/matters/${matter.id}/research`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: "rgba(14,18,16,0.96)",
          backdropFilter: "blur(24px) saturate(160%)",
          border: "0.5px solid rgba(0,255,195,0.15)",
          borderRadius: 12,
          padding: "2rem",
          boxShadow: "0 40px 80px rgba(0,0,0,0.9), 0 0 60px rgba(0,255,195,0.04)",
        }}
      >
        {step === 1 ? (
          <>
            {/* Step 1 — Welcome */}
            <div className="text-center mb-8">
              <div
                className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "rgba(0,255,195,0.07)",
                  border: "0.5px solid rgba(0,255,195,0.28)",
                }}
              >
                <Scale size={26} style={{ color: "var(--verdict-neon)" }} />
              </div>
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-2" style={{ color: "var(--verdict-neon)" }}>
                Welcome to LexAgent
              </p>
              <h2 className="font-serif text-2xl font-semibold tracking-tight mb-3" style={{ color: "var(--fg-primary)" }}>
                Legal AI for serious practitioners
              </h2>
              <p className="text-[13px] max-w-sm mx-auto" style={{ color: "var(--fg-tertiary)" }}>
                Create your first matter and LexAgent will build an intelligent case memory as you work — research, strategy, drafting, and more.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="rounded p-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "0.5px solid rgba(224,224,224,0.08)",
                  }}
                >
                  <Icon size={14} style={{ color: "var(--verdict-neon)", marginBottom: 6 }} />
                  <p className="font-mono text-[10px] tracking-[0.12em] uppercase mb-0.5" style={{ color: "var(--fg-secondary)" }}>
                    {label}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--fg-quaternary)" }}>{desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full lex-btn lex-btn--primary justify-center"
            >
              Create First Matter
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onDismiss}
              className="w-full mt-2 font-mono text-[10px] tracking-[0.14em] uppercase cursor-pointer"
              style={{ background: "none", border: "none", color: "var(--fg-quaternary)" }}
            >
              Skip — I know what I'm doing
            </button>
          </>
        ) : (
          <>
            {/* Step 2 — Matter form */}
            <div className="mb-6">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--verdict-neon)" }}>
                Step 2 of 2
              </p>
              <h2 className="font-serif text-xl font-semibold tracking-tight" style={{ color: "var(--fg-primary)" }}>
                Name your first matter
              </h2>
              <p className="text-[12px] mt-1" style={{ color: "var(--fg-quaternary)" }}>
                You can update all details later. Just get started.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Matter Title *</label>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={e => set("title", e.target.value)}
                  placeholder="e.g., Ashford v. Cipher Holdings"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && form.title.trim() && handleCreate()}
                />
              </div>
              <div>
                <label style={labelStyle}>Client Name</label>
                <input
                  style={inputStyle}
                  value={form.client}
                  onChange={e => set("client", e.target.value)}
                  placeholder="e.g., Eleanor Ashford"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Case Type</label>
                  <select
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.caseType}
                    onChange={e => set("caseType", e.target.value)}
                  >
                    <option value="">Select type</option>
                    {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Jurisdiction</label>
                  <select
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.jurisdiction}
                    onChange={e => set("jurisdiction", e.target.value)}
                  >
                    <option value="">Select</option>
                    {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Key Facts (Optional — helps AI start faster)</label>
                <textarea
                  style={{ ...inputStyle, resize: "none", minHeight: 80 }}
                  value={form.facts}
                  onChange={e => set("facts", e.target.value)}
                  placeholder="Brief summary of the legal issue or key facts…"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="lex-btn lex-btn--ghost"
                style={{ minWidth: 80 }}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title.trim() || saving}
                className="flex-1 lex-btn lex-btn--primary justify-center"
              >
                {saving ? "Creating…" : "Create & Start Researching"}
                {!saving && <ArrowRight size={14} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
