"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radar, Plus, Trash2, RefreshCw, ExternalLink, Bell, BellOff,
  Search, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Link2,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PanelShell } from "@/components/panels/PanelShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

function authHeaders(): Record<string, string> {
  try {
    const token = typeof window !== "undefined"
      ? (JSON.parse(localStorage.getItem("sb-mgiqicasllvisiwvbiuu-auth-token") ?? "null") as { access_token?: string } | null)?.access_token
      : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

interface DocketAlert {
  id: string;
  entry_number: number | null;
  entry_date: string | null;
  description: string | null;
  seen_at: string | null;
  created_at: string;
}

interface WatchedDocket {
  id: string;
  docket_id: number;
  case_name: string | null;
  court: string | null;
  docket_number: string | null;
  cl_url: string | null;
  last_checked: string | null;
  last_entry_date: string | null;
  entry_count: number;
  created_at: string;
  docket_alerts: DocketAlert[];
}

interface CLDocketResult {
  id: number;
  case_name: string;
  court_id: string;
  docket_number: string;
  date_filed: string;
  absolute_url: string;
}

export default function DocketWatchPage() {
  const { id: matterId } = useParams<{ id: string }>();
  const [watched, setWatched] = useState<WatchedDocket[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchQ, setSearchQ] = useState("");
  const [searchCourt, setSearchCourt] = useState("");
  const [searchResults, setSearchResults] = useState<CLDocketResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [searchTab, setSearchTab] = useState<"cl" | "pacer">("cl");
  const [pacerConnected, setPacerConnected] = useState(false);
  const [pacerResults, setPacerResults] = useState<Array<{ caseId: string; court: string; caseTitle: string; dateFiled: string; caseNumber: string }>>([]);
  const [pacerSearching, setPacerSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/dockets/watched?matter_id=${matterId}`), {
        headers: authHeaders(),
      });
      if (res.ok) setWatched(await res.json());
    } finally { setLoading(false); }
  }, [matterId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(apiUrl("/api/pacer/credentials/status"), { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPacerConnected(d.connected); })
      .catch(() => {});
  }, []);

  async function pacerSearch() {
    if (!searchQ.trim()) return;
    setPacerSearching(true); setPacerResults([]);
    const params = new URLSearchParams({ q: searchQ });
    if (searchCourt) params.set("court", searchCourt);
    const res = await fetch(apiUrl(`/api/pacer/search?${params}`), { headers: authHeaders() });
    setPacerSearching(false);
    if (!res.ok) return;
    const data = await res.json() as { cases?: Array<{ caseId: string; courtId: string; caseTitle: string; dateFiled: string; caseNumber: string }> };
    setPacerResults((data.cases ?? []).map(c => ({
      caseId: c.caseId, court: c.courtId, caseTitle: c.caseTitle, dateFiled: c.dateFiled, caseNumber: c.caseNumber,
    })));
  }

  async function search() {
    if (!searchQ.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const params = new URLSearchParams({ q: searchQ });
      if (searchCourt) params.set("court", searchCourt);
      const res = await fetch(apiUrl(`/api/dockets/search?${params}`), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as { results?: CLDocketResult[] };
        setSearchResults(data.results ?? []);
      }
    } finally { setSearching(false); }
  }

  async function watch(docketId: number) {
    setAddingId(docketId);
    try {
      const res = await fetch(apiUrl("/api/dockets/watch"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ matter_id: matterId, docket_id: docketId }),
      });
      if (res.ok) {
        setSearchResults([]);
        setSearchQ("");
        await load();
      }
    } finally { setAddingId(null); }
  }

  async function unwatch(id: string) {
    await fetch(apiUrl(`/api/dockets/watch/${id}`), {
      method: "DELETE",
      headers: authHeaders(),
    });
    setWatched(prev => prev.filter(w => w.id !== id));
  }

  async function poll(id: string) {
    setPolling(id);
    try {
      await fetch(apiUrl(`/api/dockets/poll/${id}`), {
        method: "POST",
        headers: authHeaders(),
      });
      await load();
    } finally { setPolling(null); }
  }

  async function markSeen(alertId: string, docketId: string) {
    await fetch(apiUrl(`/api/dockets/alerts/${alertId}/seen`), {
      method: "PATCH",
      headers: authHeaders(),
    });
    setWatched(prev => prev.map(w =>
      w.id === docketId
        ? { ...w, docket_alerts: w.docket_alerts.map(a => a.id === alertId ? { ...a, seen_at: new Date().toISOString() } : a) }
        : w
    ));
  }

  const unseen = (w: WatchedDocket) => w.docket_alerts.filter(a => !a.seen_at).length;

  return (
    <PanelShell
      icon={Radar}
      title="Docket Watch"
      description="Subscribe to CourtListener dockets — get alerted when new filings appear"
    >
      {/* Search / Add */}
      <div className="flex flex-col gap-2 mb-6">
        {/* Source toggle */}
        <div className="flex gap-1 mb-1">
          {(["cl", "pacer"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setSearchTab(tab); setSearchResults([]); setPacerResults([]); }}
              className="px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest transition-colors"
              style={{
                background: searchTab === tab ? "rgba(0,255,195,0.12)" : "transparent",
                color: searchTab === tab ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                border: `0.5px solid ${searchTab === tab ? "rgba(0,255,195,0.3)" : "rgba(224,224,224,0.08)"}`,
              }}
            >
              {tab === "cl" ? "CourtListener" : "PACER"}
              {tab === "pacer" && !pacerConnected && (
                <span className="ml-1 text-[9px]" style={{ color: "var(--fg-quaternary)" }}>(no creds)</span>
              )}
            </button>
          ))}
          {!pacerConnected && (
            <Link href="/settings?tab=pacer" className="ml-auto flex items-center gap-1 text-[10px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
              <Link2 className="w-3 h-3" /> Connect PACER
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded text-sm font-mono bg-[var(--midnight-mid)] border border-[rgba(224,224,224,0.1)] text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] focus:outline-none focus:border-[var(--verdict-neon)]"
            placeholder="Search case name or docket number…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (searchTab === "cl" ? search() : pacerSearch())}
          />
          <input
            className="w-32 px-3 py-2 rounded text-sm font-mono bg-[var(--midnight-mid)] border border-[rgba(224,224,224,0.1)] text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] focus:outline-none focus:border-[var(--verdict-neon)]"
            placeholder="Court (e.g. ca9)"
            value={searchCourt}
            onChange={e => setSearchCourt(e.target.value)}
          />
          <button
            onClick={() => searchTab === "cl" ? search() : pacerSearch()}
            disabled={(searchTab === "cl" ? searching : pacerSearching) || !searchQ.trim() || (searchTab === "pacer" && !pacerConnected)}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono uppercase tracking-widest transition-colors"
            style={{
              background: "var(--verdict-neon)",
              color: "var(--midnight-deep)",
              opacity: (searchTab === "cl" ? searching : pacerSearching) || !searchQ.trim() || (searchTab === "pacer" && !pacerConnected) ? 0.5 : 1,
            }}
          >
            {(searchTab === "cl" ? searching : pacerSearching)
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Search className="w-3.5 h-3.5" />}
            Search
          </button>
        </div>

        {/* PACER results */}
        {pacerResults.length > 0 && (
          <div className="rounded border border-[rgba(224,224,224,0.1)] overflow-hidden">
            {pacerResults.map(r => (
              <div key={`${r.court}-${r.caseId}`} className="flex items-center justify-between px-3 py-2 border-b border-[rgba(224,224,224,0.06)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-[var(--fg-primary)] truncate">{r.caseTitle}</div>
                  <div className="text-[10px] text-[var(--fg-tertiary)] font-mono mt-0.5">
                    {r.caseNumber} · {r.court} · {r.dateFiled?.slice(0, 10)}
                    <span className="ml-2 px-1 rounded text-[9px]" style={{ background: "rgba(0,255,195,0.1)", color: "var(--verdict-neon)" }}>PACER</span>
                  </div>
                </div>
                <span className="ml-3 text-[10px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
                  Fetch via PACER docket tab
                </span>
              </div>
            ))}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="rounded border border-[rgba(224,224,224,0.1)] overflow-hidden">
            {searchResults.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 border-b border-[rgba(224,224,224,0.06)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-[var(--fg-primary)] truncate">{r.case_name}</div>
                  <div className="text-[10px] text-[var(--fg-tertiary)] font-mono mt-0.5">
                    {r.docket_number} · {r.court_id} · {r.date_filed?.slice(0, 10)}
                  </div>
                </div>
                <button
                  onClick={() => watch(r.id)}
                  disabled={addingId === r.id || watched.some(w => w.docket_id === r.id)}
                  className="ml-3 flex items-center gap-1 px-3 py-1 rounded text-[10px] font-mono uppercase tracking-widest transition-colors"
                  style={{
                    background: watched.some(w => w.docket_id === r.id)
                      ? "rgba(0,255,195,0.08)"
                      : "rgba(0,255,195,0.15)",
                    color: "var(--verdict-neon)",
                    opacity: addingId === r.id ? 0.5 : 1,
                  }}
                >
                  {addingId === r.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : watched.some(w => w.docket_id === r.id)
                      ? <CheckCircle className="w-3 h-3" />
                      : <Plus className="w-3 h-3" />}
                  {watched.some(w => w.docket_id === r.id) ? "Watching" : "Watch"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watched list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--fg-tertiary)] font-mono">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : watched.length === 0 ? (
        <div className="text-center py-12 text-[var(--fg-tertiary)] text-xs font-mono">
          No dockets watched yet. Search above to subscribe.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {watched.map(w => {
            const unseenCount = unseen(w);
            const open = expanded[w.id] ?? false;
            return (
              <div
                key={w.id}
                className="rounded border overflow-hidden"
                style={{ borderColor: unseenCount > 0 ? "rgba(0,255,195,0.3)" : "rgba(224,224,224,0.1)" }}
              >
                {/* Header */}
                <div className="flex items-start justify-between px-3 py-2.5 bg-[var(--midnight-mid)]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--fg-primary)] truncate">
                        {w.case_name ?? `Docket #${w.docket_id}`}
                      </span>
                      {unseenCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold"
                          style={{ background: "var(--verdict-neon)", color: "var(--midnight-deep)" }}>
                          {unseenCount} new
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--fg-tertiary)] font-mono mt-0.5">
                      {[w.docket_number, w.court].filter(Boolean).join(" · ")}
                      {w.last_checked && ` · checked ${new Date(w.last_checked).toLocaleDateString()}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {w.cl_url && (
                      <a href={w.cl_url} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => poll(w.id)}
                      disabled={polling === w.id}
                      className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)] text-[var(--fg-tertiary)] hover:text-[var(--verdict-neon)]"
                      title="Poll for new entries"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${polling === w.id ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [w.id]: !open }))}
                      className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)] text-[var(--fg-tertiary)]"
                    >
                      {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => unwatch(w.id)}
                      className="p-1.5 rounded hover:bg-[rgba(255,60,60,0.15)] text-[var(--fg-tertiary)] hover:text-red-400"
                      title="Stop watching"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Alerts */}
                {open && (
                  <div className="border-t border-[rgba(224,224,224,0.06)]">
                    {w.docket_alerts.length === 0 ? (
                      <div className="px-3 py-4 text-[10px] text-[var(--fg-tertiary)] font-mono text-center">
                        No entries yet — click refresh to poll.
                      </div>
                    ) : (
                      w.docket_alerts
                        .sort((a, b) => (b.entry_date ?? b.created_at) > (a.entry_date ?? a.created_at) ? 1 : -1)
                        .map(alert => (
                          <div
                            key={alert.id}
                            className="flex items-start gap-2 px-3 py-2 border-b border-[rgba(224,224,224,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]"
                            style={{ opacity: alert.seen_at ? 0.55 : 1 }}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {alert.seen_at
                                ? <CheckCircle className="w-3 h-3 text-[var(--fg-tertiary)]" />
                                : <AlertCircle className="w-3 h-3" style={{ color: "var(--verdict-neon)" }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-[var(--fg-primary)] font-mono">
                                {alert.entry_number != null ? `Entry ${alert.entry_number}: ` : ""}
                                {alert.description ?? "(no description)"}
                              </div>
                              {alert.entry_date && (
                                <div className="text-[9px] text-[var(--fg-tertiary)] font-mono mt-0.5">
                                  {new Date(alert.entry_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            {!alert.seen_at && (
                              <button
                                onClick={() => markSeen(alert.id, w.id)}
                                className="flex-shrink-0 p-1 rounded text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                                title="Mark seen"
                              >
                                <BellOff className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
