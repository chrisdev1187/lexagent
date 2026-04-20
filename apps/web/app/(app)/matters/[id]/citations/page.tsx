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
      title="Hallucination Shield"
      description="Verify citations against 18M+ CourtListener records"
    >
      {/* Input */}
      <div
        className="rounded p-4 mb-6"
        style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
      >
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
              color: "var(--text)",
              border: "none",
              outline: "none",
            }}
          />
          <button
            onClick={verify}
            disabled={!citation.trim() || loading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0"
            style={{
              background: citation.trim() && !loading
                ? "var(--verdict-neon)"
                : "var(--panel2)",
              color: citation.trim() && !loading ? "var(--midnight-court)" : "var(--text-muted)",
              border: "none",
              cursor: citation.trim() && !loading ? "pointer" : "default",
            }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            Verify
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-xs"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--verdict-crimson)" }}
        >
          {error}
        </div>
      )}

      {history.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-12 h-12 rounded flex items-center justify-center mb-3"
            style={{ background: "rgba(0,255,195,0.06)", border: "1px solid rgba(0,255,195,0.28)" }}
          >
            <ShieldCheck size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>No citations verified yet</p>
          <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>
            Paste a citation above and click Verify to check against CourtListener&apos;s database
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            VERIFICATION HISTORY ({history.length})
          </p>
          {history.map(entry => (
            <div
              key={entry.id}
              className="rounded p-4"
              style={{
                background: "rgba(17,17,20,0.7)",
                border: `1px solid ${entry.verified ? "rgba(16,185,129,0.2)" : "rgba(220,38,38,0.2)"}`,
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
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: entry.verified ? "rgba(16,185,129,0.12)" : "rgba(220,38,38,0.12)",
                        color: entry.verified ? "var(--verdict-neon)" : "var(--verdict-crimson)",
                        border: `1px solid ${entry.verified ? "rgba(16,185,129,0.3)" : "rgba(220,38,38,0.3)"}`,
                      }}
                    >
                      {entry.verified ? "Verified" : "Not Found / Hallucinated"}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
                    {entry.input}
                  </p>
                  {entry.verified && (
                    <div className="text-xs space-y-0.5" style={{ color: "var(--text-muted)" }}>
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
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
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
