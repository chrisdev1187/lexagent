"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale, LayoutDashboard, Settings, ChevronLeft, ChevronRight,
  Plus, Circle, Folder, LogOut, User, Timer,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/providers/settings-provider";
import { useMatters, Matter } from "@/providers/matters-provider";
import { LexTooltip } from "@/components/shared/LexTooltip";

const STATUS_COLOR: Record<string, string> = {
  Active: "var(--emerald)",
  Closed: "var(--text-muted)",
  Pending: "var(--gold)",
  Urgent: "var(--crimson)",
};

interface SidebarProps {
  onNewMatter: () => void;
}

export function Sidebar({ onNewMatter }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { matters } = useMatters();
  const [collapsed, setCollapsed] = useState(settings.sidebarCollapsed);

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    updateSettings({ sidebarCollapsed: next });
  }, [collapsed, updateSettings]);

  const activeMatterId = pathname?.match(/\/matters\/([^/]+)/)?.[1];

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin", icon: Settings, label: "Administration" },
  ];

  return (
    <aside
      className="flex flex-col h-full relative transition-all duration-200"
      style={{
        width: collapsed ? 52 : 240,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        minWidth: collapsed ? 52 : 240,
      }}
    >
      {/* Logo / Wordmark */}
      <div
        className="flex items-center gap-2.5 px-3 py-4"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
        >
          <Scale size={16} style={{ color: "var(--emerald)" }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-serif italic text-base leading-none" style={{ color: "var(--emerald)" }}>
              {settings.firmName || "LexAgent"}
            </div>
            <div className="font-mono text-[10px] tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>
              ARES · LEGAL AI
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-2 pt-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <LexTooltip key={href} content={label} side="right">
              <Link
                href={href}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer transition-all duration-150"
                style={{
                  background: active ? "var(--emerald-faint)" : "transparent",
                  borderLeft: active ? "2px solid var(--emerald)" : "2px solid transparent",
                  color: active ? "var(--emerald)" : "var(--text-muted)",
                }}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </LexTooltip>
          );
        })}
      </nav>

      {/* New Matter */}
      {!collapsed && (
        <div className="px-2 pt-4">
          <button
            onClick={onNewMatter}
            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-mono tracking-wider cursor-pointer transition-all duration-150"
            style={{
              background: "var(--emerald-faint)",
              border: "1px dashed var(--emerald-dim)",
              color: "var(--emerald)",
            }}
          >
            <Plus size={13} />
            NEW MATTER
          </button>
        </div>
      )}

      {/* Matters list */}
      <div
        className="flex-1 overflow-y-auto px-2 pt-3 space-y-0.5"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
      >
        {!collapsed && matters.length > 0 && (
          <div className="px-2.5 pb-1">
            <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--text-muted)" }}>
              MATTERS ({matters.length})
            </span>
          </div>
        )}
        {matters.map((m: Matter) => {
          const active = activeMatterId === m.id;
          const dotColor = STATUS_COLOR[m.status] ?? "var(--text-muted)";
          return (
            <LexTooltip key={m.id} content={`${m.title} — ${m.status}`} side="right">
              <Link
                href={`/matters/${m.id}/research`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-150 group"
                style={{
                  background: active ? "var(--panel)" : "transparent",
                  borderLeft: active ? "2px solid var(--emerald)" : "2px solid transparent",
                }}
              >
                <Circle
                  size={6}
                  className="flex-shrink-0"
                  fill={dotColor}
                  style={{ color: dotColor }}
                />
                {!collapsed && (
                  <span
                    className="text-xs truncate"
                    style={{ color: active ? "var(--text)" : "var(--text-muted)" }}
                  >
                    {m.title}
                  </span>
                )}
              </Link>
            </LexTooltip>
          );
        })}

        {!collapsed && matters.length === 0 && (
          <div className="px-2.5 py-4 text-center">
            <Folder size={24} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No matters yet</p>
          </div>
        )}
      </div>

      {/* Bottom: user + collapse */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        {/* Billable timer hint */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-4 py-2">
            <Timer size={12} style={{ color: "var(--text-muted)" }} />
            <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              00:00:00
            </span>
          </div>
        )}

        {/* User row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <LexTooltip content={user?.email ?? "User"} side="right">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
              style={{ background: "var(--panel2)", border: "1px solid var(--border-hi)" }}
            >
              <User size={13} style={{ color: "var(--text-sub)" }} />
            </div>
          </LexTooltip>
          {!collapsed && (
            <>
              <span className="text-xs truncate flex-1" style={{ color: "var(--text-muted)" }}>
                {user?.email?.split("@")[0] ?? "User"}
              </span>
              <LexTooltip content="Sign out" side="right">
                <button
                  onClick={() => signOut()}
                  className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                >
                  <LogOut size={13} style={{ color: "var(--text-muted)" }} />
                </button>
              </LexTooltip>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center py-2 cursor-pointer transition-all duration-150"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--sidebar-border)" }}
        >
          {collapsed
            ? <ChevronRight size={14} />
            : <ChevronLeft size={14} />
          }
        </button>
      </div>
    </aside>
  );
}
