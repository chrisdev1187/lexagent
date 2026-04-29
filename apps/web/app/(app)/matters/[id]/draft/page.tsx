"use client";

import { useState, useEffect } from "react";
import { FileEdit, Zap, Copy, Check, Loader2, Download, BookOpen, ChevronDown, ChevronUp, Bookmark, Trash2, Plus } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { buildLetterheadHtml } from "@/components/shared/Letterhead";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch, QuotaExceededError, FreeTierExhaustedError, CreditExhaustedError } from "@/lib/api";
import { withLexMemory } from "@/lib/lex-memory";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { Markdown } from "@/components/shared/Markdown";

interface DraftVersion {
  content: string;
  docType: string;
  timestamp: number;
}

interface Snippet { id: string; label: string; text: string; }

const DOC_TEMPLATES: Record<string, string[]> = {
  "Motion to Dismiss": [
    "12(b)(6) failure to state a claim — Twombly/Iqbal plausibility standard; focus on facial insufficiency of factual allegations",
    "12(b)(1) lack of subject matter jurisdiction — Article III standing, mootness arguments",
    "12(b)(2) lack of personal jurisdiction — minimum contacts, purposeful availment analysis",
  ],
  "Motion for Summary Judgment": [
    "No genuine dispute of material fact — Rule 56(a) standard; movant burden then nonmovant obligation to show specific facts",
    "Qualified immunity — clearly established law prong under Pearson v. Callahan; no clearly established right",
  ],
  "Brief": [
    "Appellate brief — standard of review first (de novo / abuse of discretion); preserve all preserved-error arguments; harmless error",
    "Opposition brief — lead with applicable standard; distinguish adverse cases on facts; attack opponent's legal conclusions",
  ],
  "Demand Letter": [
    "Pre-litigation demand — specific dollar amount, legal basis, 14-day cure period, litigation warning",
    "FDCPA demand — 30-day debt validation period, cease-and-desist language under 15 U.S.C. § 1692c",
  ],
  "Settlement Agreement": [
    "Full mutual release — representations and warranties, confidentiality clause, no admission of liability",
    "Structured settlement — payment schedule, default clause, acceleration on missed payment",
  ],
  "Complaint": [
    "Federal complaint — short plain statement per Rule 8(a); jurisdictional allegations first; demand jury trial",
    "Class action — class definition, numerosity, commonality, typicality, adequacy under Rule 23",
  ],
  "Memo of Law": [
    "IRAC format — Issue / Rule / Application / Conclusion for each argument heading",
    "Office memo — Questions Presented, Brief Answer, Discussion (IRAC), Conclusion",
  ],
  "Client Letter": [
    "Status update — matter summary, recent developments, next steps, client action items",
    "Adverse outcome — plain language explanation of result, options going forward, timeline",
  ],
};

