"use client";

import { useState } from "react";
import { FileEdit, Zap, Copy, Check, Loader2, Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch } from "@/lib/api";
import { PanelShell } from "@/components/panels/PanelShell";

const DOC_TYPES = [
  "Motion to Dismiss",
  "Motion for Summary Judgment",
  "Motion in Limine",
  "Brief",
  "Demand Letter",
  "Settlement Agreement",
  "Cease and Desist",
  "Memo of Law",
  "Client Letter",
  "Subpoena",
];

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!matter) return;
    setLoading(true);
    setError(null);
    try {
      const userContent = `Draft a ${docType} for the following matter:\n\nMatter: ${matter.title}\nCase Type: ${matter.caseType}\nJurisdiction: ${matter.jurisdiction}\nCourt: ${matter.court}\nFacts: ${matter.facts}\n\nSpecial Instructions: ${instructions || "None"}\n\nInclude all required legal elements, proper formatting, and Bluebook citations where applicable.`;

      const res = await anthropicFetch({
        model: settings.model,
        max_tokens: settings.maxTokens,
        system: settings.systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });
      const data = await res.json() as { content?: Array<{ type: string; text: string }>; error?: { message: string } };
      const text = data.content?.[0]?.text ?? data.error?.message ?? "No response.";
      setDraft(text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!draft) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docType}</title><style>
      body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.8; margin: 0; color: #000; }
      @page { margin: 1in; }
      pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: inherit; }
    </style></head><body><pre>${draft.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  const copyToClipboard = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectStyle = {
    background: "var(--panel2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    outline: "none",
    fontSize: "0.75rem",
    padding: "6px 12px",
  };

  return (
    <PanelShell
      icon={FileEdit}
      title="AI Document Drafting"
      description="Generate legal documents with AI — motions, briefs, letters, and more"
    >
      {/* Controls */}
      <div
        className="rounded-xl p-4 mb-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--text-muted)" }}>
            Document Type
          </label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            style={{ ...selectStyle, width: "100%" }}
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--text-muted)" }}>
            Special Instructions (optional)
          </label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="e.g. Focus on Fourth Amendment arguments, include recent circuit court precedents…"
            rows={3}
            className="w-full text-sm resize-none"
            style={{
              background: "var(--panel2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              outline: "none",
              padding: "8px 12px",
            }}
          />
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold w-full justify-center"
          style={{
            background: loading
              ? "var(--panel2)"
              : "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
            color: loading ? "var(--text-muted)" : "#0A0F0D",
            border: "none",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
            : <><Zap size={15} /> Generate {docType}</>
          }
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-xs"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--crimson)" }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex gap-1.5 mb-4">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--emerald)", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Drafting {docType}…</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>This may take 20-40 seconds</p>
        </div>
      )}

      {draft && !loading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{docType}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "var(--panel2)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <Download size={12} />
                Export PDF
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: copied ? "rgba(16,185,129,0.12)" : "var(--panel2)",
                  color: copied ? "var(--emerald)" : "var(--text-muted)",
                  border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                  cursor: "pointer",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
          </div>
          <div
            className="rounded-xl p-5 overflow-auto"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              maxHeight: "600px",
            }}
          >
            <pre
              className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
              style={{ color: "var(--text)" }}
            >
              {draft}
            </pre>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
