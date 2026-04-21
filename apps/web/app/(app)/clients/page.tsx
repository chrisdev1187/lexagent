"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search, Briefcase, Clock, ChevronRight } from "lucide-react";
import { useMatters, Matter } from "@/providers/matters-provider";

interface ClientRecord {
  name: string;
  matters: Matter[];
  totalMins: number;
  statuses: string[];
}

const STATUS_COLOR: Record<string, string> = {
  Active: "text-verdict-neon",
  Closed: "text-text-muted",
  Pending: "text-verdict-amber",
  Urgent: "text-verdict-crimson",
};

export default function ClientsPage() {
  const { matters } = useMatters();
  const [search, setSearch] = useState("");

  const clients = useMemo<ClientRecord[]>(() => {
    const map = new Map<string, ClientRecord>();
    for (const m of matters) {
      const name = m.client?.trim() || "Unknown Client";
      const existing = map.get(name);
      if (existing) {
        existing.matters.push(m);
        existing.totalMins += (m.totalMinsBilled as number) ?? 0;
        if (!existing.statuses.includes(m.status)) existing.statuses.push(m.status);
      } else {
        map.set(name, {
          name,
          matters: [m],
          totalMins: (m.totalMinsBilled as number) ?? 0,
          statuses: [m.status],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [matters]);

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <span className="lex-micro lex-micro--neon">▸</span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-fg-primary">Clients</h1>
        <p className="lex-micro text-fg-quaternary">
          {clients.length} client{clients.length !== 1 ? "s" : ""} · {matters.length} matter{matters.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-9 pr-4 py-2.5 rounded text-sm lex-input"
        />
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center lex-empty">
          <Users size={32} className="mb-3 text-text-muted" />
          <p className="text-sm text-text-muted">
            {matters.length === 0 ? "No matters yet — add a matter with a client name to see them here." : "No clients match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => {
            const hours = (client.totalMins / 60).toFixed(1);
            const dominantStatus = client.statuses.includes("Urgent")
              ? "Urgent" : client.statuses.includes("Active")
              ? "Active" : client.statuses.includes("Pending")
              ? "Pending" : "Closed";
            return (
              <div
                key={client.name}
                className="lex-card"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-text">{client.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Briefcase size={11} className="text-text-muted" />
                        <span className="text-xs text-text-muted">
                          {client.matters.length} matter{client.matters.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-verdict-amber" />
                        <span className="text-xs text-text-muted">{hours}h billed</span>
                      </div>
                      <span
                        className={`lex-chip lex-chip--neon ${STATUS_COLOR[dominantStatus]}`}
                      >
                        {dominantStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Matter list */}
                <div className="space-y-1.5">
                  {client.matters.map(m => {
                    const statusColor = STATUS_COLOR[m.status] ?? "text-text-muted";
                    const mHours = ((m.totalMinsBilled as number ?? 0) / 60).toFixed(1);
                    return (
                      <Link
                        key={m.id}
                        href={`/matters/${m.id}/overview`}
                        className="flex items-center gap-3 rounded px-3 py-2 group lex-btn lex-btn--ghost"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-text">{m.title}</p>
                          {m.caseType && (
                            <p className="text-[11px] text-text-muted">{m.caseType}</p>
                          )}
                        </div>
                        <span className="text-xs font-mono flex-shrink-0 text-text-muted">{mHours}h</span>
                        <ChevronRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
