"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Search, ScanSearch, FileText, Target, Users, Clock,
  CalendarDays, ShieldCheck, FileEdit, BookOpen, Scale, ArrowLeft,
  LayoutDashboard, Receipt,
} from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { TABS } from "@/lib/settings";

const ICON_MAP: Record<string, React.ElementType> = {
  Search, ScanSearch, FileText, Target, Users, Clock,
  CalendarDays, ShieldCheck, FileEdit, BookOpen, Scale, LayoutDashboard, Receipt,
};

function TabBar() {
  const pathname = usePathname();
  const { id: matterId } = useParams<{ id: string }>();

  return (
    <div
      className="tab-scroll flex items-center gap-0.5 px-4 overflow-x-auto"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        minHeight: 44,
      }}
    >
      {TABS.map(tab => {
        const href = `/matters/${matterId}/${tab.id}`;
        const active = pathname === href || pathname?.startsWith(href + "/");
        const Icon = ICON_MAP[tab.icon] ?? Search;

        return (
          <LexTooltip key={tab.id} content={tab.tooltip} side="bottom">
            <Link
              href={href}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-all duration-150 relative"
              style={{
                color: active ? "var(--emerald)" : "var(--text-muted)",
                background: active ? "var(--emerald-faint)" : "transparent",
              }}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                  style={{ background: "var(--emerald)" }}
                />
              )}
            </Link>
          </LexTooltip>
        );
      })}
    </div>
  );
}

export default function MatterLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const matter = getMatter(id);

  if (!matter) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Scale size={32} className="mb-3" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Matter not found</p>
        <Link href="/dashboard" className="text-xs underline" style={{ color: "var(--emerald)" }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    Active: "var(--emerald)",
    Closed: "var(--text-muted)",
    Pending: "var(--gold)",
    Urgent: "var(--crimson)",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Matter header */}
      <div
        className="px-4 py-3 flex items-start justify-between gap-4"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex-shrink-0 mt-0.5 cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {matter.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {matter.client && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{matter.client}</span>
              )}
              {matter.caseType && (
                <span
                  className="font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded"
                  style={{ background: "var(--panel2)", color: "var(--text-sub)" }}
                >
                  {matter.caseType}
                </span>
              )}
              <span
                className="font-mono text-[10px] tracking-wide"
                style={{ color: statusColors[matter.status] ?? "var(--text-muted)" }}
              >
                {matter.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
