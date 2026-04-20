"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, Clock, Calendar, FileText,
  BookOpen, ShieldCheck, Receipt, Search, ScanSearch, FileEdit, Target,
  Users, CalendarDays, Scale, Gavel,
} from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

const PRIORITY_DOT: Record<string, string> = {
  High: "var(--verdict-crimson)",
  Medium: "var(--verdict-amber)",
  Low: "var(--verdict-neon)",
};

function StatPill({ icon: Icon, label, value, color = "var(--verdict-neon)", href }: {
  icon: React.ElementType; label: string; value: string | number; color?: string; href: string;
}) {
  return (
    <Link href={href}>
      <div
        className="flex items-center gap-3 rounded p-3 cursor-pointer transition-all duration-150"
        style={{
          background: "rgba(17,17,20,0.7)",
          border: "0.5px solid rgba(224,224,224,0.09)",
        }}
      >
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}14`, border: `0.5px solid ${color}40` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <div className="min-w-0">
          <div
            className="font-serif text-base font-semibold leading-none"
            style={{ color: "var(--fg-primary)" }}
          >
            {value}
          </div>
          <div
            className="font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5"
            style={{ color: "var(--fg-quaternary)" }}
          >
            {label}
          </div>
        </div>
      </div>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div
      className="flex gap-3 py-2"
      style={{ borderBottom: "0.5px solid rgba(224,224,224,0.07)" }}
    >
      <span
        className="font-mono text-[9px] tracking-[0.16em] uppercase w-28 flex-shrink-0"
        style={{ color: "var(--fg-quaternary)" }}
      >
        {label}
      </span>
      <span className="text-[13px] flex-1" style={{ color: "var(--fg-secondary)" }}>{value}</span>
    </div>
  );
}

const QUICK_TABS = [
  { id: "research",      label: "Research",     icon: Search       },
  { id: "deep-research", label: "Deep Research", icon: ScanSearch   },
  { id: "vault",         label: "Vault",        icon: FileText     },
  { id: "strategy",      label: "Strategy",     icon: Target       },
  { id: "judge",         label: "Judge Intel",  icon: Users        },
  { id: "deadlines",     label: "Deadlines",    icon: Calendar     },
  { id: "timeline",      label: "Timeline",     icon: CalendarDays },
  { id: "citations",     label: "Shield",       icon: ShieldCheck  },
  { id: "draft",         label: "Draft",        icon: FileEdit     },
  { id: "notes",         label: "Evidence",     icon: BookOpen     },
  { id: "billing",       label: "Billing",      icon: Receipt      },
  { id: "conflict",      label: "Conflict",     icon: Scale        },
];

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const matter = getMatter(id);

  if (!matter) return null;

  const deadlines = (matter.deadlines as Deadline[]) ?? [];
  const notes = (matter.notes as unknown[]) ?? [];
  const vaultDocs = (matter.vaultDocs as unknown[]) ?? [];
  const timeEntries = (matter.timeEntries as unknown[]) ?? [];
  const totalMins = (matter.totalMinsBilled as number) ?? 0;
  const totalHours = (totalMins / 60).toFixed(1);

  const upcoming = deadlines
    .filter(d => d.dueDate && new Date(d.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  return (
    <PanelShell
      icon={LayoutDashboard}
      title="Matter Overview"
      description={`${matter.client ? `${matter.client} · ` : ""}${matter.caseType || "General"}`}
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill icon={Clock}       label="Hours Billed"  value={`${totalHours}h`}    color="var(--verdict-amber)"  href={`/matters/${id}/billing`} />
        <StatPill icon={Receipt}     label="Time Entries"  value={timeEntries.length}  color="var(--verdict-amber)"  href={`/matters/${id}/billing`} />
        <StatPill icon={Calendar}    label="Deadlines"     value={deadlines.length}    color="var(--verdict-crimson)" href={`/matters/${id}/deadlines`} />
        <StatPill icon={FileText}    label="Vault Docs"    value={vaultDocs.length}    color="var(--verdict-neon)"   href={`/matters/${id}/vault`} />
        <StatPill icon={BookOpen}    label="Notes"         value={notes.length}        color="var(--verdict-neon)"   href={`/matters/${id}/notes`} />
        <StatPill icon={ShieldCheck} label="Verifications" value={(matter.allVerifications as unknown[])?.length ?? 0} color="var(--verdict-neon)" href={`/matters/${id}/citations`} />
        <StatPill icon={Gavel}       label="Precedents"    value={(matter.precedents as unknown[])?.length ?? 0}      color="var(--verdict-violet)" href={`/matters/${id}/deep-research`} />
        <StatPill icon={Target}      label="Strategy"      value={matter.strategy ? "Ready" : "None"} color="var(--verdict-amber)" href={`/matters/${id}/strategy`} />
      </div>

      {/* Details + upcoming deadlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Matter details */}
        <div
          className="rounded p-4"
          style={{
            background: "rgba(17,17,20,0.7)",
            border: "0.5px solid rgba(224,224,224,0.09)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-mono text-[9px] tracking-[0.2em] uppercase"
              style={{ color: "var(--fg-quaternary)" }}
            >
              Matter Details
            </span>
          </div>
          <DetailRow label="Client"       value={matter.client} />
          <DetailRow label="Case Type"    value={matter.caseType} />
          <DetailRow label="Jurisdiction" value={matter.jurisdiction} />
          <DetailRow label="Court"        value={matter.court} />
          <DetailRow label="Judge"        value={matter.judgeName} />
          <DetailRow label="Status"       value={matter.status} />
          {matter.facts && (
            <div className="pt-3">
              <p
                className="font-mono text-[9px] tracking-[0.16em] uppercase mb-2"
                style={{ color: "var(--fg-quaternary)" }}
              >
                Facts / Summary
              </p>
              <p className="text-[13px] leading-relaxed line-clamp-5" style={{ color: "var(--fg-secondary)" }}>
                {matter.facts}
              </p>
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div
          className="rounded p-4"
          style={{
            background: "rgba(17,17,20,0.7)",
            border: "0.5px solid rgba(224,224,224,0.09)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-mono text-[9px] tracking-[0.2em] uppercase"
              style={{ color: "var(--fg-quaternary)" }}
            >
              Upcoming Deadlines
            </span>
            <Link
              href={`/matters/${id}/deadlines`}
              className="font-mono text-[9px] tracking-[0.14em] uppercase"
              style={{ color: "var(--verdict-neon)" }}
            >
              View all
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar size={18} className="mb-2" style={{ color: "var(--fg-quaternary)" }} />
              <p
                className="font-mono text-[9px] tracking-[0.14em] uppercase"
                style={{ color: "var(--fg-quaternary)" }}
              >
                No upcoming deadlines
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(d => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "0.5px solid rgba(224,224,224,0.07)",
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: PRIORITY_DOT[d.priority] ?? "var(--fg-quaternary)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--fg-primary)" }}>{d.title}</p>
                    <p
                      className="font-mono text-[9px] tracking-[0.1em] uppercase"
                      style={{ color: "var(--fg-quaternary)" }}
                    >
                      {new Date(d.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick navigation */}
      <div
        className="rounded p-4"
        style={{
          background: "rgba(17,17,20,0.7)",
          border: "0.5px solid rgba(224,224,224,0.09)",
        }}
      >
        <p
          className="font-mono text-[9px] tracking-[0.2em] uppercase mb-3"
          style={{ color: "var(--fg-quaternary)" }}
        >
          Quick Navigation
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {QUICK_TABS.map(({ id: tabId, label, icon: Icon }) => (
            <Link
              key={tabId}
              href={`/matters/${id}/${tabId}`}
              className="flex flex-col items-center gap-1.5 rounded p-2.5 text-center cursor-pointer transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "0.5px solid rgba(224,224,224,0.08)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,255,195,0.2)";
                (e.currentTarget as HTMLElement).style.background = "rgba(0,255,195,0.04)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,224,224,0.08)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
              }}
            >
              <Icon size={14} style={{ color: "var(--verdict-neon)" }} />
              <span
                className="font-mono text-[9px] tracking-[0.1em] uppercase"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
