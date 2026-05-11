"use client";

import { Radar, RefreshCw, Trash2, ChevronDown, ChevronUp, Bell, ExternalLink, Calendar, MessageSquare } from "lucide-react";

export interface DocketAlert {
  id: string;
  type: string;
  title: string;
  description: string | null;
  entry_date: string | null;
  created_at: string;
}

export interface WatchedDocket {
  id: string;
  case_name: string;
  court: string | null;
  docket_number: string | null;
  cl_url: string | null;
  last_checked: string | null;
  last_entry_date: string | null;
  entry_count: number;
  created_at: string;
  docket_alerts: DocketAlert[];
}

interface WatchedDocketCardProps {
  docket: WatchedDocket;
  isExpanded: boolean;
  onToggle: () => void;
  onPoll: (id: string) => void;
  isPolling: boolean;
  onRemove: (id: string) => void;
}

export function WatchedDocketCard({ docket, isExpanded, onToggle, onPoll, isPolling, onRemove }: WatchedDocketCardProps) {
  return (
    <div className="rounded-xl border border-[rgba(224,224,224,0.08)] bg-[rgba(17,17,20,0.7)] overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Radar size={14} className={docket.last_checked ? "text-[var(--verdict-neon)]" : "text-[var(--fg-tertiary)]"} />
            <h4 className="text-sm font-semibold truncate" style={{ color: "var(--fg-primary)" }}>{docket.case_name}</h4>
          </div>
          <p className="text-[10px] font-mono tracking-wider opacity-50 uppercase">
            {docket.court} · {docket.docket_number}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-mono uppercase opacity-40">Last entry</p>
            <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>{docket.last_entry_date ? new Date(docket.last_entry_date).toLocaleDateString() : "Unknown"}</p>
          </div>

          <div className="h-8 w-px bg-white/5 mx-1" />

          <button onClick={() => onPoll(docket.id)} disabled={isPolling} className="p-2 rounded-lg hover:bg-white/5 text-[var(--fg-tertiary)] transition-colors">
            <RefreshCw size={15} className={isPolling ? "animate-spin text-[var(--verdict-neon)]" : ""} />
          </button>

          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-white/5 text-[var(--fg-tertiary)] transition-colors">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <button onClick={() => onRemove(docket.id)} className="p-2 rounded-lg hover:bg-white/5 text-[var(--verdict-crimson)] opacity-40 hover:opacity-100 transition-all">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-white/[0.01] fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Bell size={11} className="text-[var(--verdict-neon)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)]">Alerts: {docket.docket_alerts.length}</span>
              </div>
              {docket.cl_url && (
                <a href={docket.cl_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)] hover:text-[var(--verdict-neon)]">
                  <ExternalLink size={11} /> Source
                </a>
              )}
            </div>
            <span className="text-[9px] font-mono opacity-30 uppercase">Updated {docket.last_checked ? new Date(docket.last_checked).toLocaleString() : "Never"}</span>
          </div>

          {docket.docket_alerts.length === 0 ? (
            <div className="rounded-lg p-6 text-center border border-dashed border-white/5">
              <p className="text-xs text-[var(--fg-quaternary)]">No alerts or significant entries found in this docket yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docket.docket_alerts.map(alert => (
                <div key={alert.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-xs font-medium text-[var(--fg-secondary)]">{alert.title}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--fg-quaternary)] whitespace-nowrap">
                      <Calendar size={10} /> {alert.entry_date}
                    </div>
                  </div>
                  {alert.description && (
                    <p className="text-[11px] text-[var(--fg-tertiary)] leading-relaxed line-clamp-2">{alert.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
