"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radar, Search, RefreshCw,
  Loader2
} from "lucide-react";
import { useParams } from "next/navigation";
import { PanelShell } from "@/components/panels/PanelShell";
import { useAuth } from "@/lib/auth";
import { WatchedDocketCard, WatchedDocket } from "@/components/docket/WatchedDocketCard";

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
  const { session } = useAuth();
  const [watched, setWatched] = useState<WatchedDocket[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchQ, setSearchQ] = useState("");
  const [searchCourt] = useState("");
  const [searchResults, setSearchResults] = useState<CLDocketResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [searchTab, setSearchTab] = useState<"cl" | "pacer">("cl");
  const [pacerConnected, setPacerConnected] = useState(false);
  const [pacerResults] = useState<Array<{ caseId: string; court: string; caseTitle: string; dateFiled: string; caseNumber: string }>>([]);
  const [pacerSearching] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
  const authHeaders = useCallback(() => session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : ({} as Record<string, string>), [session]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dockets/watched?matter_id=${matterId}`, {
        headers: authHeaders(),
      });
      if (res.ok) setWatched(await res.json());
    } finally { setLoading(false); }
  }, [matterId, API_URL, authHeaders]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`${API_URL}/api/pacer/credentials/status`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPacerConnected(d.connected); })
      .catch(() => {});
  }, [API_URL, authHeaders]);

  const handlePoll = async (id: string) => {
    setPolling(id);
    await fetch(`${API_URL}/api/dockets/poll/${id}`, { method: "POST", headers: authHeaders() });
    await load();
    setPolling(null);
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm("Stop watching this docket?")) return;
    await fetch(`${API_URL}/api/dockets/watch/${id}`, { method: "DELETE", headers: authHeaders() });
    await load();
  };

  const handleClSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/dockets/search?q=${encodeURIComponent(searchQ)}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    } finally { setSearching(false); }
  };

  const handlePacerSearch = async () => {
    // Basic stub for now, as pacer logic was complex in original
  };

  const watchClDocket = async (d: CLDocketResult) => {
    setAddingId(d.id);
    await fetch(`${API_URL}/api/dockets/watch`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        matter_id: matterId,
        source: "courtlistener",
        external_id: String(d.id),
        case_name: d.case_name,
        court: d.court_id,
        docket_number: d.docket_number,
        cl_url: d.absolute_url
      })
    });
    setAddingId(null);
    setSearchQ("");
    setSearchResults([]);
    await load();
  };

  return (
    <PanelShell icon={Radar} title="Docket Watch" description="Real-time monitoring of federal and state court dockets">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-[11px] tracking-widest uppercase text-[var(--fg-tertiary)]">Watched Dockets ({watched.length})</h3>
            <button onClick={load} className="text-[var(--fg-quaternary)] hover:text-[var(--verdict-neon)] transition-colors">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center opacity-40"><Loader2 className="mx-auto animate-spin mb-2" /> <p className="text-xs font-mono">Synchronizing...</p></div>
          ) : watched.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
              <Radar size={32} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm text-[var(--fg-secondary)] mb-1">No dockets being watched</p>
              <p className="text-xs text-[var(--fg-quaternary)]">Search and add a docket to begin monitoring for updates.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watched.map(d => (
                <WatchedDocketCard
                  key={d.id}
                  docket={d}
                  isExpanded={!!expanded[d.id]}
                  onToggle={() => setExpanded(prev => ({ ...prev, [d.id]: !prev[d.id] }))}
                  onPoll={handlePoll}
                  isPolling={polling === d.id}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl p-5 border border-[rgba(0,255,195,0.14)] bg-[rgba(17,17,20,0.8)] shadow-lg">
            <h3 className="font-mono text-[11px] tracking-widest uppercase text-[var(--verdict-neon)] mb-4">Add New Docket</h3>

            <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-lg">
              <button onClick={() => setSearchTab("cl")} className={`flex-1 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${searchTab === "cl" ? "bg-[var(--verdict-neon)] text-[var(--midnight-deep)] shadow-lg" : "text-[var(--fg-tertiary)] hover:text-white"}`}>CourtListener</button>
              <button onClick={() => setSearchTab("pacer")} className={`flex-1 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${searchTab === "pacer" ? "bg-[var(--verdict-neon)] text-[var(--midnight-deep)] shadow-lg" : "text-[var(--fg-tertiary)] hover:text-white"}`}>PACER</button>
            </div>

            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-quaternary)] group-focus-within:text-[var(--verdict-neon)] transition-colors" />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (searchTab === "cl" ? handleClSearch() : handlePacerSearch())}
                  placeholder="Case name or number..."
                  className="lex-input pl-10 w-full text-xs"
                />
              </div>
              <button
                onClick={searchTab === "cl" ? handleClSearch : handlePacerSearch}
                disabled={searching || pacerSearching || !searchQ.trim()}
                className="lex-btn lex-btn--primary w-full justify-center"
              >
                {(searching || pacerSearching) ? <Loader2 size={14} className="animate-spin" /> : "Search Archives"}
              </button>
            </div>

            {searchTab === "cl" && searchResults.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {searchResults.map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-[var(--verdict-neon)]/30 transition-all">
                    <p className="text-xs font-semibold text-[var(--fg-primary)] line-clamp-1 mb-1">{r.case_name}</p>
                    <p className="text-[10px] font-mono text-[var(--fg-tertiary)] mb-2 uppercase">{r.court_id} · {r.docket_number}</p>
                    <button onClick={() => watchClDocket(r)} disabled={addingId === r.id} className="lex-btn lex-btn--ghost w-full py-1 text-[10px] uppercase tracking-widest border-white/10 hover:bg-[var(--verdict-neon)]/10 hover:text-[var(--verdict-neon)]">
                      {addingId === r.id ? "Adding..." : "Watch Docket"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchTab === "pacer" && !pacerConnected && (
              <div className="mt-4 p-4 rounded-lg bg-[var(--verdict-amber)]/5 border border-[var(--verdict-amber)]/20">
                <p className="text-xs text-[var(--verdict-amber)] mb-2">PACER credentials required to search the National Index.</p>
                <a href="/settings?tab=pacer" className="text-[10px] font-mono uppercase tracking-widest underline opacity-80 hover:opacity-100">Configure PACER</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
