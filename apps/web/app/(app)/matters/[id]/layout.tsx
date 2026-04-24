"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Search, ScanSearch, FileText, Target, Users, Clock,
  CalendarDays, ShieldCheck, FileEdit, BookOpen, Scale, ArrowLeft,
  LayoutDashboard, Receipt, Share2, Lock, Globe,
} from "lucide-react";
import { useMatters } from "@/providers/matters-provider";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { AvatarStack } from "@/components/shared/AvatarStack";
import { BudgetWarningBanner } from "@/components/shared/BudgetWarningBanner";
import { usePresence } from "@/hooks/usePresence";
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
      className="tab-scroll flex items-center gap-px px-4 overflow-x-auto"
      style={{
        background: "var(--midnight-deep)",
        borderBottom: "0.5px solid rgba(224,224,224,0.08)",
        minHeight: 42,
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
              className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono tracking-[0.1em] uppercase whitespace-nowrap cursor-pointer transition-all duration-150 relative"
              style={{
                color: active ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                background: active ? "rgba(0,255,195,0.05)" : "transparent",
              }}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{tab.label}</span>
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: "0.5px", background: "var(--verdict-neon)" }}
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
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);
  const currentTab = pathname?.split("/").pop() ?? "overview";
  const present = usePresence(id, currentTab);

  const statusColors: Record<string, string> = {
    Active: "var(--verdict-neon)",
    Closed: "var(--fg-tertiary)",
    Pending: "var(--verdict-amber)",
    Urgent: "var(--verdict-crimson)",
  };

  if (!matter) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Scale size={28} className="mb-3" style={{ color: "var(--fg-quaternary)" }} />
        <p
          className="font-mono text-[10px] tracking-[0.14em] uppercase mb-4"
          style={{ color: "var(--fg-quaternary)" }}
        >
          Matter not found
        </p>
        <Link
          href="/dashboard"
          className="font-mono text-[10px] tracking-[0.14em] uppercase underline"
          style={{ color: "var(--verdict-neon)" }}
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Matter header */}
      <div
        className="px-4 py-2.5 flex items-start justify-between gap-4"
        style={{
          background: "var(--midnight-deep)",
          borderBottom: "0.5px solid rgba(224,224,224,0.08)",
        }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="flex-shrink-0 mt-0.5 cursor-pointer"
            style={{ color: "var(--fg-quaternary)" }}
          >
            <ArrowLeft size={15} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1
              className="font-serif italic text-sm font-medium truncate"
              style={{ color: "var(--fg-primary)" }}
            >
              {matter.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {matter.client && (
                <span
                  className="font-mono text-[9px] tracking-[0.14em] uppercase truncate max-w-[120px] sm:max-w-none"
                  style={{ color: "var(--fg-quaternary)" }}
                >
                  {matter.client}
                </span>
              )}
              {matter.caseType && (
                <span
                  className="font-mono text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-full hidden sm:inline"
                  style={{
                    background: "rgba(224,224,224,0.04)",
                    border: "0.5px solid rgba(224,224,224,0.10)",
                    color: "var(--fg-tertiary)",
                  }}
                >
                  {matter.caseType}
                </span>
              )}
              <span
                className="font-mono text-[9px] tracking-[0.14em] uppercase"
                style={{ color: statusColors[matter.status] ?? "var(--fg-tertiary)" }}
              >
                {matter.status}
              </span>
            </div>
          </div>
          <AvatarStack users={present} />
        </div>

        {(() => {
          const vis = matter?.visibility ?? (matter?.shared ? "team" : "private");
          const cycled = vis === "private" ? "team" : "private";
          const isShared = vis !== "private";
          const VisIcon = vis === "private" ? Lock : vis === "team" ? Globe : Share2;
          const label = vis === "private" ? "Private" : vis === "team" ? "Team" : "Custom";
          return (
            <button
              onClick={() => matter && updateMatter({ ...matter, visibility: cycled, shared: cycled !== "private" })}
              className="flex-shrink-0 flex items-center gap-1.5 rounded px-2.5 py-1.5 cursor-pointer transition-all duration-150"
              style={{
                background: isShared ? "rgba(0,255,195,0.06)" : "rgba(255,255,255,0.03)",
                color: isShared ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                border: `0.5px solid ${isShared ? "rgba(0,255,195,0.25)" : "rgba(224,224,224,0.10)"}`,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
              }}
            >
              <VisIcon size={11} />
              <span className="hidden sm:inline uppercase">{label}</span>
            </button>
          );
        })()}
      </div>

      <TabBar />
      <BudgetWarningBanner />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
