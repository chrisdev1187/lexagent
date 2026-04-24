"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { COURTLISTENER_BASE, getApiHeaders } from "@/lib/api";
import { PanelShell } from "@/components/panels/PanelShell";

interface VerifiedCitation {
  id: string;
  input: string;
  verified: boolean;
  caseName?: string;
  reporter?: string;
  dateFiled?: string;
  absoluteUrl?: string;
  checkedAt: number;
}

export default function CitationsPage() {
  useParams<{ id: string }>();

  const [citation, setCitation] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<VerifiedCitation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    if (!citation.trim() || loading) return;
    setLoading(true);
    setError(null);
    const input = citation.trim();
    try {
      const headers = getApiHeaders();
      const body = new URLSearchParams();
      body.append("citations[]", input);

      const res = await fetch(`${COURTLISTENER_BASE}/citation-lookup/`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const data = await res.json() as Array<{
        normalized_citations?: Array<{
          case_name?: string;
          reporter?: string;
          date_filed?: string;
          absolute_url?: string;
        }>
      }>;

      const match = data?.[0]?.normalized_citations?.[0];
      const verified = !!match;

      const entry: VerifiedCitation = {
        id: crypto.randomUUID(),
        input,
        verified,
        caseName: match?.case_name,
        reporter: match?.reporter,
        dateFiled: match?.date_filed,
        absoluteUrl: match?.absolute_url
          ? `https://www.courtlistener.com${match.absolute_url}`
          : undefined,
        checkedAt: Date.now(),
      };

      setHistory(prev => [entry, ...prev]);
      setCitation("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelShell
      icon={ShieldCheck}
      title="Hallucination shield"
      description="Verify citations against 18M+ CourtListener records"
    >
      {/* Input */}
      <div className="lex-card mb-6">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={citation}
            onChange={e => setCitation(e.target.value)}
            onKeyDown={e => e.key === "Enter" && verify()}
            placeholder="e.g. United States v. Jones, 132 S. Ct. 945 (2012)"
            className="flex-1 text-sm"
            style={{
              background: "transparent",
              color: "var(--fg-primary)",
              border: "none",
              outline: "none",
            }}
          />
          <button
            onClick={verify}
            disabled={!citation.trim() || loading}
            className="lex-btn lex-btn--primary"
            style={{ flexShrink: 0 }}
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

      {history.length === 0 && !loading && (
        <div className="lex-empty">
          <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
            <ShieldCheck size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">No citations verified yet</p>
          <p className="lex-empty__body">
            Paste a citation above and click Verify to check against CourtListener&apos;s database
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <p className="lex-micro lex-micro--neon mb-2">Verification history ({history.length})</p>
          {history.map(entry => (
            <div
              key={entry.id}
              className="lex-card"
              style={{
                borderColor: entry.verified ? "rgba(0,255,195,0.25)" : "rgba(255,51,85,0.25)",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {entry.verified
                    ? <CheckCircle size={16} style={{ color: "var(--verdict-neon)" }} />
                    : <XCircle size={16} style={{ color: "var(--verdict-crimson)" }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`lex-chip lex-chip--${entry.verified ? "neon" : "crimson"}`}>
                      {entry.verified ? "Verified" : "Not found / hallucinated"}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--fg-primary)" }}>
                    {entry.input}
                  </p>
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
                  <p className="font-mono text-[10px] mt-1" style={{ color: "var(--fg-tertiary)" }}>
                    Checked {new Date(entry.checkedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
