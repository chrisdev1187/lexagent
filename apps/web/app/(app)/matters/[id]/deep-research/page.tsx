"use client";

import { useState, useEffect } from "react";
import { ScanSearch, Search, Bookmark, BookmarkCheck, Trash2, ExternalLink, Zap, Loader2 } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { useAuth } from "@/lib/auth";
import { PanelShell } from "@/components/panels/PanelShell";
import { CONGRESS_BASE, ECFR_BASE, EDGAR_BASE, QuotaExceededError, FreeTierExhaustedError, CreditExhaustedError } from "@/lib/api";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { withLexMemory } from "@/lib/lex-memory";
import { Markdown } from "@/components/shared/Markdown";
import { searchOpinions, CLOpinion } from "@/lib/courtlistener";

interface CongressBill {
  congress: number;
  number: string;
  type: string;
  title: string;
  originChamber: string;
  latestAction?: { actionDate: string; text: string };
  url?: string;
}

interface EcfrResult {
  id: string;
  label: string;
  label_description?: string;
  fr_citation?: string;
  full_text_excerpt?: string;
  hierarchy_headings?: { title?: string; part?: string };
}

interface EdgarFiling {
  id: string;
  entityName: string;
  formType: string;
  fileDate: string;
  periodOfReport?: string;
  description?: string;
}

interface SavedPrecedent {
  id: string;
  source: "congress" | "ecfr" | "opinion" | "edgar";
  title: string;
  citation: string;
  url?: string;
  savedAt: number;
}

type Tab = "congress" | "ecfr" | "opinions" | "edgar";

function formatBillCitation(bill: CongressBill): string {
  const typeMap: Record<string, string> = {
    HR: "H.R.", S: "S.", HJRES: "H.J. Res.", SJRES: "S.J. Res.",
    HCONRES: "H. Con. Res.", SCONRES: "S. Con. Res.", HRES: "H. Res.", SRES: "S. Res.",
  };
  const typeLabel = typeMap[bill.type.toUpperCase()] ?? bill.type;
  return `${typeLabel} ${bill.number}, ${bill.congress}th Cong. (${new Date().getFullYear()})`;
}

