"use client";

import { useState } from "react";
import { ScanSearch, Search, Bookmark, BookmarkCheck, Trash2, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useAuth } from "@/lib/auth";
import { PanelShell } from "@/components/panels/PanelShell";
import { CONGRESS_BASE, ECFR_BASE } from "@/lib/api";

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

interface SavedPrecedent {
  id: string;
  source: "congress" | "ecfr";
  title: string;
  citation: string;
  url?: string;
  savedAt: number;
}

type Tab = "congress" | "ecfr";

export default function DeepResearchPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { session } = useAuth();
  const matter = getMatter(id);

  const [tab, setTab] = useState<Tab>("congress");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [congressResults, setCongressResults] = useState<CongressBill[]>([]);
  const [ecfrResults, setEcfrResults] = useState<EcfrResult[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const handleSearch = () => {
    if (!query.trim() || searching || !matter) return;
    if (tab === "congress") searchCongress();
    else searchEcfr();
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
    savePrecedent({
      id: pid,
      source: "congress",
      title: bill.title,
      citation: `${bill.type} ${bill.number}, ${bill.congress}th Congress`,
      url: bill.url,
      savedAt: Date.now(),
    });
  };

  const saveEcfrResult = (r: EcfrResult) => {
    savePrecedent({
      id: `ecfr-${r.id}`,
      source: "ecfr",
      title: r.label_description ?? r.label,
      citation: r.fr_citation ?? r.label,
      savedAt: Date.now(),
    });
  };

  const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
    congress: { label: "Congress", color: "var(--verdict-amber)" },
    ecfr: { label: "eCFR", color: "var(--verdict-neon)" },
  };

  return (
    <PanelShell
      icon={ScanSearch}
      title="Deep Research"
      description="Multi-source legal research: Congress bills, eCFR regulations"
    >
      {/* Source tabs */}
      <div className="flex gap-1 mb-4">
        {(["congress", "ecfr"] as Tab[]).map((t) => (
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
            {t === "congress" ? "Congress Bills" : "eCFR Regulations"}
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
          placeholder={tab === "congress" ? "Search bills — e.g. 'immigration reform'…" : "Search CFR — e.g. 'clean air emissions'…"}
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
                  <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
                    {bill.type} {bill.number} · {bill.congress}th Congress · {bill.originChamber}
                  </p>
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

      {/* Saved precedents for this matter */}
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
                    <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{p.citation}</p>
                  </div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="p-1 rounded cursor-pointer flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => removePrecedent(p.id)}
                    className="p-1 rounded cursor-pointer flex-shrink-0"
                    style={{ color: "var(--fg-tertiary)" }}
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

      {/* Empty states */}
      {!searching && congressResults.length === 0 && ecfrResults.length === 0 && savedPrecedents.length === 0 && (
        <div className="rounded p-8 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <ScanSearch size={28} className="mx-auto mb-3" style={{ color: "var(--fg-tertiary)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--fg-primary)" }}>Search federal sources</p>
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
            Congress bills and eCFR regulations. Save relevant sources to this matter's record.
          </p>
        </div>
      )}
    </PanelShell>
  );
}
