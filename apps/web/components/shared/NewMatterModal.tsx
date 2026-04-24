"use client";

import { useState } from "react";
import { X, Scale } from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { CASE_TYPES, JURISDICTIONS } from "@/lib/settings";
import { useRouter } from "next/navigation";
import { checkMatterQuota } from "@/lib/quota";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";

interface NewMatterModalProps {
  onClose: () => void;
}

export function NewMatterModal({ onClose }: NewMatterModalProps) {
  const router = useRouter();
  const { createMatter } = useMatters();
  const [form, setForm] = useState({
    title: "",
    client: "",
    caseType: "",
    jurisdiction: "",
    facts: "",
    status: "Active",
  });
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const allowed = await checkMatterQuota();
    if (!allowed) { setSaving(false); setShowUpgrade(true); return; }
    const matter = await createMatter(form);
    setSaving(false);
    onClose();
    router.push(`/matters/${matter.id}/research`);
  };

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                background: "rgba(0,255,195,0.06)",
                border: "0.5px solid rgba(0,255,195,0.22)",
              }}
            >
              <Scale size={15} style={{ color: "var(--verdict-neon)" }} />
            </div>
            <div>
              <h2
                className="font-serif font-semibold text-sm tracking-tight"
                style={{ color: "var(--fg-primary)" }}
              >
                New Matter
              </h2>
              <p
                className="font-mono text-[9px] tracking-[0.16em] uppercase"
                style={{ color: "var(--fg-quaternary)" }}
              >
                Create case file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer"
            style={{ color: "var(--fg-quaternary)", background: "none", border: "none" }}
          >
            <X size={16} />
          </button>
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
            <label style={labelStyle}>Brief Facts (Optional)</label>
            <textarea
              style={{ ...inputStyle, resize: "none", minHeight: 80 }}
              value={form.facts}
              onChange={e => set("facts", e.target.value)}
              placeholder="Summarize the key facts or legal issues…"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 lex-btn lex-btn--ghost justify-center">
            CANCEL
          </button>
          <button
            onClick={handleCreate}
            disabled={!form.title.trim() || saving}
            className="flex-1 lex-btn lex-btn--primary justify-center"
          >
            {saving ? "CREATING…" : "CREATE MATTER"}
          </button>
        </div>
      </div>
    </div>
  );
}
