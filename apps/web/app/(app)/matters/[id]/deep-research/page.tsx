"use client";

import { useState, useEffect } from "react";
import { ScanSearch, Search, Zap, Loader2 } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { useAuth } from "@/lib/auth";
import { PanelShell } from "@/components/panels/PanelShell";
import {
  QuotaExceededError, FreeTierExhaustedError, CreditExhaustedError
} from "@/lib/api";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { withLexMemory, AresStatusEvent } from "@/lib/lex-memory";
import { postureDetect, aresDebate } from "@/lib/ares";
import { Markdown } from "@/components/shared/Markdown";

import { OpinionResult } from "@/components/deep-research/OpinionResult";
import { CongressResult, formatBillCitation } from "@/components/deep-research/CongressResult";
import { EcfrResultItem } from "@/components/deep-research/EcfrResult";
import { EdgarResult } from "@/components/deep-research/EdgarResult";
import { GovInfoResult } from "@/components/deep-research/GovInfoResult";
import { OpenStatesResult } from "@/components/deep-research/OpenStatesResult";
import { PatentResultItem } from "@/components/deep-research/PatentResult";
import { SavedPrecedent } from "@/types/research";
import { SavedPrecedentsList } from "@/components/deep-research/SavedPrecedentsList";
import { useDeepResearchSearch } from "@/hooks/deep-research/useDeepResearchSearch";

type Tab = "congress" | "ecfr" | "opinions" | "edgar" | "govinfo" | "openstates" | "patents";

