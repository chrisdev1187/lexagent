"use client";

import { useState } from "react";
import { X, Scale } from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { CASE_TYPES, JURISDICTIONS } from "@/lib/settings";
import { useRouter } from "next/navigation";

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

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const matter = await createMatter(form);
    setSaving(false);
    onClose();
    router.push(`/matters/${matter.id}/research`);
  };

  const inputStyle = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    outline: "none",
    borderRadius: "0.5rem",
    padding: "0.625rem 0.875rem",
    fontSize: "0.875rem",
    width: "100%",
  } as const;

  const labelStyle = {
    display: "block",
    fontSize: "0.7rem",
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
    marginBottom: "0.375rem",
  } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="w-full max-w-lg fade-in"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-hi)",
          borderRadius: "1rem",
          padding: "1.75rem",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
            >
              <Scale size={15} style={{ color: "var(--emerald)" }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>New Matter</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Create a new case file</p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label style={labelStyle}>MATTER TITLE *</label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g., State v. Johnson — Motion to Suppress"
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>CLIENT NAME</label>
            <input
              style={inputStyle}
              value={form.client}
              onChange={e => set("client", e.target.value)}
              placeholder="e.g., Robert Johnson"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>CASE TYPE</label>
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
              <label style={labelStyle}>JURISDICTION</label>
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
            <label style={labelStyle}>BRIEF FACTS (OPTIONAL)</label>
            <textarea
              style={{ ...inputStyle, resize: "none", minHeight: 80 }}
              value={form.facts}
              onChange={e => set("facts", e.target.value)}
              placeholder="Summarize the key facts or legal issues..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg py-2.5 text-sm cursor-pointer transition-all duration-150"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!form.title.trim() || saving}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold cursor-pointer transition-all duration-150"
            style={{
              background: "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
              border: "none",
              color: "#0A0F0D",
              opacity: !form.title.trim() || saving ? 0.6 : 1,
            }}
          >
            {saving ? "Creating…" : "Create Matter"}
          </button>
        </div>
      </div>
    </div>
  );
}
