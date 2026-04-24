"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search, Briefcase, Clock, ChevronRight, Circle } from "lucide-react";
import { useMatters, Matter } from "@/providers/matters-provider";

interface ClientRecord {
  name: string;
  matters: Matter[];
  totalMins: number;
  statuses: string[];
}

const STATUS_DOT: Record<string, string> = {
  Active: "var(--verdict-neon)",
  Closed: "var(--fg-tertiary)",
  Pending: "var(--verdict-amber)",
  Urgent: "var(--verdict-crimson)",
};

const STATUS_CHIP_KIND: Record<string, string> = {
  Active: "neon",
  Closed: "neutral",
  Pending: "amber",
  Urgent: "crimson",
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
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--verdict-neon)" }}>▸</span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mt-1" style={{ color: "var(--fg-primary)" }}>
          Clients
        </h1>
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>
          {clients.length} client{clients.length !== 1 ? "s" : ""} · {matters.length} matter{matters.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-quaternary)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-9 pr-4 py-2.5 rounded text-sm lex-focus"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(224,224,224,0.10)",
            color: "var(--fg-primary)",
            outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="lex-empty">
          <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
            <Users size={24} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">
            {matters.length === 0 ? "No matters yet" : "No clients match your search"}
          </p>
          <p className="lex-empty__body">
            {matters.length === 0 ? "Add a matter with a client name to see them here." : "Try a different search term."}
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
            const chipKind = STATUS_CHIP_KIND[dominantStatus] ?? "neutral";
            return (
              <div key={client.name} className="lex-card">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>{client.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Briefcase size={11} style={{ color: "var(--fg-quaternary)" }} />
                        <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
                          {client.matters.length} matter{client.matters.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} style={{ color: "var(--verdict-amber)" }} />
                        <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{hours}h billed</span>
                      </div>
                      <span className={`lex-chip lex-chip--${chipKind}`}>{dominantStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Matter list */}
                <div className="space-y-1.5">
                  {client.matters.map(m => {
                    const dotColor = STATUS_DOT[m.status] ?? "var(--fg-tertiary)";
                    const mHours = ((m.totalMinsBilled as number ?? 0) / 60).toFixed(1);
                    return (
                      <Link
                        key={m.id}
                        href={`/matters/${m.id}/overview`}
                        className="flex items-center gap-3 rounded px-3 py-2 group lex-btn lex-btn--ghost"
                      >
                        <Circle size={5} fill={dotColor} style={{ color: dotColor, flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--fg-primary)" }}>{m.title}</p>
                          {m.caseType && (
                            <p className="text-[11px]" style={{ color: "var(--fg-tertiary)" }}>{m.caseType}</p>
                          )}
                        </div>
                        <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}>{mHours}h</span>
                        <ChevronRight size={12} style={{ color: "var(--fg-quaternary)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
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
