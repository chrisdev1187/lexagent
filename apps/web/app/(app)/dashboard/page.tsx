"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, Clock, ShieldCheck, AlertTriangle,
  Briefcase, ChevronRight, Calendar,
} from "lucide-react";
import { useMatters, Matter } from "@/providers/matters-provider";
import { NewMatterModal } from "@/components/shared/NewMatterModal";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { DeadlineAlert } from "@/components/shared/DeadlineAlert";
import { FirstMatterWizard } from "@/components/shared/FirstMatterWizard";

function StatCard({ icon: Icon, label, value, sub, color = "var(--verdict-neon)" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="lex-card" style={{ backdropFilter: "blur(8px)" }}>
      <div className="lex-stat">
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 mb-2"
          style={{ background: `${color}14`, border: `0.5px solid ${color}40` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
        <div
          className="lex-stat__value"
          style={{ fontSize: 28, color: "var(--fg-primary)" }}
        >
          {value}
        </div>
        <div className="lex-stat__label">{label}</div>
        {sub && (
          <div className="font-mono text-[10px] mt-0.5" style={{ color }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

const STATUS_CHIP: Record<string, string> = {
  Active: "neon",
  Closed: "neutral",
  Pending: "amber",
  Urgent: "crimson",
};

function MatterCard({ matter }: { matter: Matter }) {
  const chipKind = STATUS_CHIP[matter.status] ?? "neutral";
  const verified = (matter.allVerifications as { valid?: boolean }[] ?? []).filter(v => v?.valid).length;
  const totalHours = ((matter.totalMinsBilled ?? 0) / 60).toFixed(1);

  return (
    <Link href={`/matters/${matter.id}/overview`}>
      <div className="lex-matter-card group cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {matter.client && (
              <p className="lex-matter-card__id truncate mb-0.5">{matter.client}</p>
            )}
            <h3 className="lex-matter-card__title truncate">{matter.title}</h3>
          </div>
          <span className={`lex-chip lex-chip--${chipKind} flex-shrink-0`}>
            <span className="lex-chip__dot" />
            {matter.status}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matter.caseType && (
            <span
              className="font-mono text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(224,224,224,0.04)",
                border: "0.5px solid rgba(224,224,224,0.10)",
                color: "var(--fg-tertiary)",
              }}
            >
              {matter.caseType}
            </span>
          )}
          {matter.jurisdiction && (
            <span
              className="font-mono text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(224,224,224,0.04)",
                border: "0.5px solid rgba(224,224,224,0.10)",
                color: "var(--fg-tertiary)",
              }}
            >
              {matter.jurisdiction}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="lex-matter-card__meta">
          <div className="flex items-center gap-4">
            <LexTooltip content="Verified citations">
              <div className="flex items-center gap-1">
                <ShieldCheck size={11} style={{ color: "var(--verdict-neon)" }} />
                <span className="font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{verified}</span>
              </div>
            </LexTooltip>
            <LexTooltip content="Billable hours">
              <div className="flex items-center gap-1">
                <Clock size={11} style={{ color: "var(--fg-quaternary)" }} />
                <span className="font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{totalHours}h</span>
              </div>
            </LexTooltip>
            {matter.deadlines && (matter.deadlines as unknown[]).length > 0 && (
              <LexTooltip content="Upcoming deadlines">
                <div className="flex items-center gap-1">
                  <Calendar size={11} style={{ color: "var(--verdict-amber)" }} />
                  <span className="font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                    {(matter.deadlines as unknown[]).length}
                  </span>
                </div>
              </LexTooltip>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={13} style={{ color: "var(--verdict-neon)" }} />
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
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const showWizard = loaded && matters.length === 0 && !wizardDismissed && !showNewMatter;

  const statusFilters = ["All", "Active", "Pending", "Urgent", "Closed"];

  const filtered = matters.filter(m => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.client?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "All" || m.status === filter;
    return matchSearch && matchStatus;
  });

  const totalVerified = matters.reduce((acc, m) =>
    acc + ((m.allVerifications as { valid?: boolean }[] ?? []).filter(v => v?.valid).length), 0);
  const totalFlagged = matters.reduce((acc, m) =>
    acc + ((m.allVerifications as { valid?: boolean }[] ?? []).filter(v => !v?.valid).length), 0);
  const totalHours = matters.reduce((acc, m) => acc + (m.totalMinsBilled ?? 0), 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <DeadlineAlert />
        <div className="px-6 pt-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6" style={{ padding: "0 0 0 0" }}>
            <div>
              <p
                className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1"
                style={{ color: "var(--verdict-neon)" }}
              >
                ▸ LexAgent
              </p>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 28,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  color: "var(--fg-primary)",
                  margin: 0,
                }}
              >
                Dashboard
              </h1>
              <p
                className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1"
                style={{ color: "var(--fg-quaternary)" }}
              >
                {matters.length} matter{matters.length !== 1 ? "s" : ""} · All active files
              </p>
            </div>
            <button
              onClick={() => setShowNewMatter(true)}
              className="lex-btn lex-btn--primary hidden md:flex"
            >
              <Plus size={14} />
              NEW MATTER
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Briefcase} label="Total Matters" value={matters.length} color="var(--fg-secondary)" />
            <StatCard icon={ShieldCheck} label="Citations Verified" value={totalVerified} color="var(--verdict-neon)" />
            <StatCard
              icon={AlertTriangle}
              label="Citations Flagged"
              value={totalFlagged}
              color={totalFlagged > 0 ? "var(--verdict-crimson)" : "var(--fg-quaternary)"}
            />
            <StatCard icon={Clock} label="Billable Hours" value={`${(totalHours / 60).toFixed(1)}h`} color="var(--verdict-amber)" />
          </div>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-quaternary)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search matters…"
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
            <div className="flex gap-1.5 flex-wrap">
              {statusFilters.map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-3 py-2 rounded text-[10px] font-mono tracking-[0.12em] uppercase cursor-pointer transition-all duration-150"
                  style={{
                    background: filter === s ? "rgba(0,255,195,0.08)" : "rgba(255,255,255,0.02)",
                    border: `0.5px solid ${filter === s ? "rgba(0,255,195,0.28)" : "rgba(224,224,224,0.08)"}`,
                    color: filter === s ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Matter grid */}
          {!loaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded h-40 animate-pulse"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(m => <MatterCard key={m.id} matter={m} />)}
            </div>
          ) : matters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-16 h-16 rounded flex items-center justify-center mb-5"
                style={{
                  background: "rgba(0,255,195,0.06)",
                  border: "0.5px solid rgba(0,255,195,0.22)",
                }}
              >
                <Briefcase size={26} style={{ color: "var(--verdict-neon)" }} />
              </div>
              <h3
                className="font-serif text-lg font-semibold mb-2 tracking-tight"
                style={{ color: "var(--fg-primary)" }}
              >
                No matters yet
              </h3>
              <p
                className="font-mono text-[11px] tracking-[0.12em] uppercase mb-6"
                style={{ color: "var(--fg-quaternary)" }}
              >
                Create your first matter to begin
              </p>
              <button
                onClick={() => setShowNewMatter(true)}
                className="lex-btn lex-btn--primary"
              >
                <Plus size={14} />
                CREATE FIRST MATTER
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={28} className="mb-3" style={{ color: "var(--fg-quaternary)" }} />
              <p
                className="font-mono text-[10px] tracking-[0.14em] uppercase"
                style={{ color: "var(--fg-quaternary)" }}
              >
                No matters match your search
              </p>
            </div>
          )}

          {showNewMatter && <NewMatterModal onClose={() => setShowNewMatter(false)} />}
          {showWizard && <FirstMatterWizard onDismiss={() => setWizardDismissed(true)} />}
        </div>
      </div>
    </div>
  );
}
