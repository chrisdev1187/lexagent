"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, Clock, Calendar, FileText,
  BookOpen, ShieldCheck, Receipt, Search, ScanSearch, FileEdit, Target,
  Users, CalendarDays, Scale, Gavel, Brain,
} from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";
import type { LexMemory } from "@/lib/lex-memory";

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  High:   "var(--verdict-crimson)",
  Medium: "var(--verdict-amber)",
  Low:    "var(--verdict-neon)",
};

/* ── Primary stat card (large) ──────────────────────────────────────────── */
function PrimaryStatCard({ icon: Icon, label, value, color = "var(--verdict-neon)", href }: {
  icon: React.ElementType; label: string; value: string | number; color?: string; href: string;
}) {
  return (
    <Link href={href}>
      <div
        className="lex-stat-card fade-in"
        style={{ cursor: "pointer" }}
      >
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
            <div className="lex-stat-card__number">{value}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Compact stat (secondary row) ───────────────────────────────────────── */
function CompactStat({ icon: Icon, label, value, color = "var(--fg-tertiary)", href }: {
  icon: React.ElementType; label: string; value: string | number; color?: string; href: string;
}) {
  return (
    <Link href={href}>
      <div
        className="flex items-center gap-2.5 rounded-lg p-3 cursor-pointer fade-in"
        style={{
          background: "rgba(17,17,20,0.7)",
          border: "0.5px solid rgba(224,224,224,0.09)",
          transition: "border-color 0.15s, transform 0.15s",
          minHeight: 60,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,224,224,0.2)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,224,224,0.09)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
      >
        <Icon size={13} style={{ color, flexShrink: 0 }} />
        <div className="min-w-0">
          <div className="font-serif text-[18px] font-normal leading-none" style={{ color: "var(--fg-primary)", letterSpacing: "-0.02em" }}>{value}</div>
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5" style={{ color: "var(--fg-quaternary)" }}>{label}</div>
        </div>
      </div>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2.5" style={{ borderBottom: "0.5px solid rgba(224,224,224,0.07)" }}>
      <span className="font-mono text-[9px] tracking-[0.16em] uppercase w-28 flex-shrink-0" style={{ color: "var(--fg-quaternary)" }}>{label}</span>
      <span className="text-[13px] flex-1" style={{ color: "var(--fg-secondary)" }}>{value}</span>
    </div>
  );
}

const QUICK_TABS = [
  { id: "research",      label: "Research",      icon: Search       },
  { id: "deep-research", label: "Deep Research",  icon: ScanSearch   },
  { id: "vault",         label: "Vault",          icon: FileText     },
  { id: "strategy",      label: "Strategy",       icon: Target       },
  { id: "judge",         label: "Judge Intel",    icon: Users        },
  { id: "deadlines",     label: "Deadlines",      icon: Calendar     },
  { id: "timeline",      label: "Timeline",       icon: CalendarDays },
  { id: "citations",     label: "Shield",         icon: ShieldCheck  },
  { id: "draft",         label: "Draft",          icon: FileEdit     },
  { id: "notes",         label: "Evidence",       icon: BookOpen     },
  { id: "billing",       label: "Billing",        icon: Receipt      },
  { id: "conflict",      label: "Conflict",       icon: Scale        },
];

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const matter = getMatter(id);

  if (!matter) return null;

  const deadlines    = (matter.deadlines as Deadline[]) ?? [];
  const notes        = (matter.notes as unknown[]) ?? [];
  const vaultDocs    = (matter.vaultDocs as unknown[]) ?? [];
  const timeEntries  = (matter.timeEntries as unknown[]) ?? [];
  const totalMins    = (matter.totalMinsBilled as number) ?? 0;
  const totalHours   = (totalMins / 60).toFixed(1);
  const verifications = (matter.allVerifications as unknown[])?.length ?? 0;
  const precedents   = (matter.precedents as unknown[])?.length ?? 0;

  const upcoming = deadlines
    .filter(d => d.dueDate && new Date(d.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const lexMem       = matter.lexMemory as LexMemory | undefined;
  const hasMem       = lexMem?.version === 1;
  const nodeCount    = hasMem ? lexMem.nodes.length : 0;
  const episodeCount = hasMem ? lexMem.episodes.length : 0;
  const lastEpisode  = hasMem ? [...lexMem.episodes].sort((a, b) => b.createdAt - a.createdAt)[0] : null;
  const verifiedAuth = hasMem ? lexMem.nodes.filter(n => n.kind === "authority" && "verified" in n && n.verified).length : 0;
  const theme        = hasMem ? lexMem.theme : null;
  const memPct       = Math.min((episodeCount / 10) * 100, 100);

  /* Days until deadline helper */
  const daysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <PanelShell
      icon={LayoutDashboard}
      title="Matter Overview"
      description={`${matter.client ? `${matter.client} · ` : ""}${matter.caseType || "General"}`}
    >
      {/* ── Primary stats (4 large) ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <PrimaryStatCard icon={Clock}       label="Hours Billed" value={`${totalHours}h`}  color="var(--verdict-amber)"  href={`/matters/${id}/billing`} />
        <PrimaryStatCard icon={FileText}    label="Vault Docs"   value={vaultDocs.length}  color="var(--verdict-neon)"   href={`/matters/${id}/vault`} />
        <PrimaryStatCard icon={Calendar}    label="Deadlines"    value={deadlines.length}  color="var(--verdict-crimson)" href={`/matters/${id}/deadlines`} />
        <PrimaryStatCard icon={ShieldCheck} label="Verified"     value={verifications}     color="var(--verdict-neon)"   href={`/matters/${id}/citations`} />
      </div>

      {/* ── Secondary stats (4 compact) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <CompactStat icon={BookOpen}  label="Notes"       value={notes.length}      color="var(--verdict-neon)"    href={`/matters/${id}/notes`} />
        <CompactStat icon={Gavel}     label="Precedents"  value={precedents}        color="var(--verdict-violet)"  href={`/matters/${id}/deep-research`} />
        <CompactStat icon={Target}    label="Strategy"    value={matter.strategy ? "Ready" : "None"} color="var(--verdict-amber)" href={`/matters/${id}/strategy`} />
        <CompactStat icon={Receipt}   label="Entries"     value={timeEntries.length} color="var(--verdict-amber)"  href={`/matters/${id}/billing`} />
      </div>

      {/* ── Details + Deadlines ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

        {/* Matter details */}
        <div className="rounded-xl p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--fg-quaternary)" }}>Matter Details</p>
          <DetailRow label="Client"       value={matter.client} />
          <DetailRow label="Case Type"    value={matter.caseType} />
          <DetailRow label="Jurisdiction" value={matter.jurisdiction} />
          <DetailRow label="Court"        value={matter.court} />
          <DetailRow label="Judge"        value={matter.judgeName} />
          <DetailRow label="Status"       value={matter.status} />
          {matter.facts && (
            <div className="pt-3">
              <p className="font-mono text-[9px] tracking-[0.16em] uppercase mb-2" style={{ color: "var(--fg-quaternary)" }}>Facts / Summary</p>
              <p className="text-[13px] leading-relaxed line-clamp-5" style={{ color: "var(--fg-secondary)", lineHeight: 1.65 }}>{matter.facts}</p>
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="rounded-xl p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--fg-quaternary)" }}>Upcoming Deadlines</p>
            <Link href={`/matters/${id}/deadlines`} className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--verdict-neon)" }}>View all</Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar size={18} className="mb-2" style={{ color: "var(--fg-quaternary)" }} />
              <p className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(d => {
                const color = PRIORITY_COLOR[d.priority] ?? "var(--fg-quaternary)";
                const days = daysUntil(d.dueDate);
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-0 rounded-lg overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "0.5px solid rgba(224,224,224,0.07)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                  >
                    {/* Left priority bar */}
                    <div style={{ width: 3, alignSelf: "stretch", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                    <div className="flex items-center gap-3 flex-1 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "var(--fg-primary)" }}>{d.title}</p>
                        <p className="font-mono text-[9px] tracking-[0.1em] uppercase mt-0.5" style={{ color: "var(--fg-quaternary)" }}>
                          {new Date(d.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      {/* Countdown badge */}
                      <span
                        className="font-mono text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                          color,
                          border: `0.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
                        }}
                      >
                        {days === 0 ? "TODAY" : days === 1 ? "1 day" : `${days}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── LexMemory ───────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 mb-5"
        style={{
          background: hasMem ? "rgba(0,255,195,0.03)" : "rgba(17,17,20,0.7)",
          border: `0.5px solid ${hasMem ? "rgba(0,255,195,0.28)" : "rgba(224,224,224,0.09)"}`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: hasMem ? "var(--verdict-neon)" : "var(--fg-quaternary)" }}>
            <Brain size={11} style={{ filter: hasMem ? "drop-shadow(0 0 4px rgba(0,255,195,0.6))" : "none" }} />
            LexMemory
          </span>
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            {hasMem ? `v${lexMem.version} · ${nodeCount} nodes` : "not initialized"}
          </span>
        </div>

        {!hasMem ? (
          <p className="text-[13px]" style={{ color: "var(--fg-tertiary)", lineHeight: 1.65 }}>
            Memory initializes on your first AI call. The system compresses case context into ~250 tokens per call, saving 60–80% on input tokens over a matter&apos;s lifetime.
          </p>
        ) : (
          <>
            {/* Memory health bar */}
            <div className="mb-4">
              <div className="flex justify-between font-mono text-[9px] tracking-[0.1em] mb-1.5" style={{ color: "var(--fg-quaternary)" }}>
                <span>MEMORY HEALTH</span>
                <span>{episodeCount} episodes</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${memPct}%`, background: "var(--verdict-neon)", boxShadow: "0 0 8px rgba(0,255,195,0.5)" }} />
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Nodes",    value: nodeCount },
                { label: "Verified", value: verifiedAuth },
                { label: "Episodes", value: episodeCount },
              ].map(s => (
                <div key={s.label} className="rounded-lg px-3 py-2.5" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.14)" }}>
                  <div className="font-serif text-[20px] font-normal leading-none" style={{ color: "var(--fg-primary)", letterSpacing: "-0.02em" }}>{s.value}</div>
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {theme && (theme.primaryTheory || theme.posture || theme.statuteRefs.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {theme.primaryTheory && <span className="lex-chip lex-chip--neon">{theme.primaryTheory}</span>}
                {theme.posture && <span className="lex-chip lex-chip--amber">{theme.posture}</span>}
                {theme.statuteRefs.slice(0, 3).map(s => <span key={s} className="lex-chip lex-chip--violet">{s}</span>)}
              </div>
            )}

            {lastEpisode && (
              <p className="text-[12px] font-mono line-clamp-2" style={{ color: "var(--fg-tertiary)", lineHeight: 1.65 }}>
                <span style={{ color: "var(--fg-quaternary)" }}>[{lastEpisode.tab}] </span>
                {lastEpisode.summary}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Quick navigation ─────────────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--fg-quaternary)" }}>Quick Navigation</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {QUICK_TABS.map(({ id: tabId, label, icon: Icon }) => (
            <Link
              key={tabId}
              href={`/matters/${id}/${tabId}`}
              className="flex flex-col items-center gap-1.5 rounded-lg p-3 text-center"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "0.5px solid rgba(224,224,224,0.07)",
                minHeight: 64,
                transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(0,255,195,0.3)";
                el.style.transform = "translateY(-1px)";
                el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(0,255,195,0.15)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(224,224,224,0.07)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              <Icon size={15} style={{ color: "var(--verdict-neon)" }} />
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase" style={{ color: "var(--fg-tertiary)" }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
