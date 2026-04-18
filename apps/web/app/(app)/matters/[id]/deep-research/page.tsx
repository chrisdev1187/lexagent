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
    congress: { label: "Congress", color: "var(--gold)" },
    ecfr: { label: "eCFR", color: "var(--emerald)" },
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
              background: tab === t ? "var(--emerald-faint)" : "var(--panel2)",
              border: `1px solid ${tab === t ? "var(--emerald-dim)" : "var(--border)"}`,
              color: tab === t ? "var(--emerald)" : "var(--text-muted)",
            }}
          >
            {t === "congress" ? "Congress Bills" : "eCFR Regulations"}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div
        className="flex gap-2 mb-4"
        style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border-hi)", overflow: "hidden" }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={tab === "congress" ? "Search bills — e.g. 'immigration reform'…" : "Search CFR — e.g. 'clean air emissions'…"}
          className="flex-1 px-4 py-2.5 text-sm"
          style={{ background: "transparent", color: "var(--text)", outline: "none", border: "none" }}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || searching || !matter}
          className="flex items-center gap-1.5 px-4 text-xs font-semibold cursor-pointer transition-all duration-150"
          style={{
            background: query.trim() && !searching && matter
              ? "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)"
              : "var(--panel2)",
            color: query.trim() && !searching && matter ? "#0A0F0D" : "var(--text-muted)",
            border: "none",
            borderLeft: "1px solid var(--border)",
          }}
        >
          <Search size={12} />
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2 mb-4 text-xs" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Congress results */}
      {tab === "congress" && congressResults.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            CONGRESS RESULTS ({congressResults.length})
          </p>
          {congressResults.map((bill) => {
            const pid = `congress-${bill.congress}-${bill.type}-${bill.number}`;
            const saved = savedIds.has(pid);
            return (
              <div key={pid} className="rounded-xl p-3 flex items-start gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5 line-clamp-2" style={{ color: "var(--text)" }}>{bill.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {bill.type} {bill.number} · {bill.congress}th Congress · {bill.originChamber}
                  </p>
                  {bill.latestAction && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>
                      {bill.latestAction.actionDate}: {bill.latestAction.text}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {bill.url && (
                    <a href={bill.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md cursor-pointer" style={{ color: "var(--text-muted)" }}>
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => !saved && saveCongressBill(bill)}
                    className="p-1.5 rounded-md cursor-pointer"
                    style={{ color: saved ? "var(--emerald)" : "var(--text-muted)" }}
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
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            eCFR RESULTS ({ecfrResults.length})
          </p>
          {ecfrResults.map((r) => {
            const pid = `ecfr-${r.id}`;
            const saved = savedIds.has(pid);
            return (
              <div key={pid} className="rounded-xl p-3 flex items-start gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text)" }}>
                    {r.fr_citation ?? r.label} — {r.label_description}
                  </p>
                  {r.hierarchy_headings?.title && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Title {r.hierarchy_headings.title}</p>
                  )}
                  {r.full_text_excerpt && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-sub)" }}>{r.full_text_excerpt}</p>
                  )}
                </div>
                <button
                  onClick={() => !saved && saveEcfrResult(r)}
                  className="p-1.5 rounded-md cursor-pointer flex-shrink-0"
                  style={{ color: saved ? "var(--emerald)" : "var(--text-muted)" }}
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
          <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            SAVED TO MATTER ({savedPrecedents.length})
          </p>
          <div className="space-y-2">
            {savedPrecedents.map((p) => {
              const badge = SOURCE_BADGE[p.source];
              return (
                <div key={p.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "var(--panel2)", border: "1px solid var(--border)" }}>
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: "var(--surface)", color: badge?.color ?? "var(--text-muted)", border: "1px solid var(--border)" }}
                  >
                    {badge?.label ?? p.source}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{p.title}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.citation}</p>
                  </div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="p-1 rounded cursor-pointer flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => removePrecedent(p.id)}
                    className="p-1 rounded cursor-pointer flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
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
        <div className="rounded-xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <ScanSearch size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--text)" }}>Search federal sources</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Congress bills and eCFR regulations. Save relevant sources to this matter's record.
          </p>
        </div>
      )}
    </PanelShell>
  );
}
