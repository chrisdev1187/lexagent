"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LayoutDashboard, Clock, FileText,
  Search, ScanSearch, FileEdit, Target,
  Users, CalendarDays, Scale, Gavel, ShieldCheck, Receipt, Brain, Archive
} from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";
import { StatCard } from "@/components/shared/StatCard";

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

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2.5" style={{ borderBottom: "0.5px solid rgba(224,224,224,0.07)" }}>
      <span className="font-mono text-[9px] tracking-[0.16em] uppercase w-28 flex-shrink-0" style={{ color: "var(--fg-quaternary)" }}>{label}</span>
      <span className="text-[13px] flex-1" style={{ color: "var(--fg-secondary)" }}>{value}</span>
    </div>
  );
}

export default function MatterOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const matter = getMatter(id);

  if (!matter) return null;

  const docsCount = (matter.vaultDocs as any[])?.length || 0;
  const eventsCount = (matter.timelineEvents as any[])?.length || 0;
  const deadlines = (matter.deadlines || []) as Deadline[];
  const totalHours = ((matter.totalMinsBilled as number) / 60).toFixed(1);
  const verifications = (matter.allVerifications as any[])?.length || 0;
  const memory = matter.lexMemory as any;
  const memoryHealth = memory ? "OPTIMIZED" : "INITIALIZING";

  // Calculate efficiency based on memory density
  const nodeCount = memory?.nodes?.length || 0;
  const episodeCount = memory?.episodes?.length || 0;
  const efficiency = memory ? Math.min(94, 60 + (nodeCount * 2) + (episodeCount * 5)) : 0;

  const PHASES = [
    { id: "intake",   label: "Intake",    status: matter.facts ? "complete" : "current", icon: Users },
    { id: "research", label: "Research",  status: docsCount > 0 ? "complete" : matter.facts ? "current" : "pending", icon: Search },
    { id: "strategy", label: "Strategy",  status: (matter.timeEntries as any[])?.length > 0 ? "complete" : "pending", icon: Target },
    { id: "draft",    label: "Drafting",  status: "pending", icon: FileEdit },
  ];

  return (
    <PanelShell
      icon={LayoutDashboard}
      title="Matter Overview"
      description="Executive summary and phase-based workflow"
    >
      {/* Phase Tracker */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {PHASES.map((p, i) => (
          <div key={p.id} className="relative">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${p.status === "complete" ? "bg-[var(--verdict-neon)]/10 border-[var(--verdict-neon)] text-[var(--verdict-neon)]" : p.status === "current" ? "bg-white/5 border-[var(--verdict-amber)] text-[var(--verdict-amber)] animate-pulse" : "bg-white/5 border-white/10 text-[var(--fg-quaternary)]"}`}>
                <p.icon size={18} />
              </div>
              <span className={`mt-2 text-[10px] font-mono uppercase tracking-widest ${p.status === "pending" ? "text-[var(--fg-quaternary)]" : "text-[var(--fg-primary)]"}`}>{p.label}</span>
            </div>
            {i < PHASES.length - 1 && (
              <div className="absolute top-5 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 bg-white/5" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">
          {/* LexMemory Status */}
          <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: "linear-gradient(90deg, rgba(0,255,195,0.08) 0%, rgba(17,17,20,0.7) 100%)", border: "0.5px solid rgba(0,255,195,0.2)" }}>
             <div className="flex items-center gap-3">
                <Brain size={20} className="text-[var(--verdict-neon)]" />
                <div>
                   <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--verdict-neon)]">LexMemory Health</p>
                   <p className="text-sm font-semibold text-[var(--fg-primary)]">{memoryHealth}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--fg-quaternary)]">Token Efficiency</p>
                <p className="text-sm font-mono text-[var(--verdict-neon)]">{efficiency}% SAVED</p>
             </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: "var(--fg-primary)" }}>Case Specifications</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.2)" }}>
                {matter.status}
              </span>
            </div>

            <div className="space-y-1">
              <DetailRow label="Matter Title" value={matter.title} />
              <DetailRow label="Case Number" value={matter.caseNumber as string || "Unassigned"} />
              <DetailRow label="Client" value={matter.client} />
              <DetailRow label="Lead Counsel" value={matter.attorney as string} />
              <DetailRow label="Jurisdiction" value={matter.jurisdiction} />
              <DetailRow label="Practice Area" value={matter.caseType} />
              <DetailRow label="Last Updated" value={new Date(matter.updatedAt as number).toLocaleString()} />
            </div>

            <div className="mt-6">
              <p className="font-mono text-[9px] tracking-[0.16em] uppercase mb-2" style={{ color: "var(--fg-quaternary)" }}>Case Facts Summary</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--fg-secondary)" }}>
                {matter.facts || "No case facts provided yet. Add facts to enable ARES reasoning."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Receipt}
              label="Hours Billed"
              value={`${totalHours}h`}
              href={`/matters/${id}/billing`}
              variant="compact"
              color="var(--verdict-amber)"
            />
            <StatCard
              icon={FileText}
              label="Documents"
              value={docsCount}
              href={`/matters/${id}/vault`}
              variant="compact"
            />
            <StatCard
              icon={ShieldCheck}
              label="Verified"
              value={verifications}
              href={`/matters/${id}/citations`}
              variant="compact"
              color="var(--verdict-neon)"
            />
            <StatCard
              icon={Clock}
              label="Deadlines"
              value={deadlines.length}
              href={`/matters/${id}/deadlines`}
              variant="compact"
              color="var(--verdict-crimson)"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} style={{ color: "var(--verdict-amber)" }} />
              <h3 className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--fg-tertiary)" }}>Upcoming Deadlines</h3>
            </div>

            {deadlines.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "var(--fg-quaternary)" }}>No deadlines scheduled</p>
            ) : (
              <div className="space-y-2">
                {deadlines.slice(0, 4).map((d) => (
                  <div key={d.id} className="p-3 rounded bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium truncate pr-2" style={{ color: "var(--fg-primary)" }}>{d.title}</span>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[d.priority] || "var(--fg-quaternary)" }} />
                    </div>
                    <p className="font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{d.dueDate}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
            <h3 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: "var(--fg-tertiary)" }}>Quick Navigation</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Research", icon: Search, href: `/matters/${id}/research` },
                { label: "Deep Research", icon: ScanSearch, href: `/matters/${id}/deep-research` },
                { label: "Drafting", icon: FileEdit, href: `/matters/${id}/draft` },
                { label: "Strategy", icon: Target, href: `/matters/${id}/strategy` },
                { label: "Judge Intel", icon: Users, href: `/matters/${id}/judge` },
                { label: "Conflict", icon: Scale, href: `/matters/${id}/conflict` },
                { label: "Docket", icon: Gavel, href: `/matters/${id}/docket` },
                { label: "Vault", icon: Archive, href: `/matters/${id}/vault` },
              ].map(link => (
                <Link key={link.label} href={link.href}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded bg-white/5 border border-white/5 hover:border-[var(--verdict-neon)]/30 transition-all text-center">
                    <link.icon size={14} style={{ color: "var(--fg-tertiary)" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--fg-secondary)" }}>{link.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PanelShell>
  );
}