const QUICK_FILL_KEYS = ["court", "caseNumber", "parties", "judgeName"] as const;
const QUICK_FILL_LABELS: Record<string, string> = { court: "Court", caseNumber: "Case No.", parties: "Parties", judgeName: "Judge" };

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
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);

  useEffect(() => {
    if (!matter) return;
    const versions = (matter.draftVersions as DraftVersion[] | undefined) ?? [];
    if (versions.length > 0 && !draft) {
      setDraft(versions[0].content);
      setDocType(versions[0].docType);
    }
  }, [matter?.id]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [creditErr, setCreditErr] = useState<{ remaining: number; creditCost: number } | null>(null);
  const [freeTierMsg, setFreeTierMsg] = useState<string | null>(null);

  const generate = async () => {
    if (!matter) return;
    setLoading(true);
    setError(null);
    try {
      const firmBlock = settings.firmName
        ? `\n\nATTORNEY/FIRM:\n${settings.firmName}${settings.firmAddress ? `\n${settings.firmAddress}` : ""}${settings.firmCity ? `, ${settings.firmCity}` : ""}${settings.firmState ? `, ${settings.firmState}` : ""}${settings.firmZip ? ` ${settings.firmZip}` : ""}${settings.barNumber ? `\nBar No. ${settings.barNumber}${settings.barJurisdiction ? ` (${settings.barJurisdiction})` : ""}` : ""}`
        : "";

      const verifiedCitations = (matter.verifiedCitations as string[] | undefined) ?? [];
      const citationsBlock = verifiedCitations.length > 0
        ? `\n\nVERIFIED AUTHORITIES (use these Bluebook citations verbatim):\n${verifiedCitations.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
        : "";

      const judgeBlock = matter.judgeAnalysis
        ? `\n\nJUDGE INTELLIGENCE BRIEF (tailor tone and argument framing accordingly):\n${(matter.judgeAnalysis as string).slice(0, 1200)}`
        : "";

      const userContent = `Draft a complete, court-ready ${docType} for the following matter:

Matter: ${matter.title}
Case Type: ${matter.caseType ?? "N/A"}
Jurisdiction: ${matter.jurisdiction ?? "N/A"}
Court: ${matter.court ?? "N/A"}
Judge: ${matter.judgeName || "N/A"}
Parties: ${(matter.parties as string | undefined) || "N/A"}
Case No.: ${(matter.caseNumber as string | undefined) || "N/A"}
Facts: ${matter.facts ?? "N/A"}${firmBlock}${citationsBlock}${judgeBlock}

Special Instructions: ${instructions || "None"}

DRAFTING REQUIREMENTS:
1. Caption block first: Court name, parties (Plaintiff v. Defendant), Case No., and document title — centered
2. Introduction/Preliminary Statement: one paragraph stating relief sought and basis
3. Argument sections numbered (I, II, III…) with ## headings; sub-points lettered (A, B…)
4. Use ONLY verified Bluebook citations (Rule 10 cases, Rule 12 statutes) — no placeholders
5. Factual citations: "Compl. ¶ __" or "Ex. __ at __" — do not fabricate record references
6. Include CONCLUSION paragraph restating relief sought
7. Signature block: firm name, address, bar number, date line
8. Certificate of Service at end
9. BOTTOM LINE: one sentence stating the exact legal standard and why it is met
10. Flag any element requiring factual record cite with [VERIFY: ___]`;

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "draft" });
      setStreamingText("");
      const res = await lexFetch(
        { model: settings.model, max_tokens: settings.maxTokens, system: settings.systemPrompt, messages: [{ role: "user", content: userContent }] },
        undefined,
        { onChunk: chunk => setStreamingText(prev => prev + chunk) }
      );
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text ?? "No response.";
      setDraft(text);
      const prevVersions = (matter.draftVersions as DraftVersion[] | undefined) ?? [];
      const newVersion: DraftVersion = { content: text, docType, timestamp: Date.now() };
      updateMatter({ ...matter, draftVersions: [newVersion, ...prevVersions].slice(0, 5) });
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) { setFreeTierMsg(e.message); }
      else if (e instanceof CreditExhaustedError) { setCreditErr({ remaining: e.remaining, creditCost: e.creditCost }); }
      else if (e instanceof QuotaExceededError) { setShowUpgrade(true); }
      else { setError((e as Error).message); }
    } finally {
      setStreamingText("");
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!draft) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const escaped = draft.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docType}</title><style>
      body{font-family:"Times New Roman",serif;font-size:12pt;line-height:2;margin:0;color:#000}
      @page{margin:1in}
      pre{white-space:pre-wrap;word-wrap:break-word;font-family:inherit;font-size:inherit}
    </style></head><body>${buildLetterheadHtml(settings)}<pre>${escaped}</pre></body></html>`);
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
      {(showUpgrade || creditErr) && (
        <UpgradeCTA
          reason={creditErr ? "Monthly credits exhausted. Upgrade to continue drafting." : "You've used your monthly AI quota. Upgrade to continue."}
          creditsRemaining={creditErr?.remaining}
          creditCost={creditErr?.creditCost}
          onClose={() => { setShowUpgrade(false); setCreditErr(null); }}
        />
      )}
      {freeTierMsg && (
        <div className="rounded px-4 py-3 mb-4 flex items-start justify-between gap-3" style={{ background: "rgba(0,255,195,0.05)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: "var(--verdict-neon)" }}>Free plan limit reached</p>
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{freeTierMsg}</p>
          </div>
          <a href="/settings/billing" className="lex-btn lex-btn--primary text-xs flex-shrink-0">Upgrade</a>
        </div>
      )}
      <PanelShell
        icon={FileEdit}
        title="AI Document Drafting"
        description="Generate court-ready legal documents — motions, briefs, letters, and more"
      >
        {/* Controls */}
        <div className="lex-card mb-6 space-y-4">
          {((matter?.draftVersions as DraftVersion[] | undefined) ?? []).length > 0 && (
            <div>
              <label className="lex-micro mb-1.5 block">Previous versions</label>
              <select
                onChange={e => {
                  const versions = (matter?.draftVersions as DraftVersion[] | undefined) ?? [];
                  const v = versions[Number(e.target.value)];
                  if (v) { setDraft(v.content); setDocType(v.docType); }
                }}
                style={{ ...selectStyle, width: "100%" }}
              >
                {((matter?.draftVersions as DraftVersion[] | undefined) ?? []).map((v, i) => (
                  <option key={v.timestamp} value={i}>
                    {v.docType} — {new Date(v.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </option>
                ))}
              </select>
            </div>
          )}
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

          {/* Missing fields quick-fill */}
          {matter && QUICK_FILL_KEYS.some(k => !(matter as Record<string, unknown>)[k]) && (
            <div className="rounded p-3 space-y-2" style={{ background: "rgba(255,185,0,0.04)", border: "0.5px solid rgba(255,185,0,0.18)" }}>
              <p className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--verdict-amber)" }}>
                Missing matter fields — fill to improve draft quality
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILL_KEYS.filter(k => !(matter as Record<string, unknown>)[k]).map(k => (
                  <div key={k} style={{ flex: "1 1 140px" }}>
                    <label className="lex-micro mb-1 block">{QUICK_FILL_LABELS[k]}</label>
                    <input
                      type="text"
                      className="lex-input w-full"
                      placeholder={QUICK_FILL_LABELS[k]}
                      onBlur={e => { if (e.target.value && matter) updateMatter({ ...matter, [k]: e.target.value }); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template library */}
          <div>
            <button
              onClick={() => setShowTemplates(p => !p)}
              className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] uppercase mb-1.5"
              style={{ color: "var(--fg-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <BookOpen size={10} />
              Quick Templates
              {showTemplates ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </button>
            {showTemplates && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(DOC_TEMPLATES[docType] ?? []).length === 0 && (
                  <span className="text-xs" style={{ color: "var(--fg-quaternary)" }}>No templates for this doc type yet.</span>
                )}
                {(DOC_TEMPLATES[docType] ?? []).map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => { setInstructions(tpl); setShowTemplates(false); }}
                    className="lex-btn lex-btn--ghost text-xs text-left"
                    style={{ maxWidth: "100%", whiteSpace: "normal", height: "auto", padding: "4px 8px" }}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="lex-micro">Special instructions (optional)</label>
              <button
                onClick={() => {
                  if (!instructions.trim() || !matter) return;
                  const snippets = ((matter.snippets as Snippet[] | undefined) ?? []);
                  updateMatter({ ...matter, snippets: [{ id: crypto.randomUUID(), label: `${docType} — ${new Date().toLocaleTimeString()}`, text: instructions }, ...snippets].slice(0, 20) });
                }}
                disabled={!instructions.trim()}
                className="lex-btn lex-btn--ghost"
                style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                title="Save current instructions as snippet"
              >
                <Bookmark size={10} />
                Save snippet
              </button>
            </div>
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

          {/* Snippet bank */}
          {((matter?.snippets as Snippet[] | undefined) ?? []).length > 0 && (
            <div>
              <button
                onClick={() => setShowSnippets(p => !p)}
                className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] uppercase"
                style={{ color: "var(--fg-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <Bookmark size={10} />
                Saved Snippets ({((matter?.snippets as Snippet[] | undefined) ?? []).length})
                {showSnippets ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
              </button>
              {showSnippets && (
                <div className="mt-2 space-y-1.5">
                  {((matter?.snippets as Snippet[] | undefined) ?? []).map(s => (
                    <div key={s.id} className="flex items-start gap-2 rounded p-2" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[9px] tracking-widest uppercase mb-0.5" style={{ color: "var(--fg-quaternary)" }}>{s.label}</p>
                        <p className="text-xs truncate" style={{ color: "var(--fg-secondary)" }}>{s.text}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => setInstructions(prev => prev ? `${prev}\n\n${s.text}` : s.text)}
                          className="lex-btn lex-btn--ghost"
                          style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                          title="Append to instructions"
                        >
                          <Plus size={9} />
                          Use
                        </button>
                        <button
                          onClick={() => {
                            if (!matter) return;
                            updateMatter({ ...matter, snippets: ((matter.snippets as Snippet[] | undefined) ?? []).filter(x => x.id !== s.id) });
                          }}
                          className="lex-btn lex-btn--ghost"
                          style={{ fontSize: "0.65rem", padding: "2px 4px", color: "var(--verdict-crimson)" }}
                          title="Delete snippet"
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
          streamingText ? (
            <div className="lex-card overflow-auto" style={{ maxHeight: "720px", fontFamily: "var(--font-mono, monospace)", fontSize: "0.82rem", whiteSpace: "pre-wrap" }}>
              <Markdown text={streamingText} />
              <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "var(--verdict-neon)", borderRadius: "1px" }} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex gap-1.5 mb-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--verdict-neon)", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>Drafting {docType}…</p>
            </div>
          )
        )}

        {draft && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="lex-micro">{docType}</p>
              <div className="flex items-center gap-2">
                <ExportButton content={draft} filename={`${docType}-${matter?.title ?? id}`} format="markdown" label="Export MD" />
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
