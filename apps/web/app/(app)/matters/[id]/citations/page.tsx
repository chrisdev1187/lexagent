"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, ExternalLink, Loader2, Save, BookMarked, ChevronDown, ChevronUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { citationLookup, CLLookupResult } from "@/lib/courtlistener";
import { PanelShell } from "@/components/panels/PanelShell";

interface VerifiedEntry extends CLLookupResult {
  uid: string;
  checkedAt: number;
  savedToMatter: boolean;
  bluebook?: string;
}

function buildBluebook(entry: CLLookupResult): string {
  if (!entry.verified) return entry.input;
  const parts: string[] = [];
  if (entry.caseName) parts.push(entry.caseName);
  if (entry.reporter) parts.push(entry.reporter);
  if (entry.dateFiled) {
    const year = new Date(entry.dateFiled).getFullYear();
    if (entry.reporter) {
      // inject year into reporter paren if missing
      parts[parts.length - 1] = entry.reporter.includes("(")
        ? entry.reporter
        : `${entry.reporter} (${year})`;
    }
  }
  return parts.join(", ");
}

export default function CitationsPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VerifiedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);

  const savedCitations = (matter?.verifiedCitations as string[] | undefined) ?? [];

  const verify = async () => {
    const lines = input
      .split(/[\n;]+/)
      .map(l => l.trim())
      .filter(Boolean);
    if (!lines.length || loading) return;
    setLoading(true);
    setError(null);
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveToMatter = async (entry: VerifiedEntry) => {
    if (!matter || !entry.bluebook) return;
    const existing = (matter.verifiedCitations as string[] | undefined) ?? [];
    if (existing.includes(entry.bluebook)) return;
    await updateMatter({ ...matter, verifiedCitations: [...existing, entry.bluebook] });
    setResults(prev =>
      prev.map(r => r.uid === entry.uid ? { ...r, savedToMatter: true } : r)
    );
  };

  return (
    <PanelShell
      icon={ShieldCheck}
      title="Hallucination Shield"
      description="Batch-verify citations against 18M+ CourtListener records"
    >
      {/* Input */}
      <div
        className="rounded overflow-hidden mb-6"
        style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(0,255,195,0.14)" }}
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) verify(); }}
          placeholder={"Paste citations — one per line or separated by semicolons:\nUnited States v. Jones, 132 S. Ct. 945 (2012)\nNeder v. United States, 527 U.S. 1 (1999)"}
          rows={4}
          className="w-full px-4 py-3 text-sm resize-none lex-focus"
          style={{ background: "transparent", color: "var(--fg-primary)", outline: "none", border: "none" }}
        />
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}
        >
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
            Ctrl+Enter to verify · one citation per line
          </span>
          <button
            onClick={verify}
            disabled={!input.trim() || loading}
            className="lex-btn lex-btn--primary"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            Verify
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded px-4 py-3 mb-4 text-xs"
          style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}
        >
          {error}
        </div>
      )}

      {/* Saved citations */}
      {savedCitations.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setSavedOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-mono tracking-wide mb-2"
            style={{ color: "var(--verdict-neon)", background: "none", border: "none", cursor: "pointer" }}
          >
            <BookMarked size={11} />
            {savedOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {savedCitations.length} saved to matter
          </button>
          {savedOpen && (
            <div className="space-y-1.5">
              {savedCitations.map((c, i) => (
                <div
                  key={i}
                  className="rounded px-3 py-2 text-xs font-mono"
                  style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-secondary)" }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length === 0 && !loading && (
        <div className="lex-empty">
          <div
            className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}
          >
            <ShieldCheck size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">No citations verified yet</p>
          <p className="lex-empty__body">
            Paste one or more citations above and click Verify to check against CourtListener
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="lex-micro lex-micro--neon mb-2">Results ({results.length})</p>
          {results.map(entry => (
            <div
              key={entry.uid}
              className="lex-card"
              style={{ borderColor: entry.verified ? "rgba(0,255,195,0.25)" : "rgba(255,51,85,0.25)" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {entry.verified
                    ? <CheckCircle size={16} style={{ color: "var(--verdict-neon)" }} />
                    : <XCircle size={16} style={{ color: "var(--verdict-crimson)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`lex-chip lex-chip--${entry.verified ? "neon" : "crimson"}`}>
                      {entry.verified ? "Verified" : "Not found"}
                    </span>
                    {entry.savedToMatter && (
                      <span className="lex-chip lex-chip--neon">Saved</span>
                    )}
                  </div>
                  <p className="text-xs mb-1" style={{ color: "var(--fg-tertiary)" }}>
                    Input: {entry.input}
                  </p>
                  {entry.verified && entry.bluebook && (
                    <p
                      className="text-sm font-medium font-mono mb-2"
                      style={{ color: "var(--verdict-neon)" }}
                    >
                      {entry.bluebook}
                    </p>
                  )}
                  {entry.verified && (
                    <div className="text-xs space-y-0.5" style={{ color: "var(--fg-tertiary)" }}>
                      {entry.caseName && <p>Case: {entry.caseName}</p>}
                      {entry.reporter && <p>Reporter: {entry.reporter}</p>}
                      {entry.dateFiled && <p>Filed: {new Date(entry.dateFiled).toLocaleDateString()}</p>}
                      {entry.absoluteUrl && (
                        <a
                          href={entry.absoluteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-1"
                          style={{ color: "var(--verdict-neon)" }}
                        >
                          View on CourtListener <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)" }}>
                    <span className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>
                      {new Date(entry.checkedAt).toLocaleString()}
                    </span>
                    {entry.verified && matter && !entry.savedToMatter && (
                      <button
                        onClick={() => saveToMatter(entry)}
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "var(--verdict-neon)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        <Save size={11} />
                        Save to matter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