export default function DeepResearchPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const { session } = useAuth();
  const matter = getMatter(id);

  const [tab, setTab] = useState<Tab>("opinions");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [congressResults, setCongressResults] = useState<CongressBill[]>([]);
  const [ecfrResults, setEcfrResults] = useState<EcfrResult[]>([]);
  const [opinionResults, setOpinionResults] = useState<CLOpinion[]>([]);
  const [edgarResults, setEdgarResults] = useState<EdgarFiling[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [synthesis, setSynthesis] = useState("");
  const [synthError, setSynthError] = useState<string | null>(null);
  const [creditErr, setCreditErr] = useState<{ remaining: number; creditCost: number } | null>(null);

  useEffect(() => {
    if (!matter) return;
    const saved = matter.deepResearchSynthesis as string | undefined;
    if (saved) setSynthesis(saved);
  }, [matter?.id]);

  const savedPrecedents = (matter?.precedents ?? []) as SavedPrecedent[];
  const savedIds = new Set(savedPrecedents.map((p) => p.id));

  const authHeader: Record<string, string> = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const searchCongress = async () => {
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: JSON.stringify({ keywords: query.split(/\s+/) }), limit: "20" });
      const res = await fetch(`${CONGRESS_BASE}/bill?${params}`, { headers: authHeader });
      if (!res.ok) throw new Error(`Congress API ${res.status}`);
      const data = await res.json() as { bills?: CongressBill[] };
      setCongressResults(data.bills ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const searchEcfr = async () => {
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ query, per_page: "20" });
      const res = await fetch(`${ECFR_BASE}/search?${params}`, { headers: authHeader });
      if (!res.ok) throw new Error(`eCFR API ${res.status}`);
      const data = await res.json() as { results?: EcfrResult[] };
      setEcfrResults(data.results ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const searchEdgar = async () => {
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, dateRange: "custom", startdt: "2015-01-01", hits_from: "0" });
      const res = await fetch(`${EDGAR_BASE}/search?${params}`, { headers: authHeader });
      if (!res.ok) throw new Error(`SEC EDGAR ${res.status}`);
      const data = await res.json() as { hits?: { hits?: Array<{ _id: string; _source?: { entity_name?: string; form_type?: string; file_date?: string; period_of_report?: string; description?: string } }> } };
      const hits = data.hits?.hits ?? [];
      setEdgarResults(hits.map(h => ({
        id: h._id,
        entityName: h._source?.entity_name ?? "Unknown",
        formType: h._source?.form_type ?? "",
        fileDate: h._source?.file_date ?? "",
        periodOfReport: h._source?.period_of_report,
        description: h._source?.description,
      })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const searchOpinionResults = async () => {
    setSearching(true);
    setError(null);
    try {
      const results = await searchOpinions(query, 20);
      setOpinionResults(results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim() || searching || !matter) return;
    if (tab === "congress") searchCongress();
    else if (tab === "ecfr") searchEcfr();
    else if (tab === "edgar") searchEdgar();
    else searchOpinionResults();
  };

  const savePrecedent = (p: SavedPrecedent) => {
    if (!matter) return;
    updateMatter({ ...matter, precedents: [...savedPrecedents, p] });
  };

  const removePrecedent = (pid: string) => {
    if (!matter) return;
    updateMatter({ ...matter, precedents: savedPrecedents.filter((p) => p.id !== pid) });
  };

  const saveCongressBill = (bill: CongressBill) => {
    const pid = `congress-${bill.congress}-${bill.type}-${bill.number}`;
    savePrecedent({ id: pid, source: "congress", title: bill.title, citation: formatBillCitation(bill), url: bill.url, savedAt: Date.now() });
  };

  const saveEcfrResult = (r: EcfrResult) => {
    savePrecedent({ id: `ecfr-${r.id}`, source: "ecfr", title: r.label_description ?? r.label, citation: r.fr_citation ?? r.label, savedAt: Date.now() });
  };

  const saveOpinion = (op: CLOpinion) => {
    savePrecedent({ id: `opinion-${op.id}`, source: "opinion", title: op.caseName, citation: op.citation, url: op.absoluteUrl, savedAt: Date.now() });
  };

  const hasResults = opinionResults.length > 0 || congressResults.length > 0 || ecfrResults.length > 0 || edgarResults.length > 0;

  const saveEdgarFiling = (f: EdgarFiling) => {
    savePrecedent({ id: `edgar-${f.id}`, source: "edgar", title: `${f.entityName} — ${f.formType}`, citation: `${f.formType}, ${f.entityName}${f.fileDate ? ` (${new Date(f.fileDate).getFullYear()})` : ""}`, savedAt: Date.now() });
  };

  const synthesize = async () => {
    if (!matter || !hasResults) return;
    setSynthesizing(true);
    setSynthError(null);
    try {
      const opBlock = opinionResults.length > 0
        ? `\nCASE OPINIONS (${opinionResults.length}):\n${opinionResults.slice(0, 10).map((op, i) => `${i + 1}. ${op.caseName}${op.citation ? `, ${op.citation}` : ""} (${op.court})${op.snippet ? `\n   "${op.snippet}"` : ""}`).join("\n")}`
        : "";
      const billBlock = congressResults.length > 0
        ? `\nCONGRESS BILLS (${congressResults.length}):\n${congressResults.slice(0, 10).map((b, i) => `${i + 1}. ${formatBillCitation(b)} — ${b.title}${b.latestAction ? `\n   Status: ${b.latestAction.text}` : ""}`).join("\n")}`
        : "";
      const ecfrBlock = ecfrResults.length > 0
        ? `\neCFR REGULATIONS (${ecfrResults.length}):\n${ecfrResults.slice(0, 10).map((r, i) => `${i + 1}. ${r.fr_citation ?? r.label} — ${r.label_description ?? ""}${r.full_text_excerpt ? `\n   "${r.full_text_excerpt}"` : ""}`).join("\n")}`
        : "";

      const edgarBlock = edgarResults.length > 0
        ? `\nSEC EDGAR FILINGS (${edgarResults.length}):\n${edgarResults.slice(0, 10).map((f, i) => `${i + 1}. ${f.formType} — ${f.entityName}${f.fileDate ? ` (${new Date(f.fileDate).getFullYear()})` : ""}${f.description ? `\n   ${f.description}` : ""}`).join("\n")}`
        : "";

      const content = `Synthesize a comprehensive legal research memo for the following matter based on the retrieved sources.

Matter: ${matter.title}
Client: ${matter.client ?? "N/A"}
Case Type: ${matter.caseType ?? "N/A"}
Jurisdiction: ${matter.jurisdiction ?? "N/A"}
Key Facts: ${matter.facts ?? "N/A"}

RETRIEVED SOURCES:${opBlock}${billBlock}${ecfrBlock}${edgarBlock}

Provide:
## RESEARCH SUMMARY
Key findings and how they relate to the matter.

## APPLICABLE AUTHORITY
Most relevant cases, statutes, or regulations with Bluebook citations.

## STRATEGIC IMPLICATIONS
How these sources shape legal strategy and argument framing.

## OPEN QUESTIONS
Gaps or areas requiring further research.

Be precise, cite sources by number, and flag any circuit splits or conflicting authority.`;

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "deep-research" });
      setStreamingText("");
      const res = await lexFetch(
        { model: settings.model, max_tokens: settings.maxTokens, system: settings.systemPrompt, messages: [{ role: "user", content }] },
        undefined,
        { onChunk: chunk => setStreamingText(prev => prev + chunk) }
      );
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text ?? "No response.";
      setSynthesis(text);
      updateMatter({ ...matter, deepResearchSynthesis: text });
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) { setSynthError(e.message); }
      else if (e instanceof CreditExhaustedError) { setCreditErr({ remaining: e.remaining, creditCost: e.creditCost }); }
      else if (e instanceof QuotaExceededError) { setSynthError("AI quota exceeded — upgrade your plan."); }
      else { setSynthError((e as Error).message); }
    } finally {
      setStreamingText("");
      setSynthesizing(false);
    }
  };

  const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
    congress: { label: "Congress", color: "var(--verdict-amber)" },
    ecfr:     { label: "eCFR",    color: "var(--verdict-neon)" },
    opinion:  { label: "Opinion", color: "var(--verdict-violet)" },
    edgar:    { label: "SEC",     color: "#0ea5e9" },
  };

  const TAB_LABELS: Record<Tab, string> = { congress: "Congress Bills", ecfr: "eCFR Regs", opinions: "Case Opinions", edgar: "SEC EDGAR" };

  return (
    <>
      {creditErr && (
        <UpgradeCTA
          reason="Monthly credits exhausted. Upgrade to continue synthesizing research."
          creditsRemaining={creditErr.remaining}
          creditCost={creditErr.creditCost}
          onClose={() => setCreditErr(null)}
        />
      )}
    <PanelShell
      icon={ScanSearch}
      title="Deep Research"
      description="Multi-source legal research: opinions, Congress bills, eCFR regulations, SEC EDGAR filings"
    >
      {/* Source tabs */}
      <div className="flex gap-1 mb-4">
        {(["opinions", "congress", "ecfr", "edgar"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150"
            style={{
              background: tab === t ? "rgba(0,255,195,0.06)" : "var(--bg-raised)",
              border: `0.5px solid ${tab === t ? "rgba(0,255,195,0.28)" : "var(--border-hair)"}`,
              color: tab === t ? "var(--verdict-neon)" : "var(--fg-tertiary)",
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div
        className="flex gap-2 mb-4"
        style={{ background: "rgba(17,17,20,0.7)", borderRadius: 10, border: "0.5px solid rgba(0,255,195,0.14)", overflow: "hidden" }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={
            tab === "congress" ? "Search bills — e.g. 'immigration reform'…"
            : tab === "ecfr" ? "Search CFR — e.g. 'clean air emissions'…"
            : tab === "edgar" ? "Search SEC filings — e.g. 'securities fraud disclosure'…"
            : "Search case opinions — e.g. 'fourth amendment search'…"
          }
          className="flex-1 px-4 py-2.5 text-sm"
          style={{ background: "transparent", color: "var(--fg-primary)", outline: "none", border: "none" }}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || searching || !matter}
          className="lex-btn lex-btn--primary"
          style={{ borderRadius: 0 }}
        >
          <Search size={12} />
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded px-4 py-2 mb-4 text-xs" style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}>
          {error}
        </div>
      )}

      {/* Opinion results */}
      {tab === "opinions" && opinionResults.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--fg-tertiary)" }}>
            CASE OPINIONS ({opinionResults.length})
          </p>
          {opinionResults.map((op) => {
            const pid = `opinion-${op.id}`;
            const saved = savedIds.has(pid);
            return (
              <div key={pid} className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--fg-primary)" }}>{op.caseName}</p>
                  <p className="text-xs font-mono" style={{ color: "var(--verdict-neon)" }}>{op.citation}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
                    {op.court}{op.dateFiled ? ` · ${new Date(op.dateFiled).toLocaleDateString("en-US", { year: "numeric", month: "short" })}` : ""}
                  </p>
                  {op.snippet && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--fg-secondary)" }}>{op.snippet}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {op.absoluteUrl && (
                    <a href={op.absoluteUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-md cursor-pointer" style={{ color: "var(--fg-tertiary)" }}>
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => !saved && saveOpinion(op)}
                    className="p-1.5 rounded-md cursor-pointer"
                    style={{ color: saved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}
                    title={saved ? "Saved" : "Save to precedents"}
                  >
                    {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Congress results */}
      {tab === "congress" && congressResults.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--fg-tertiary)" }}>
            CONGRESS RESULTS ({congressResults.length})
          </p>
          {congressResults.map((bill) => {
            const pid = `congress-${bill.congress}-${bill.type}-${bill.number}`;
            const saved = savedIds.has(pid);
            return (
              <div key={pid} className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5 line-clamp-2" style={{ color: "var(--fg-primary)" }}>{bill.title}</p>
                  <p className="text-xs font-mono" style={{ color: "var(--verdict-amber)" }}>{formatBillCitation(bill)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{bill.originChamber}</p>
                  {bill.latestAction && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--fg-secondary)" }}>
                      {bill.latestAction.actionDate}: {bill.latestAction.text}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {bill.url && (
                    <a href={bill.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md cursor-pointer" style={{ color: "var(--fg-tertiary)" }}>
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => !saved && saveCongressBill(bill)}
                    className="p-1.5 rounded-md cursor-pointer"
                    style={{ color: saved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}
                    title={saved ? "Saved" : "Save to precedents"}
                  >
                    {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* eCFR results */}
      {tab === "ecfr" && ecfrResults.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--fg-tertiary)" }}>
            eCFR RESULTS ({ecfrResults.length})
          </p>
          {ecfrResults.map((r) => {
            const pid = `ecfr-${r.id}`;
            const saved = savedIds.has(pid);
            return (
              <div key={pid} className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--fg-primary)" }}>
                    {r.fr_citation ?? r.label} — {r.label_description}
                  </p>
                  {r.hierarchy_headings?.title && (
                    <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Title {r.hierarchy_headings.title}</p>
                  )}
                  {r.full_text_excerpt && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--fg-secondary)" }}>{r.full_text_excerpt}</p>
                  )}
                </div>
                <button
                  onClick={() => !saved && saveEcfrResult(r)}
                  className="p-1.5 rounded-md cursor-pointer flex-shrink-0"
                  style={{ color: saved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}
                  title={saved ? "Saved" : "Save to precedents"}
                >
                  {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* EDGAR results */}
      {tab === "edgar" && edgarResults.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--fg-tertiary)" }}>
            SEC EDGAR FILINGS ({edgarResults.length})
          </p>
          {edgarResults.map((f) => {
            const pid = `edgar-${f.id}`;
            const saved = savedIds.has(pid);
            return (
              <div key={pid} className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(14,165,233,0.1)", color: "#0ea5e9", border: "0.5px solid rgba(14,165,233,0.3)" }}>{f.formType}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--fg-primary)" }}>{f.entityName}</span>
                  </div>
                  {f.fileDate && (
                    <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Filed: {new Date(f.fileDate).toLocaleDateString()}{f.periodOfReport ? ` · Period: ${f.periodOfReport}` : ""}</p>
                  )}
                  {f.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--fg-secondary)" }}>{f.description}</p>
                  )}
                </div>
                <button
                  onClick={() => !saved && saveEdgarFiling(f)}
                  className="p-1.5 rounded-md cursor-pointer flex-shrink-0"
                  style={{ color: saved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}
                  title={saved ? "Saved" : "Save to precedents"}
                >
                  {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Synthesis */}
      {hasResults && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono tracking-wider" style={{ color: "var(--fg-tertiary)" }}>ARES SYNTHESIS</p>
            <div className="flex items-center gap-2">
              <ExportButton content={synthesis} filename={`synthesis-${matter?.title ?? id}`} format="markdown" label="Export" />
              <button
                onClick={synthesize}
                disabled={synthesizing}
                className="lex-btn lex-btn--primary"
              >
                {synthesizing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                {synthesizing ? "Synthesizing…" : synthesis ? "Re-synthesize" : "Synthesize with ARES"}
              </button>
            </div>
          </div>

          {synthError && (
            <div className="rounded px-4 py-2 mb-3 text-xs" style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}>
              {synthError}
            </div>
          )}

          {(synthesis || streamingText) && (
            <div className="rounded p-4" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(0,255,195,0.14)" }}>
              <Markdown text={streamingText || synthesis} />
              {synthesizing && streamingText && (
                <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "var(--verdict-neon)", borderRadius: "1px" }} />
              )}
            </div>
          )}

          {synthesizing && !streamingText && (
            <div className="flex items-center gap-2 py-4">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--verdict-neon)", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>ARES is analyzing sources…</span>
            </div>
          )}
        </div>
      )}

      {/* Saved precedents */}
      {savedPrecedents.length > 0 && (
        <div>
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--fg-tertiary)" }}>
            SAVED TO MATTER ({savedPrecedents.length})
          </p>
          <div className="space-y-2">
            {savedPrecedents.map((p) => {
              const badge = SOURCE_BADGE[p.source];
              return (
                <div key={p.id} className="rounded px-3 py-2.5 flex items-center gap-3" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: "rgba(17,17,20,0.7)", color: badge?.color ?? "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                  >
                    {badge?.label ?? p.source}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--fg-primary)" }}>{p.title}</p>
                    <p className="text-xs font-mono" style={{ color: "var(--fg-tertiary)" }}>{p.citation}</p>
                  </div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="p-1 rounded cursor-pointer flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => removePrecedent(p.id)}
                    className="p-1 rounded cursor-pointer flex-shrink-0"
                    style={{ color: "var(--fg-tertiary)", background: "none", border: "none" }}
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searching && opinionResults.length === 0 && congressResults.length === 0 && ecfrResults.length === 0 && edgarResults.length === 0 && savedPrecedents.length === 0 && (
        <div className="rounded p-8 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <ScanSearch size={28} className="mx-auto mb-3" style={{ color: "var(--fg-tertiary)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--fg-primary)" }}>Search federal sources</p>
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
            Case opinions, Congress bills, and eCFR regulations. Save sources to this matter&apos;s record.
          </p>
        </div>
      )}
    </PanelShell>
    </>
  );
}
