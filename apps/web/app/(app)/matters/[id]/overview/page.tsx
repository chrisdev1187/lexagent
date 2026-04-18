"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, User, MapPin, Gavel, Clock, Calendar, FileText,
  BookOpen, ShieldCheck, Receipt, Search, ScanSearch, FileEdit, Target,
  Users, CalendarDays, Scale, Pencil,
} from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

function StatPill({ icon: Icon, label, value, color = "var(--emerald)", href }: {
  icon: React.ElementType; label: string; value: string | number; color?: string; href: string;
}) {
  return (
    <Link href={href}>
      <div
        className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-150 group"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}14`, border: `1px solid ${color}28` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold leading-none" style={{ color: "var(--text)" }}>{value}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
        </div>
      </div>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs w-28 flex-shrink-0 font-mono tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-xs flex-1" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

const QUICK_TABS = [
  { id: "research",     label: "Research",    icon: Search        },
  { id: "deepresearch", label: "Deep Research",icon: ScanSearch    },
  { id: "vault",        label: "Vault",       icon: FileText      },
  { id: "strategy",     label: "Strategy",    icon: Target        },
  { id: "judge",        label: "Judge Intel", icon: Users         },
  { id: "deadlines",    label: "Deadlines",   icon: Calendar      },
  { id: "timeline",     label: "Timeline",    icon: CalendarDays  },
  { id: "citations",    label: "Shield",      icon: ShieldCheck   },
  { id: "draft",        label: "Draft",       icon: FileEdit      },
  { id: "notes",        label: "Evidence",    icon: BookOpen      },
  { id: "billing",      label: "Billing",     icon: Receipt       },
  { id: "conflict",     label: "Conflict",    icon: Scale         },
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

  const PRIORITY_COLOR: Record<string, string> = {
    High: "var(--crimson)", Medium: "var(--gold)", Low: "var(--emerald)",
  };

  return (
    <PanelShell
      icon={LayoutDashboard}
      title="Matter Overview"
      description={`${matter.client ? `${matter.client} · ` : ""}${matter.caseType || "General"}`}
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill icon={Clock}      label="Hours Billed"  value={`${totalHours}h`}    color="var(--gold)"    href={`/matters/${id}/billing`} />
        <StatPill icon={Receipt}    label="Time Entries"  value={timeEntries.length}  color="var(--gold)"    href={`/matters/${id}/billing`} />
        <StatPill icon={Calendar}   label="Deadlines"     value={deadlines.length}    color="var(--crimson)" href={`/matters/${id}/deadlines`} />
        <StatPill icon={FileText}   label="Vault Docs"    value={vaultDocs.length}    color="var(--emerald)" href={`/matters/${id}/vault`} />
        <StatPill icon={BookOpen}   label="Notes"         value={notes.length}        color="var(--emerald)" href={`/matters/${id}/notes`} />
        <StatPill icon={ShieldCheck}label="Verifications" value={(matter.allVerifications as unknown[])?.length ?? 0} color="var(--emerald)" href={`/matters/${id}/citations`} />
        <StatPill icon={Gavel}      label="Precedents"    value={(matter.precedents as unknown[])?.length ?? 0} color="#7c3aed" href={`/matters/${id}/deepresearch`} />
        <StatPill icon={Target}     label="Strategy"      value={matter.strategy ? "Ready" : "None"} color="var(--gold)" href={`/matters/${id}/strategy`} />
      </div>

      {/* Details + upcoming deadlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Matter details */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>MATTER DETAILS</p>
            <Link href={`/matters/${id}/overview`} style={{ color: "var(--text-muted)" }}>
              <Pencil size={12} />
            </Link>
          </div>
          <div>
            <DetailRow label="CLIENT"       value={matter.client} />
            <DetailRow label="CASE TYPE"    value={matter.caseType} />
            <DetailRow label="JURISDICTION" value={matter.jurisdiction} />
            <DetailRow label="COURT"        value={matter.court} />
            <DetailRow label="JUDGE"        value={matter.judgeName} />
            <DetailRow label="STATUS"       value={matter.status} />
            {matter.facts && (
              <div className="pt-3">
                <p className="text-xs font-mono tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>FACTS / SUMMARY</p>
                <p className="text-xs leading-relaxed line-clamp-5" style={{ color: "var(--text)" }}>{matter.facts}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>UPCOMING DEADLINES</p>
            <Link href={`/matters/${id}/deadlines`} className="text-xs" style={{ color: "var(--emerald)" }}>View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar size={20} className="mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(d => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "var(--panel2)", border: "1px solid var(--border)" }}>
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: PRIORITY_COLOR[d.priority] ?? "var(--text-muted)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{d.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
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
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-mono tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>QUICK NAVIGATION</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {QUICK_TABS.map(({ id: tabId, label, icon: Icon }) => (
            <Link
              key={tabId}
              href={`/matters/${id}/${tabId}`}
              className="flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-center cursor-pointer transition-all duration-150"
              style={{ background: "var(--panel2)", border: "1px solid var(--border)" }}
            >
              <Icon size={15} style={{ color: "var(--emerald)" }} />
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
