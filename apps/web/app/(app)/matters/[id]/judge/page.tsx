"use client";

import { useState, useEffect } from "react";
import { Users, Search, ExternalLink, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { COURTLISTENER_BASE, getApiHeaders } from "@/lib/api";
import { PanelShell } from "@/components/panels/PanelShell";

interface JudgePosition {
  court: string;
  date_start: string;
  date_termination: string | null;
  position_type: string;
}

interface JudgeResult {
  id: number;
  name_full: string;
  political_affiliation: string;
  positions: JudgePosition[];
  aba_rating: string;
}

interface Opinion {
  caseName: string;
  court: string;
  dateFiled: string;
  citation: string;
  absoluteUrl: string;
}

export default function JudgePage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const matter = getMatter(id);

  const [searchName, setSearchName] = useState(matter?.judgeName ?? "");
  const [judge, setJudge] = useState<JudgeResult | null>(null);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setJudge(null);
    setOpinions([]);
    setSearched(true);
    try {
      const headers = getApiHeaders();

      // Fetch judge profile
      const judgeRes = await fetch(
        `${COURTLISTENER_BASE}/people/?full_name=${encodeURIComponent(name)}`,
        { headers }
      );
      const judgeData = await judgeRes.json() as { results?: JudgeResult[] };
      const foundJudge = judgeData.results?.[0] ?? null;
      setJudge(foundJudge);

      // Fetch recent opinions
      const opinionRes = await fetch(
        `${COURTLISTENER_BASE}/search/?q=${encodeURIComponent(`judge:${name}`)}&type=o&page_size=10`,
        { headers }
      );
      const opinionData = await opinionRes.json() as {
        results?: Array<{
          caseName?: string;
          court?: string;
          dateFiled?: string;
          citation?: string[];
          absolute_url?: string;
        }>
      };
      const mapped: Opinion[] = (opinionData.results ?? []).map(op => ({
        caseName: op.caseName ?? "Unknown",
        court: op.court ?? "",
        dateFiled: op.dateFiled ?? "",
        citation: op.citation?.[0] ?? "",
        absoluteUrl: op.absolute_url ? `https://www.courtlistener.com${op.absolute_url}` : "",
      }));
      setOpinions(mapped);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matter?.judgeName) {
      search(matter.judgeName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PanelShell
      icon={Users}
      title="Judge Intel"
      description="Judge profile, career history, and recent opinions via CourtListener"
    >
      {/* Search bar */}
      <div
        className="rounded p-4 mb-6 flex items-center gap-3"
        style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
      >
        <input
          type="text"
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search(searchName)}
          placeholder="Judge full name…"
          className="flex-1 text-sm"
          style={{
            background: "transparent",
            color: "var(--text)",
            border: "none",
            outline: "none",
          }}
        />
        <button
          onClick={() => search(searchName)}
          disabled={loading || !searchName.trim()}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{
            background: searchName.trim() && !loading
              ? "var(--verdict-neon)"
              : "var(--panel2)",
            color: searchName.trim() && !loading ? "var(--midnight-court)" : "var(--text-muted)",
            border: "none",
            cursor: searchName.trim() && !loading ? "pointer" : "default",
          }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          Search
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-xs"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--verdict-crimson)" }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--verdict-neon)", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Searching CourtListener…</span>
        </div>
      )}

      {!loading && searched && !judge && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No judge profile found for &quot;{searchName}&quot;</p>
        </div>
      )}

      {!loading && judge && (
        <div className="space-y-6">
          {/* Judge card */}
          <div
            className="rounded p-5"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
          >
            <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
              {judge.name_full}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {judge.political_affiliation && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Political Affiliation</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--text)" }}>{judge.political_affiliation}</p>
                </div>
              )}
              {judge.aba_rating && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>ABA Rating</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--text)" }}>{judge.aba_rating}</p>
                </div>
              )}
            </div>
            {judge.positions && judge.positions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>POSITIONS</p>
                <div className="space-y-2">
                  {judge.positions.slice(0, 5).map((pos, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                      style={{ color: "var(--text)" }}
                    >
                      <span>{pos.court} — {pos.position_type}</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {pos.date_start ? new Date(pos.date_start).getFullYear() : ""}
                        {pos.date_termination ? ` – ${new Date(pos.date_termination).getFullYear()}` : " – present"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent opinions */}
          {opinions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
                Recent Opinions ({opinions.length})
              </h4>
              <div className="space-y-2">
                {opinions.map((op, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-4 py-3 flex items-start justify-between gap-3"
                    style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                        {op.caseName}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {op.court && <span>{op.court}</span>}
                        {op.dateFiled && <span>{new Date(op.dateFiled).toLocaleDateString()}</span>}
                        {op.citation && <span style={{ color: "var(--verdict-neon)" }}>{op.citation}</span>}
                      </div>
                    </div>
                    {op.absoluteUrl && (
                      <a
                        href={op.absoluteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--verdict-neon)", flexShrink: 0 }}
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}
