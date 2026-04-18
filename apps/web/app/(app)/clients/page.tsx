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
  Active: "var(--emerald)",
  Closed: "var(--text-muted)",
  Pending: "var(--gold)",
  Urgent: "var(--crimson)",
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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Users size={16} style={{ color: "var(--emerald)" }} />
        <h1 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Clients</h1>
      </div>
      <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
        {clients.length} client{clients.length !== 1 ? "s" : ""} across {matters.length} matter{matters.length !== 1 ? "s" : ""}
      </p>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
        />
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={32} className="mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
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
                className="rounded-xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{client.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Briefcase size={11} style={{ color: "var(--text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {client.matters.length} matter{client.matters.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} style={{ color: "var(--gold)" }} />
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{hours}h billed</span>
                      </div>
                      <span
                        className="font-mono text-[10px] tracking-wide"
                        style={{ color: STATUS_COLOR[dominantStatus] ?? "var(--text-muted)" }}
                      >
                        {dominantStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Matter list */}
                <div className="space-y-1.5">
                  {client.matters.map(m => {
                    const statusColor = STATUS_COLOR[m.status] ?? "var(--text-muted)";
                    const mHours = ((m.totalMinsBilled as number ?? 0) / 60).toFixed(1);
                    return (
                      <Link
                        key={m.id}
                        href={`/matters/${m.id}/overview`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 group cursor-pointer"
                        style={{ background: "var(--panel2)", border: "1px solid var(--border)" }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{m.title}</p>
                          {m.caseType && (
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{m.caseType}</p>
                          )}
                        </div>
                        <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>{mHours}h</span>
                        <ChevronRight size={12} style={{ color: "var(--text-muted)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
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
