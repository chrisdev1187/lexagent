"use client";

import { useState } from "react";
import { FileEdit, Zap, Copy, Check, Loader2, Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch, QuotaExceededError } from "@/lib/api";
import { withLexMemory } from "@/lib/lex-memory";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { Markdown } from "@/components/shared/Markdown";

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
  "Complaint",
  "Answer",
  "Reply Brief",
  "Notice of Appeal",
];

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const generate = async () => {
    if (!matter) return;
    setLoading(true);
    setError(null);
    try {
      const firmBlock = settings.firmName
        ? `\n\nATTORNEY/FIRM:\n${settings.firmName}${settings.firmAddress ? `\n${settings.firmAddress}` : ""}${settings.firmCity ? `, ${settings.firmCity}` : ""}${settings.firmState ? `, ${settings.firmState}` : ""}${settings.firmZip ? ` ${settings.firmZip}` : ""}${settings.barNumber ? `\nBar No. ${settings.barNumber}${settings.barJurisdiction ? ` (${settings.barJurisdiction})` : ""}` : ""}`
        : "";

      const userContent = `Draft a complete, court-ready ${docType} for the following matter:

Matter: ${matter.title}
Case Type: ${matter.caseType ?? "N/A"}
Jurisdiction: ${matter.jurisdiction ?? "N/A"}
Court: ${matter.court ?? "N/A"}
Facts: ${matter.facts ?? "N/A"}${firmBlock}

Special Instructions: ${instructions || "None"}

DRAFTING REQUIREMENTS:
- Include proper caption block (Court, Parties, Case No., Document Title)
- Use correct Bluebook citations throughout (Rule 10 for cases, Rule 12 for statutes)
- Structure with numbered sections and proper headings
- Include Certificate of Service at the end
- All margins 1 inch, font Times New Roman 12pt, double-spaced argument sections
- End with signature block including firm name, bar number, and contact info`;

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "draft" });
      const res = await lexFetch({
        model: settings.model,
        max_tokens: settings.maxTokens,
        system: settings.systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });
      const data = await res.json() as { content?: Array<{ type: string; text: string }>; error?: { message: string } };
      const text = data.content?.[0]?.text ?? data.error?.message ?? "No response.";
      setDraft(text);
    } catch (e) {
      if (e instanceof QuotaExceededError) { setShowUpgrade(true); }
      else { setError((e as Error).message); }
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!draft) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const firmHeader = settings.firmName
      ? `<div style="text-align:center;margin-bottom:24pt;border-bottom:1px solid #000;padding-bottom:12pt">
          <div style="font-size:14pt;font-weight:bold">${settings.firmName}</div>
          ${settings.firmAddress ? `<div>${settings.firmAddress}${settings.firmCity ? `, ${settings.firmCity}` : ""}${settings.firmState ? `, ${settings.firmState}` : ""}${settings.firmZip ? ` ${settings.firmZip}` : ""}</div>` : ""}
          ${settings.firmPhone ? `<div>Tel: ${settings.firmPhone}</div>` : ""}
          ${settings.firmEmail ? `<div>${settings.firmEmail}</div>` : ""}
        </div>`
      : "";
    const escaped = draft.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docType}</title><style>
      body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 2; margin: 0; color: #000; }
      @page { margin: 1in; }
      pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: inherit; }
    </style></head><body>${firmHeader}<pre>${escaped}</pre></body></html>`);
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
    background: "var(--bg-raised)",
    color: "var(--fg-primary)",
    border: "0.5px solid var(--border-hair)",
    borderRadius: "var(--radius-md)",
    outline: "none",
    fontSize: "0.75rem",
    padding: "6px 12px",
  };

  return (
    <>
      {showUpgrade && (
        <UpgradeCTA
          reason="You've used your monthly AI quota. Upgrade to continue drafting."
          onClose={() => setShowUpgrade(false)}
        />
      )}
      <PanelShell
        icon={FileEdit}
        title="AI Document Drafting"
        description="Generate court-ready legal documents — motions, briefs, letters, and more"
      >
        {/* Controls */}
        <div className="lex-card mb-6 space-y-4">
          <div>
            <label className="lex-micro mb-1.5 block">Document type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              style={{ ...selectStyle, width: "100%" }}
            >
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {((matter?.verifiedCitations as string[] | undefined) ?? []).length > 0 && (
            <div
              className="rounded px-3 py-2 text-xs"
              style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}
            >
              {((matter?.verifiedCitations as string[] | undefined) ?? []).length} verified citation{((matter?.verifiedCitations as string[] | undefined) ?? []).length !== 1 ? "s" : ""} will be injected as authorities
            </div>
          )}

          <div>
            <label className="lex-micro mb-1.5 block">Special instructions (optional)</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Focus on Fourth Amendment arguments, include recent circuit court precedents…"
              rows={3}
              className="w-full text-sm resize-none"
              style={{
                background: "var(--bg-raised)",
                color: "var(--fg-primary)",
                border: "0.5px solid var(--border-hair)",
                borderRadius: "var(--radius-md)",
                outline: "none",
                padding: "8px 12px",
              }}
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !matter}
            className="lex-btn lex-btn--primary w-full justify-center"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
              : <><Zap size={15} /> Generate {docType}</>
            }
          </button>
        </div>

        {error && (
          <div
            className="rounded px-4 py-3 mb-4 text-xs"
            style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}
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
                  style={{ background: "var(--verdict-neon)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>Drafting {docType}…</p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-tertiary)" }}>This may take 20–40 seconds</p>
          </div>
        )}

        {draft && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="lex-micro">{docType}</p>
              <div className="flex items-center gap-2">
                <button onClick={exportPDF} className="lex-btn lex-btn--secondary">
                  <Download size={12} />
                  Export PDF
                </button>
                <button
                  onClick={copyToClipboard}
                  className={`lex-btn ${copied ? "lex-btn--ghost" : "lex-btn--secondary"}`}
                  style={copied ? { color: "var(--verdict-neon)" } : {}}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div
              className="lex-card overflow-auto"
              style={{ maxHeight: "680px" }}
            >
              <Markdown text={draft} />
            </div>
          </div>
        )}
      </PanelShell>
    </>
  );
}
