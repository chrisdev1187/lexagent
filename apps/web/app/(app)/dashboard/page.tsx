"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, Search, Clock, ShieldCheck, AlertTriangle,
  Briefcase, Calendar, Zap, Activity,
} from "lucide-react";
import { useMatters, Matter } from "@/providers/matters-provider";
import { NewMatterModal } from "@/components/shared/NewMatterModal";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { DeadlineAlert } from "@/components/shared/DeadlineAlert";
import { FirstMatterWizard } from "@/components/shared/FirstMatterWizard";
import { supabase } from "@/lib/supabase";

interface RecentCall {
  id: string; tab: string; model: string | null;
  input_tok: number; output_tok: number;
  created_at: string; matter_id: string | null;
}

function RecentActivity({ matters }: { matters: Matter[] }) {
  const [calls, setCalls] = useState<RecentCall[]>([]);

  useEffect(() => {
    supabase
      .from("ai_usage")
      .select("id, tab, model, input_tok, output_tok, created_at, matter_id")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setCalls(data ?? []));
  }, []);

  if (calls.length === 0) return null;

  return (
    <div className="mb-8 fade-in-d4">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={12} style={{ color: "var(--verdict-neon)" }} />
        <span className="lex-page-eyebrow" style={{ display: "inline", marginBottom: 0 }}>
          Recent Activity
        </span>
      </div>
      <div className="space-y-1.5">
        {calls.map((call, i) => {
          const matter = matters.find(m => m.id === call.matter_id);
          return (
            <div
              key={call.id}
              className="flex items-center gap-3 rounded-md px-4 py-3 transition-all duration-150"
              style={{
                background: "rgba(17,17,20,0.7)",
                border: "0.5px solid rgba(224,224,224,0.07)",
                animationDelay: `${i * 0.04}s`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "var(--verdict-neon)", boxShadow: "0 0 6px rgba(0,255,195,0.7)" }}
              />
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded flex-shrink-0"
                style={{
                  background: "rgba(0,255,195,0.06)",
                  color: "var(--verdict-neon)",
                  border: "0.5px solid rgba(0,255,195,0.18)",
                  letterSpacing: "0.1em",
                }}
              >
                {call.tab}
              </span>
              <span className="text-[13px] flex-1 truncate" style={{ color: "var(--fg-secondary)" }}>
                {matter?.title ?? "Unknown matter"}
              </span>
              <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--fg-quaternary)" }}>
                {(call.input_tok + call.output_tok).toLocaleString()} tok
              </span>
              <span className="text-[10px] font-mono flex-shrink-0 hidden sm:block" style={{ color: "var(--fg-quaternary)" }}>
                {new Date(call.created_at).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  animClass?: string;
}

function StatCard({ icon: Icon, label, value, sub, color = "var(--verdict-neon)", animClass = "fade-in" }: StatCardProps) {
  return (
    <div className={`lex-stat-card ${animClass}`}>
      <div className="lex-stat-card__accent" style={{ background: color }} />
      <div className="lex-stat-card__body">
        <div
          className="lex-stat-card__icon"
          style={{
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `0.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
          }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <div className="lex-stat-card__meta">
          <div className="lex-stat-card__label">{label}</div>
          <div className="lex-stat-card__number" style={{ color: "var(--fg-primary)" }}>{value}</div>
          {sub && (
            <div className="lex-stat-card__sub" style={{ color }}>{sub}</div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Active:  "var(--verdict-neon)",
  Closed:  "var(--fg-quaternary)",
  Pending: "var(--verdict-amber)",
  Urgent:  "var(--verdict-crimson)",
};

const STATUS_CHIP_KIND: Record<string, string> = {
  Active: "neon", Closed: "neutral", Pending: "amber", Urgent: "crimson",
};

function ClientAvatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-mono font-bold"
      style={{
        background: "linear-gradient(135deg, rgba(0,255,195,0.18), rgba(106,0,255,0.18))",
        border: "0.5px solid rgba(0,255,195,0.25)",
        color: "var(--verdict-neon)",
        letterSpacing: 0,
      }}
    >
      {initial}
    </div>
  );
}

function MatterCard({ matter }: { matter: Matter }) {
  const chipKind = STATUS_CHIP_KIND[matter.status] ?? "neutral";
  const stripeColor = STATUS_COLORS[matter.status] ?? "var(--fg-quaternary)";
  const verified = (matter.allVerifications as { valid?: boolean }[] ?? []).filter(v => v?.valid).length;
  const totalHours = ((matter.totalMinsBilled ?? 0) / 60).toFixed(1);

  return (
    <Link href={`/matters/${matter.id}/overview`} style={{ display: "block" }}>
      <div
        className="lex-matter-card group"
        style={{ paddingLeft: 20 }}
      >
        {/* Left status stripe */}
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: stripeColor,
            boxShadow: matter.status === "Active" ? `0 0 8px ${stripeColor}` : "none",
            borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {matter.client && <ClientAvatar name={matter.client} />}
            <div className="min-w-0">
              {matter.client && (
                <p
                  className="font-mono text-[9px] tracking-[0.16em] uppercase truncate mb-0.5"
                  style={{ color: "var(--fg-quaternary)" }}
                >
                  {matter.client}
                </p>
              )}
              <h3
                className="truncate"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  fontStyle: "italic",
                  letterSpacing: "-0.01em",
                  color: "var(--fg-primary)",
                  lineHeight: 1.2,
                }}
              >
                {matter.title}
              </h3>
            </div>
          </div>
          <span className={`lex-chip lex-chip--${chipKind} flex-shrink-0`}>
            <span className="lex-chip__dot" />
            {matter.status}
          </span>
        </div>

        {/* Tags */}
        {(matter.caseType || matter.jurisdiction) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {matter.caseType && (
              <span
                className="font-mono text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(224,224,224,0.03)",
                  border: "0.5px solid rgba(224,224,224,0.09)",
                  color: "var(--fg-quaternary)",
                }}
              >
                {matter.caseType}
              </span>
            )}
            {matter.jurisdiction && (
              <span
                className="font-mono text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(224,224,224,0.03)",
                  border: "0.5px solid rgba(224,224,224,0.09)",
                  color: "var(--fg-quaternary)",
                }}
              >
                {matter.jurisdiction}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between">
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
          <span
            className="font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--verdict-neon)" }}
          >
            OPEN →
          </span>
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
  const showWizard = false;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
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
  const activeCount = matters.filter(m => m.status === "Active").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <DeadlineAlert />
        <div className="px-6 pt-8 pb-10">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-10 fade-in">
            <div>
              <span className="lex-page-eyebrow">▸ Command Centre</span>
              <h1 className="lex-page-title">Dashboard</h1>
              <p className="lex-page-subtitle">
                {today} · {matters.length} matter{matters.length !== 1 ? "s" : ""}
                {activeCount > 0 && ` · ${activeCount} active`}
              </p>
            </div>
            <button
              onClick={() => setShowNewMatter(true)}
              className="lex-btn lex-btn--primary hidden md:flex mt-1"
            >
              <Plus size={14} />
              NEW MATTER
            </button>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              icon={Briefcase}
              label="Total Matters"
              value={matters.length}
              sub={activeCount > 0 ? `${activeCount} active` : undefined}
              color="var(--fg-secondary)"
              animClass="fade-in-d1"
            />
            <StatCard
              icon={ShieldCheck}
              label="Citations Verified"
              value={totalVerified}
              sub={totalVerified > 0 ? "all confirmed" : undefined}
              color="var(--verdict-neon)"
              animClass="fade-in-d2"
            />
            <StatCard
              icon={AlertTriangle}
              label="Citations Flagged"
              value={totalFlagged}
              sub={totalFlagged > 0 ? "review required" : "none flagged"}
              color={totalFlagged > 0 ? "var(--verdict-crimson)" : "var(--fg-quaternary)"}
              animClass="fade-in-d3"
            />
            <StatCard
              icon={Clock}
              label="Billable Hours"
              value={`${(totalHours / 60).toFixed(1)}h`}
              sub="across all matters"
              color="var(--verdict-amber)"
              animClass="fade-in-d4"
            />
          </div>

          <RecentActivity matters={matters} />

          {/* ── Search + filters ───────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 fade-in-d5">
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--fg-quaternary)" }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search matters…"
                className="lex-input pl-10"
                style={{ minHeight: 44 }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {statusFilters.map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-3.5 py-2 rounded-md text-[10px] font-mono tracking-[0.12em] uppercase cursor-pointer transition-all duration-150"
                  style={{
                    minHeight: 44,
                    background: filter === s ? "rgba(0,255,195,0.08)" : "rgba(255,255,255,0.02)",
                    border: `0.5px solid ${filter === s ? "rgba(0,255,195,0.30)" : "rgba(224,224,224,0.08)"}`,
                    color: filter === s ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                    transform: filter === s ? "scale(1.02)" : "scale(1)",
                    boxShadow: filter === s ? "0 0 12px rgba(0,255,195,0.14)" : "none",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Section label ──────────────────────────────────────── */}
          {!search && filter === "All" && matters.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="lex-page-eyebrow" style={{ marginBottom: 0, display: "inline" }}>
                All Matters
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border-hair)" }} />
              <span className="font-mono text-[9px] tracking-[0.14em]" style={{ color: "var(--fg-quaternary)" }}>
                {matters.length} total
              </span>
            </div>
          )}

          {/* ── Matter grid ────────────────────────────────────────── */}
          {!loaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-md h-40 animate-pulse"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((m, i) => (
                <div key={m.id} className={i < 6 ? `fade-in-d${Math.min(i + 1, 5) as 1|2|3|4|5}` : undefined}>
                  <MatterCard matter={m} />
                </div>
              ))}
            </div>
          ) : matters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center fade-in">
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center mb-6"
                style={{
                  background: "rgba(0,255,195,0.05)",
                  border: "0.5px solid rgba(0,255,195,0.20)",
                  boxShadow: "0 0 40px rgba(0,255,195,0.06)",
                }}
              >
                <Briefcase size={30} style={{ color: "var(--verdict-neon)" }} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontStyle: "italic",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  color: "var(--fg-primary)",
                  marginBottom: 8,
                }}
              >
                No matters yet
              </h3>
              <p
                className="font-mono text-[10px] tracking-[0.14em] uppercase mb-8"
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
            <div className="flex flex-col items-center justify-center py-16 text-center fade-in">
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
          {showWizard && <FirstMatterWizard onDismiss={() => {}} />}
        </div>
      </div>
    </div>
  );
}
