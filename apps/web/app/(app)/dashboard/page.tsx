"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, LayoutDashboard, Clock, ShieldCheck, AlertTriangle,
  Briefcase, ChevronRight, Circle, Calendar,
} from "lucide-react";
import { useMatters, Matter } from "@/providers/matters-provider";
import { NewMatterModal } from "@/components/shared/NewMatterModal";
import { LexTooltip } from "@/components/shared/LexTooltip";

const STATUS_COLOR: Record<string, string> = {
  Active: "var(--emerald)",
  Closed: "var(--text-muted)",
  Pending: "var(--gold)",
  Urgent: "var(--crimson)",
};

const STATUS_BG: Record<string, string> = {
  Active: "var(--emerald-faint)",
  Closed: "rgba(61,82,72,0.2)",
  Pending: "rgba(245,158,11,0.08)",
  Urgent: "var(--crimson-faint)",
};

function StatCard({ icon: Icon, label, value, sub, color = "var(--emerald)" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}14`, border: `1px solid ${color}30` }}
      >
        <Icon size={17} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-none mb-0.5" style={{ color: "var(--text)" }}>{value}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
        {sub && <div className="text-[11px] mt-0.5" style={{ color }}>{sub}</div>}
      </div>
    </div>
  );
}

function MatterCard({ matter }: { matter: Matter }) {
  const dotColor = STATUS_COLOR[matter.status] ?? "var(--text-muted)";
  const bgColor = STATUS_BG[matter.status] ?? "transparent";
  const verified = (matter.allVerifications as { valid?: boolean }[] ?? []).filter(v => v?.valid).length;
  const totalHours = ((matter.totalMinsBilled ?? 0) / 60).toFixed(1);

  return (
    <Link href={`/matters/${matter.id}/research`}>
      <div
        className="rounded-xl p-4 cursor-pointer transition-all duration-150 group matter-card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate mb-0.5" style={{ color: "var(--text)" }}>
              {matter.title}
            </h3>
            {matter.client && (
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{matter.client}</p>
            )}
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 flex-shrink-0"
            style={{ background: bgColor, border: `1px solid ${dotColor}30` }}
          >
            <Circle size={5} fill={dotColor} style={{ color: dotColor }} />
            <span className="font-mono text-[10px] tracking-wider" style={{ color: dotColor }}>
              {matter.status}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matter.caseType && (
            <span
              className="font-mono text-[10px] tracking-wide px-2 py-0.5 rounded"
              style={{ background: "var(--panel2)", color: "var(--text-sub)" }}
            >
              {matter.caseType}
            </span>
          )}
          {matter.jurisdiction && (
            <span
              className="font-mono text-[10px] tracking-wide px-2 py-0.5 rounded"
              style={{ background: "var(--panel2)", color: "var(--text-muted)" }}
            >
              {matter.jurisdiction}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <LexTooltip content="Verified citations">
            <div className="flex items-center gap-1">
              <ShieldCheck size={12} style={{ color: "var(--emerald)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{verified}</span>
            </div>
          </LexTooltip>
          <LexTooltip content="Total billed hours">
            <div className="flex items-center gap-1">
              <Clock size={12} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{totalHours}h</span>
            </div>
          </LexTooltip>
          {matter.deadlines && (matter.deadlines as unknown[]).length > 0 && (
            <LexTooltip content="Upcoming deadlines">
              <div className="flex items-center gap-1">
                <Calendar size={12} style={{ color: "var(--gold)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {(matter.deadlines as unknown[]).length}
                </span>
              </div>
            </LexTooltip>
          )}
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={14} style={{ color: "var(--emerald)" }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { matters, loaded } = useMatters();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showNewMatter, setShowNewMatter] = useState(false);

  const statusFilters = ["All", "Active", "Pending", "Urgent", "Closed"];

  const filtered = matters.filter(m => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.client?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "All" || m.status === filter;
    return matchSearch && matchStatus;
  });

  const totalVerified = matters.reduce((acc, m) => {
    return acc + ((m.allVerifications as { valid?: boolean }[] ?? []).filter(v => v?.valid).length);
  }, 0);
  const totalFlagged = matters.reduce((acc, m) => {
    return acc + ((m.allVerifications as { valid?: boolean }[] ?? []).filter(v => !v?.valid).length);
  }, 0);
  const totalHours = matters.reduce((acc, m) => acc + (m.totalMinsBilled ?? 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <LayoutDashboard size={16} style={{ color: "var(--emerald)" }} />
            <h1 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Dashboard</h1>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {matters.length} matter{matters.length !== 1 ? "s" : ""} · All active files
          </p>
        </div>
        <button
          onClick={() => setShowNewMatter(true)}
          className="hidden md:flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
            color: "#0A0F0D",
          }}
        >
          <Plus size={15} />
          New Matter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Briefcase} label="Total Matters" value={matters.length} />
        <StatCard icon={ShieldCheck} label="Citations Verified" value={totalVerified} color="var(--emerald)" />
        <StatCard
          icon={AlertTriangle}
          label="Citations Flagged"
          value={totalFlagged}
          color={totalFlagged > 0 ? "var(--crimson)" : "var(--text-muted)"}
        />
        <StatCard icon={Clock} label="Billable Hours" value={`${(totalHours / 60).toFixed(1)}h`} color="var(--gold)" />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search matters…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm lex-focus"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              outline: "none",
            }}
          />
        </div>
        <div className="flex gap-1.5">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-2 rounded-lg text-xs font-mono tracking-wide cursor-pointer transition-all duration-150"
              style={{
                background: filter === s ? "var(--emerald-faint)" : "var(--surface)",
                border: `1px solid ${filter === s ? "var(--emerald-dim)" : "var(--border)"}`,
                color: filter === s ? "var(--emerald)" : "var(--text-muted)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Matter grid */}
      {!loaded ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl h-40 animate-pulse"
              style={{ background: "var(--surface)" }}
            />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => <MatterCard key={m.id} matter={m} />)}
        </div>
      ) : matters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
          >
            <Briefcase size={28} style={{ color: "var(--emerald)" }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>No matters yet</h3>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            Create your first matter to start using ARES
          </p>
          <button
            onClick={() => setShowNewMatter(true)}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
              color: "#0A0F0D",
            }}
          >
            <Plus size={15} />
            Create First Matter
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search size={32} className="mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No matters match your search</p>
        </div>
      )}

      {showNewMatter && <NewMatterModal onClose={() => setShowNewMatter(false)} />}
    </div>
  );
}