export default function DeepResearchPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const { session } = useAuth();
  const matter = getMatter(id);

  const [tab, setTab] = useState<Tab>("opinions");
  const [query, setQuery] = useState("");

  const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : ({} as Record<string, string>);
  const { searching, error, results, search } = useDeepResearchSearch(authHeader);

  const [synthesizing, setSynthesizing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [synthesis, setSynthesis] = useState("");
  const [synthError, setSynthError] = useState<string | null>(null);
  const [thoughtTrace, setThoughtTrace] = useState<AresStatusEvent[]>([]);
  const [creditErr, setCreditErr] = useState<{ remaining: number; creditCost: number } | null>(null);

  useEffect(() => {
    if (!matter) return;
    const saved = matter.deepResearchSynthesis as string | undefined;
    if (saved) setSynthesis(saved);
  }, [matter?.id, matter?.deepResearchSynthesis]);

  const savedPrecedents = (matter?.precedents ?? []) as SavedPrecedent[];
  const savedIds = new Set(savedPrecedents.map((p) => p.id));

  const handleSearch = () => {
    if (!query.trim() || searching || !matter) return;
    search(tab, query);
  };

  const savePrecedent = (p: SavedPrecedent) => {
    if (!matter) return;
    updateMatter({ ...matter, precedents: [...savedPrecedents, p] });
  };

  const removePrecedent = (pid: string) => {
    if (!matter) return;
    updateMatter({ ...matter, precedents: savedPrecedents.filter((p) => p.id !== pid) });
  };

  const hasResults = results.opinions.length > 0 || results.congress.length > 0 || results.ecfr.length > 0 || results.edgar.length > 0 || results.govinfo.length > 0 || results.openstates.length > 0 || results.patents.length > 0;

  const synthesize = async () => {
    if (!matter || !hasResults) return;
    setSynthesizing(true);
    setSynthError(null);
    setThoughtTrace([]);
    try {
      const opBlock = results.opinions.length > 0 ? `\nCASE OPINIONS (${results.opinions.length}):\n${results.opinions.slice(0, 10).map((op, i) => `${i + 1}. ${op.caseName}${op.citation ? `, ${op.citation}` : ""} (${op.court})${op.snippet ? `\n   "${op.snippet}"` : ""}`).join("\n")}` : "";
      const billBlock = results.congress.length > 0 ? `\nCONGRESS BILLS (${results.congress.length}):\n${results.congress.slice(0, 10).map((b, i) => `${i + 1}. ${formatBillCitation(b)} — ${b.title}${b.latestAction ? `\n   Status: ${b.latestAction.text}` : ""}`).join("\n")}` : "";
      const ecfrBlock = results.ecfr.length > 0 ? `\neCFR REGULATIONS (${results.ecfr.length}):\n${results.ecfr.slice(0, 10).map((r, i) => `${i + 1}. ${r.fr_citation ?? r.label} — ${r.label_description ?? ""}${r.full_text_excerpt ? `\n   "${r.full_text_excerpt}"` : ""}`).join("\n")}` : "";
      const edgarBlock = results.edgar.length > 0 ? `\nSEC EDGAR FILINGS (${results.edgar.length}):\n${results.edgar.slice(0, 10).map((f, i) => `${i + 1}. ${f.formType} — ${f.entityName}${f.fileDate ? ` (${new Date(f.fileDate).getFullYear()})` : ""}${f.description ? `\n   ${f.description}` : ""}`).join("\n")}` : "";
      const govInfoBlock = results.govinfo.length > 0 ? `\nGOVINFO FEDERAL DOCUMENTS (${results.govinfo.length}):\n${results.govinfo.slice(0, 8).map((d, i) => `${i + 1}. ${d.packageId} — ${d.title}${d.dateIssued ? ` (${new Date(d.dateIssued).getFullYear()})` : ""}${d.governmentAuthor1 ? `\n   Author: ${d.governmentAuthor1}` : ""}`).join("\n")}` : "";
      const openStatesBlock = results.openstates.length > 0 ? `\nSTATE LEGISLATION (${results.openstates.length}):\n${results.openstates.slice(0, 8).map((b, i) => `${i + 1}. ${b.identifier}${b.jurisdiction?.name ? ` (${b.jurisdiction.name})` : ""} — ${b.title}${b.latest_action_date ? `\n   Last action: ${new Date(b.latest_action_date).toLocaleDateString()}` : ""}`).join("\n")}` : "";
      const patentBlock = results.patents.length > 0 ? `\nPATENTS (${results.patents.length}):\n${results.patents.slice(0, 8).map((p, i) => `${i + 1}. U.S. Patent No. ${p.patent_id} — ${p.patent_title}${p.patent_date ? ` (${new Date(p.patent_date).getFullYear()})` : ""}${p.assignees?.[0]?.assignee_organization ? `\n   Assignee: ${p.assignees[0].assignee_organization}` : ""}`).join("\n")}` : "";

      const content = `Synthesize a comprehensive legal research memo for the following matter based on the retrieved sources.

Matter: ${matter.title}
Client: ${matter.client ?? "N/A"}
Case Type: ${matter.caseType ?? "N/A"}
Jurisdiction: ${matter.jurisdiction ?? "N/A"}
Key Facts: ${matter.facts ?? "N/A"}

RETRIEVED SOURCES:${opBlock}${billBlock}${ecfrBlock}${edgarBlock}${govInfoBlock}${openStatesBlock}${patentBlock}

Provide:
## RESEARCH SUMMARY
## APPLICABLE AUTHORITY
## STRATEGIC IMPLICATIONS
## OPEN QUESTIONS`;

      let debatePrefix = "";
      const postureOut = await postureDetect({ matter_facts: matter.facts ?? "" }).catch(() => null);
      if (postureOut && (postureOut.posture === "msj" || postureOut.posture === "appeal") && postureOut.confidence >= 0.5) {
        const debateOut = await aresDebate({
          question: `Deep research for: ${matter.title}`,
          facts: matter.facts ?? "",
          posture: postureOut.posture,
          jurisdiction: matter.jurisdiction ?? undefined,
          matterId: matter.id,
        }).catch(() => null);
        if (debateOut && !debateOut.skipped && !debateOut.partial) {
          const judge = debateOut.rounds.find(r => r.role === "judge");
          debatePrefix = `## ADVERSARIAL DEBATE SYNTHESIS (${postureOut.posture.toUpperCase()})\nPredicted outcome: ${debateOut.predicted_outcome} (confidence ${Math.round(debateOut.confidence * 100)}%)\n${debateOut.reasoning}\n${judge ? `Key points:\n${judge.key_points.map(p => `- ${p}`).join("\n")}` : ""}\n\n`;
        }
      }

      const lexFetch = withLexMemory(matter, updateMatter, {
        tab: "deep-research",
        onStatus: (ev) => setThoughtTrace(prev => [...prev, ev])
      });
      setStreamingText("");
      const res = await lexFetch(
        { model: settings.model, max_tokens: settings.maxTokens, system: settings.systemPrompt, messages: [{ role: "user", content: debatePrefix + content }] },
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

  const TAB_LABELS: Record<Tab, string> = {
    congress: "Congress Bills", ecfr: "eCFR Regs", opinions: "Case Opinions",
    edgar: "SEC EDGAR", govinfo: "GovInfo", openstates: "State Leg.", patents: "Patents",
  };

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
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {(["opinions", "congress", "ecfr", "edgar", "govinfo", "openstates", "patents"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 whitespace-nowrap"
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

      <div
        className="flex gap-2 mb-4"
        style={{ background: "rgba(17,17,20,0.7)", borderRadius: 10, border: "0.5px solid rgba(0,255,195,0.14)", overflow: "hidden" }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={
            tab === "congress"   ? "Search bills — e.g. 'immigration reform'…"
            : tab === "ecfr"    ? "Search CFR — e.g. 'clean air emissions'…"
            : tab === "edgar"   ? "Search SEC filings — e.g. 'securities fraud disclosure'…"
            : tab === "govinfo" ? "Search federal documents — e.g. 'FDA rule 2024'…"
            : tab === "openstates" ? "Search state bills — e.g. 'consumer privacy'…"
            : tab === "patents" ? "Search patents — e.g. 'machine learning inference'…"
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

      <div className="space-y-2 mb-6">
        {tab === "opinions" && results.opinions.map(op => (
          <OpinionResult key={op.id} opinion={op} isSaved={savedIds.has(`opinion-${op.id}`)} onSave={op => savePrecedent({ id: `opinion-${op.id}`, source: "opinion", title: op.caseName, citation: op.citation, url: op.absoluteUrl, savedAt: Date.now() })} />
        ))}
        {tab === "congress" && results.congress.map(b => (
          <CongressResult key={`${b.congress}-${b.number}`} bill={b} isSaved={savedIds.has(`congress-${b.congress}-${b.type}-${b.number}`)} onSave={b => savePrecedent({ id: `congress-${b.congress}-${b.type}-${b.number}`, source: "congress", title: b.title, citation: formatBillCitation(b), url: b.url, savedAt: Date.now() })} />
        ))}
        {tab === "ecfr" && results.ecfr.map(r => (
          <EcfrResultItem key={r.id} result={r} isSaved={savedIds.has(`ecfr-${r.id}`)} onSave={r => savePrecedent({ id: `ecfr-${r.id}`, source: "ecfr", title: r.label_description ?? r.label, citation: r.fr_citation ?? r.label, savedAt: Date.now() })} />
        ))}
        {tab === "edgar" && results.edgar.map(f => (
          <EdgarResult key={f.id} filing={f} isSaved={savedIds.has(`edgar-${f.id}`)} onSave={f => savePrecedent({ id: `edgar-${f.id}`, source: "edgar", title: `${f.entityName} — ${f.formType}`, citation: `${f.formType}, ${f.entityName}${f.fileDate ? ` (${new Date(f.fileDate).getFullYear()})` : ""}`, savedAt: Date.now() })} />
        ))}
        {tab === "govinfo" && results.govinfo.map(d => (
          <GovInfoResult key={d.packageId} doc={d} isSaved={savedIds.has(`govinfo-${d.packageId}`)} onSave={d => savePrecedent({ id: `govinfo-${d.packageId}`, source: "govinfo", title: d.title, citation: `${d.collectionCode ?? "Fed. Doc."}, ${d.packageId}${d.dateIssued ? ` (${new Date(d.dateIssued).getFullYear()})` : ""}`, url: d.packageLink, savedAt: Date.now() })} />
        ))}
        {tab === "openstates" && results.openstates.map(b => (
          <OpenStatesResult key={b.id} bill={b} isSaved={savedIds.has(`openstates-${b.id}`)} onSave={b => savePrecedent({ id: `openstates-${b.id}`, source: "openstates", title: b.title, citation: `${b.identifier}`, url: b.openstates_url, savedAt: Date.now() })} />
        ))}
        {tab === "patents" && results.patents.map(p => (
          <PatentResultItem key={p.patent_id} patent={p} isSaved={savedIds.has(`patent-${p.patent_id}`)} onSave={p => savePrecedent({ id: `patent-${p.patent_id}`, source: "patent", title: p.patent_title, citation: `U.S. Patent No. ${p.patent_id}`, savedAt: Date.now() })} />
        ))}
      </div>

      {hasResults && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono tracking-wider" style={{ color: "var(--fg-tertiary)" }}>ARES SYNTHESIS</p>
            <div className="flex items-center gap-2">
              <ExportButton content={synthesis} filename={`synthesis-${matter?.title ?? id}`} format="markdown" label="Export" />
              <button onClick={synthesize} disabled={synthesizing} className="lex-btn lex-btn--primary">
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

          {synthesizing && (
            <div className="mb-4 space-y-2 border-l border-white/5 pl-4 py-1">
              <p className="text-[10px] font-mono text-[var(--verdict-neon)] animate-pulse uppercase tracking-widest mb-2">Analyzing retrieval context...</p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-hide">
                {thoughtTrace.map((t, i) => (
                  <div key={i} className="text-[9px] font-mono text-[var(--fg-quaternary)] flex gap-2">
                    <span className="text-[var(--verdict-neon)] opacity-60">→</span>
                    <span>
                      {t.type === "thinking" && t.message}
                      {t.type === "tool_start" && `Calling ${t.tool}...`}
                      {t.type === "tool_end" && `Tool ${t.tool} returned.`}
                      {t.type === "critic_start" && "Running accuracy critic..."}
                      {t.type === "critic_end" && `Critic: ${(t.score * 100).toFixed(0)}% accuracy.`}
                      {t.type === "correction_start" && "Correcting hallucinations..."}
                    </span>
                  </div>
                ))}
              </div>
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
        </div>
      )}

      <SavedPrecedentsList precedents={savedPrecedents} onRemove={removePrecedent} />

      {!searching && !hasResults && savedPrecedents.length === 0 && (
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
