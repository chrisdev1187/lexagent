"use client";

import { useState, useEffect } from "react";
import { Users, Search, ExternalLink, Loader2, Zap, Target, BookOpen } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { buildLetterheadHtml } from "@/components/shared/Letterhead";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { COURTLISTENER_BASE, getApiHeaders, anthropicFetch, QuotaExceededError, FreeTierExhaustedError } from "@/lib/api";
import { withLexMemory } from "@/lib/lex-memory";
import { supabase } from "@/lib/supabase";
import { PanelShell } from "@/components/panels/PanelShell";
import { Markdown } from "@/components/shared/Markdown";

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

interface FjcJudge {
  nid: string;
  last_name: string;
  first_name: string | null;
  middle_name: string | null;
  birth_year: number | null;
  death_year: number | null;
  gender: string | null;
  law_school: string | null;
  undergrad: string | null;
  appointing_president: string | null;
  party_of_president: string | null;
  commission_date: string | null;
  court_name: string | null;
  court_type: string | null;
  termination_date: string | null;
}

export default function JudgePage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [searchName, setSearchName] = useState(matter?.judgeName ?? "");
  const [judge, setJudge] = useState<JudgeResult | null>(null);
  const [fjc, setFjc] = useState<FjcJudge | null>(null);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeTierMsg, setFreeTierMsg] = useState<string | null>(null);

  const judgeAnalysis = matter?.judgeAnalysis as string | undefined;

  const search = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setJudge(null);
    setFjc(null);
    setOpinions([]);
    setSearched(true);
    try {
      const headers = getApiHeaders();

      // CourtListener /people/ supports name_first / name_last, not full_name.
      // Extract last word as last name for best match.
      const nameParts = name.trim().split(/\s+/);
      const lastName = nameParts[nameParts.length - 1].replace(/[^a-zA-Z]/g, "");
      const firstName = nameParts[0];
      const judgeRes = await fetch(
        `${COURTLISTENER_BASE}/people/?name_last=${encodeURIComponent(lastName)}&name_first=${encodeURIComponent(firstName)}`,
        { headers }
      );
      const judgeData = await judgeRes.json() as { results?: JudgeResult[] };
      const foundJudge = judgeData.results?.[0] ?? null;
      setJudge(foundJudge);

      // FJC biographical lookup
      if (foundJudge) {
        const { data: fjcRows } = await supabase.rpc("lookup_judge", {
          p_last_name: lastName,
          p_first_name: firstName,
        });
        setFjc((fjcRows as FjcJudge[] | null)?.[0] ?? null);
      }

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

  const synthesize = async () => {
    if (!judge || !matter) return;
    setSynthesizing(true);
    try {
      const positionsText = judge.positions
        .slice(0, 5)
        .map(p => `${p.court} (${p.position_type})${p.date_start ? `, ${new Date(p.date_start).getFullYear()}` : ""}${p.date_termination ? `–${new Date(p.date_termination).getFullYear()}` : "–present"}`)
        .join("; ");

      const opinionsText = opinions
        .slice(0, 10)
        .map((o, i) => `${i + 1}. ${o.caseName}${o.citation ? `, ${o.citation}` : ""} (${o.court}${o.dateFiled ? `, ${new Date(o.dateFiled).getFullYear()}` : ""})`)
        .join("\n");

      const content = `Synthesize a strategic intelligence brief on Judge ${judge.name_full} for the following case:

Matter: ${matter.title}
Case Type: ${matter.caseType ?? "N/A"}
Jurisdiction: ${matter.jurisdiction ?? "N/A"}

JUDGE DATA:
- Name: ${judge.name_full}
- Political Affiliation: ${judge.political_affiliation || "Unknown"}
- ABA Rating: ${judge.aba_rating || "Unknown"}
- Positions: ${positionsText || "None listed"}

RECENT OPINIONS (CourtListener):
${opinionsText || "None available"}

Provide:
## JUDICIAL PROFILE
Career overview and judicial philosophy based on available data.

## TENDENCIES
Based on opinions listed, identify any patterns in rulings relevant to this case type.

## STRATEGIC RECOMMENDATIONS
Specific advice on framing arguments, tone, and approach for this judge.

## RISK FLAGS
Any potential concerns or preferences to avoid.

Be direct and actionable. This is for attorney preparation only.`;

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "judge" });
      setStreamingText("");
      const res = await lexFetch(
        { model: settings.model, max_tokens: 4000, system: settings.systemPrompt, messages: [{ role: "user", content }] },
        undefined,
        { onChunk: chunk => setStreamingText(prev => prev + chunk) }
      );
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text ?? "No response.";
      await updateMatter({ ...matter, judgeAnalysis: text });
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) { setFreeTierMsg(e.message); }
      else if (e instanceof QuotaExceededError) { setError("AI quota exceeded — upgrade your plan."); }
      else { setError((e as Error).message); }
    } finally {
      setStreamingText("");
      setSynthesizing(false);
    }
  };

  useEffect(() => {
    if (matter?.judgeName) {
      search(matter.judgeName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
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
      icon={Users}
      title="Judge Intel"
      description="Judge profile, career history, and AI-synthesized strategic brief"
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
          style={{ background: "transparent", color: "var(--fg-primary)", border: "none", outline: "none" }}
        />
        <button
          onClick={() => search(searchName)}
          disabled={loading || !searchName.trim()}
          className="lex-btn lex-btn--primary"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          Search
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
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Searching CourtListener…</span>
        </div>
      )}

      {!loading && searched && !judge && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>No judge profile found for &quot;{searchName}&quot;</p>
        </div>
      )}

      {!loading && judge && (
        <div className="space-y-6">
          {/* Judge card */}
          <div
            className="rounded p-5"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
          >
            <h3 className="text-base font-semibold mb-3" style={{ color: "var(--fg-primary)" }}>
              {judge.name_full}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {judge.political_affiliation && (
                <div>
                  <span style={{ color: "var(--fg-tertiary)" }}>Political Affiliation</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>{judge.political_affiliation}</p>
                </div>
              )}
              {judge.aba_rating && (
                <div>
                  <span style={{ color: "var(--fg-tertiary)" }}>ABA Rating</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>{judge.aba_rating}</p>
                </div>
              )}
            </div>
            {judge.positions && judge.positions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--fg-tertiary)" }}>POSITIONS</p>
                <div className="space-y-2">
                  {judge.positions.slice(0, 5).map((pos, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                      style={{ color: "var(--fg-primary)" }}
                    >
                      <span>{pos.court} — {pos.position_type}</span>
                      <span style={{ color: "var(--fg-tertiary)" }}>
                        {pos.date_start ? new Date(pos.date_start).getFullYear() : ""}
                        {pos.date_termination ? ` – ${new Date(pos.date_termination).getFullYear()}` : " – present"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synthesize button */}
            <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
              <button
                onClick={synthesize}
                disabled={synthesizing}
                className="lex-btn lex-btn--primary"
              >
                {synthesizing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                {synthesizing ? "Synthesizing…" : judgeAnalysis ? "Re-synthesize Intelligence" : "Generate AI Intelligence Brief"}
              </button>
            </div>
          </div>

          {/* FJC biographical panel */}
          {fjc && (
            <div
              className="rounded p-5"
              style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(0,255,195,0.12)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={13} style={{ color: "var(--verdict-neon)" }} />
                <span className="text-xs font-mono tracking-wide" style={{ color: "var(--verdict-neon)" }}>FJC BIOGRAPHICAL DATA</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                {fjc.law_school && (
                  <div>
                    <span style={{ color: "var(--fg-tertiary)" }}>Law School</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>{fjc.law_school}</p>
                  </div>
                )}
                {fjc.undergrad && (
                  <div>
                    <span style={{ color: "var(--fg-tertiary)" }}>Undergraduate</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>{fjc.undergrad}</p>
                  </div>
                )}
                {fjc.appointing_president && (
                  <div>
                    <span style={{ color: "var(--fg-tertiary)" }}>Appointing President</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>
                      {fjc.appointing_president}
                      {fjc.party_of_president && (
                        <span style={{ color: "var(--fg-tertiary)" }}> ({fjc.party_of_president})</span>
                      )}
                    </p>
                  </div>
                )}
                {fjc.commission_date && (
                  <div>
                    <span style={{ color: "var(--fg-tertiary)" }}>Commission Date</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>
                      {new Date(fjc.commission_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                )}
                {fjc.court_name && (
                  <div className="col-span-2">
                    <span style={{ color: "var(--fg-tertiary)" }}>Court</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>
                      {fjc.court_name}
                      {fjc.court_type && <span style={{ color: "var(--fg-tertiary)" }}> · {fjc.court_type}</span>}
                    </p>
                  </div>
                )}
                {(fjc.birth_year ?? fjc.gender) && (
                  <div>
                    <span style={{ color: "var(--fg-tertiary)" }}>Background</span>
                    <p className="font-medium mt-0.5" style={{ color: "var(--fg-primary)" }}>
                      {[fjc.gender, fjc.birth_year ? `b. ${fjc.birth_year}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI synthesis */}
          {(judgeAnalysis || streamingText) && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Target size={13} style={{ color: "var(--verdict-neon)" }} />
                  <span className="text-xs font-mono tracking-wide" style={{ color: "var(--verdict-neon)" }}>AI STRATEGIC BRIEF</span>
                </div>
                <ExportButton content={judgeAnalysis ?? ""} filename={`judge-intel-${matter?.judgeName ?? id}`} format="pdf" label="Export" headerHtml={buildLetterheadHtml(settings)} />
              </div>
              <div
                className="rounded p-4 overflow-auto"
                style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(0,255,195,0.14)", maxHeight: "480px" }}
              >
                <Markdown text={streamingText || judgeAnalysis || ""} />
                {synthesizing && streamingText && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "var(--verdict-neon)", borderRadius: "1px" }} />
                )}
              </div>
            </div>
          )}

          {/* Recent opinions */}
          {opinions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--fg-primary)" }}>
                Recent Opinions ({opinions.length})
              </h4>
              <div className="space-y-2">
                {opinions.map((op, i) => (
                  <div
                    key={i}
                    className="rounded px-4 py-3 flex items-start justify-between gap-3"
                    style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--fg-primary)" }}>
                        {op.caseName}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--fg-tertiary)" }}>
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
    </>
  );
}
