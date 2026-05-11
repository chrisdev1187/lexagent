"use client";

import { useState } from "react";
import {
  ShieldCheck, Loader2, BookMarked,
  FileSearch, Sparkles, AlertTriangle, X
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { citationLookup } from "@/lib/courtlistener";
import { PanelShell } from "@/components/panels/PanelShell";
import { mergeMemory, authorityFromVerified } from "@/lib/lex-memory";
import { anthropicFetch, QuotaExceededError, FreeTierExhaustedError, CreditExhaustedError } from "@/lib/api";
import { useSettings } from "@/providers/settings-provider";
import { CitationResultCard, VerifiedEntry } from "@/components/citations/CitationResultCard";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";

function buildBluebook(entry: any): string {
  if (!entry.verified) return entry.input;
  const parts: string[] = [];
  if (entry.caseName) parts.push(entry.caseName);
  if (entry.reporter) parts.push(entry.reporter);
  if (entry.dateFiled) {
    const year = new Date(entry.dateFiled).getFullYear();
    if (entry.reporter) {
      parts[parts.length - 1] = entry.reporter.includes("(") ? entry.reporter : `${entry.reporter} (${year})`;
    }
  }
  return parts.join(", ");
}

export default function CitationsPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);
  const { settings } = useSettings();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VerifiedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [scanText, setScanText] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creditErr, setCreditErr] = useState<{ remaining: number; creditCost: number } | null>(null);

  const savedCitations = (matter?.verifiedCitations as string[] | undefined) ?? [];

  const handleVerify = async () => {
    const lines = input.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);
    if (!lines.length || loading) return;
    setLoading(true); setError(null);
    try {
      const raw = await citationLookup(lines);
      const entries: VerifiedEntry[] = raw.map(r => ({
        ...r,
        uid: crypto.randomUUID(),
        checkedAt: Date.now(),
        savedToMatter: false,
        bluebook: buildBluebook(r),
      }));
      setResults(prev => [...entries, ...prev]);
      setInput("");
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };

  const saveToMatter = async (uid: string) => {
    if (!matter) return;
    const entry = results.find(r => r.uid === uid);
    if (!entry || entry.savedToMatter) return;
    setSavingId(uid);
    try {
      const citation = entry.bluebook || entry.input;
      const nextCitations = [...savedCitations, citation];
      const nextMemory = mergeMemory(matter.lexMemory as any, { nodes: [authorityFromVerified({ citation: entry.bluebook || entry.input, caseName: entry.caseName, tab: "citations" })] });
      await updateMatter({ ...matter, verifiedCitations: nextCitations, lexMemory: nextMemory });
      setResults(prev => prev.map(r => r.uid === uid ? { ...r, savedToMatter: true } : r));
    } finally { setSavingId(null); }
  };

  const handleScan = async () => {
    if (!scanText.trim() || scanLoading) return;
    setScanLoading(true);
    try {
      const res = await anthropicFetch(
        { model: settings.model, max_tokens: 1200, system: "Extract citations from text.", messages: [{ role: "user", content: scanText }] },
        undefined, {}
      );
      const data = await res.json() as any;
      const extracted = (data.content?.[0]?.text ?? "").split("\n").filter(Boolean);
      if (extracted.length) {
        setInput(prev => prev ? `${prev}\n${extracted.join("\n")}` : extracted.join("\n"));
        setShowScan(false); setScanText("");
      }
    } catch (e) {
      if (e instanceof CreditExhaustedError) setCreditErr({ remaining: e.remaining, creditCost: e.creditCost });
      else setError((e as Error).message);
    } finally { setScanLoading(false); }
  };

  return (
    <PanelShell icon={ShieldCheck} title="Hallucination Shield" description="Verify case law citations and ground ARES in binding authority">
      {creditErr && <UpgradeCTA reason="Monthly credits exhausted." creditsRemaining={creditErr.remaining} creditCost={creditErr.creditCost} onClose={() => setCreditErr(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl p-6 bg-[rgba(17,17,20,0.8)] border border-[rgba(0,255,195,0.14)] shadow-lg">
            <h3 className="font-mono text-[11px] tracking-widest uppercase text-[var(--verdict-neon)] mb-4">Input Citations</h3>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter citations (one per line)..."
              className="lex-input w-full h-32 mb-4 font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <button onClick={() => setShowScan(true)} className="lex-btn lex-btn--ghost text-[10px] uppercase tracking-widest"><Sparkles size={12} /> Scan Document</button>
              <button onClick={handleVerify} disabled={loading || !input.trim()} className="lex-btn lex-btn--primary px-8">
                {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : <ShieldCheck size={14} className="mr-2" />}
                {loading ? "Verifying..." : "Verify Authority"}
              </button>
            </div>
          </div>

          {error && <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono">{error}</div>}

          <div className="space-y-3">
            {results.map(r => (
              <CitationResultCard key={r.uid} result={r} onSave={saveToMatter} isSaving={savingId === r.uid} />
            ))}
          </div>

          {results.length === 0 && (
            <div className="py-20 text-center opacity-30">
              <FileSearch size={40} className="mx-auto mb-4" />
              <p className="text-sm font-medium">No verifications in this session</p>
              <p className="text-xs mt-1">Verify citations to ensure ARES is using valid legal authority.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl p-5 bg-[rgba(17,17,20,0.7)] border border-[rgba(224,224,224,0.08)]">
            <h3 className="font-mono text-[11px] tracking-widest uppercase text-[var(--fg-tertiary)] mb-4">Saved Authority ({savedCitations.length})</h3>
            {savedCitations.length === 0 ? (
              <p className="text-[10px] text-center py-4 opacity-40 uppercase tracking-widest">No binding authority saved</p>
            ) : (
              <div className="space-y-2">
                {savedCitations.map((c, i) => (
                  <div key={i} className="p-2.5 rounded bg-white/5 border border-white/5 flex items-center gap-2">
                    <BookMarked size={12} className="text-[var(--verdict-neon)] flex-shrink-0" />
                    <span className="text-[11px] font-mono truncate">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl p-5 bg-[rgba(255,163,0,0.03)] border border-[rgba(255,163,0,0.14)]">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-[var(--verdict-amber)]" />
              <h3 className="font-mono text-[10px] tracking-widest uppercase text-[var(--verdict-amber)]">Shield Policy</h3>
            </div>
            <p className="text-[11px] text-[var(--fg-tertiary)] leading-relaxed">
              ARES automatically flags citations with low confidence. Verifying them here permanently adds them to the Matter's binding authority record, reducing hallucination risk in future drafting and research tasks.
            </p>
          </div>
        </div>
      </div>

      {showScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full bg-[var(--midnight-deep)] rounded-xl border border-[rgba(224,224,224,0.1)] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Extract Citations</h3>
              <button onClick={() => setShowScan(false)}><X size={16} /></button>
            </div>
            <div className="p-6">
              <p className="text-xs text-[var(--fg-secondary)] mb-4">Paste text from a brief or motion. ARES will extract all legal citations for verification.</p>
              <textarea
                value={scanText}
                onChange={e => setScanText(e.target.value)}
                placeholder="Paste text here..."
                className="lex-input w-full h-64 mb-4 text-xs font-mono"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowScan(false)} className="lex-btn lex-btn--ghost">Cancel</button>
                <button onClick={handleScan} disabled={scanLoading || !scanText.trim()} className="lex-btn lex-btn--primary px-8">
                  {scanLoading ? <Loader2 size={14} className="animate-spin" /> : "Run Scan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
