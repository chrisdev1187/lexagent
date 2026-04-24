"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale, LayoutDashboard, Settings, ChevronLeft, ChevronRight,
  Plus, Circle, Folder, LogOut, User, Square, Play, Users,
  UserCircle, CreditCard, Key,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/providers/settings-provider";
import { useMatters, Matter } from "@/providers/matters-provider";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { UsagePill } from "@/components/shared/UsagePill";
import { VersionPill } from "@/components/shared/VersionPill";

const STATUS_DOT: Record<string, string> = {
  Active: "var(--verdict-neon)",
  Closed: "var(--fg-tertiary)",
  Pending: "var(--verdict-amber)",
  Urgent: "var(--verdict-crimson)",
};

const STATUS_KIND: Record<string, string> = {
  Active: "neon",
  Closed: "neutral",
  Pending: "amber",
  Urgent: "crimson",
};

interface SidebarProps {
  onNewMatter: () => void;
}

export function Sidebar({ onNewMatter }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { matters, getMatter, updateMatter } = useMatters();
  const [collapsed, setCollapsed] = useState(settings.sidebarCollapsed);

  const [timerRunning, setTimerRunning] = useState(false);
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerMatterIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    updateSettings({ sidebarCollapsed: next });
  }, [collapsed, updateSettings]);

  const activeMatterId = pathname?.match(/\/matters\/([^/]+)/)?.[1];

  const stopAndSave = useCallback(() => {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    const mid = timerMatterIdRef.current;
    if (mid) {
      const matter = getMatter(mid);
      if (matter) {
        const durationMins = Math.max(1, Math.ceil(elapsedRef.current / 60));
        const entry = {
          id: crypto.randomUUID(),
          durationMins,
          startedAt: startedAtRef.current,
          stoppedAt: Date.now(),
        };
        const entries = (matter.timeEntries as typeof entry[]) ?? [];
        updateMatter({
          ...matter,
          timeEntries: [entry, ...entries],
          totalMinsBilled: ((matter.totalMinsBilled as number) ?? 0) + durationMins,
        });
      }
    }
    elapsedRef.current = 0;
    setDisplayElapsed(0);
    timerMatterIdRef.current = null;
    setTimerRunning(false);
  }, [getMatter, updateMatter]);

  const startTimer = useCallback((mid: string) => {
    if (timerRunning) { stopAndSave(); return; }
    timerMatterIdRef.current = mid;
    startedAtRef.current = Date.now();
    elapsedRef.current = 0;
    setDisplayElapsed(0);
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setDisplayElapsed(elapsedRef.current);
    }, 1000);
  }, [timerRunning, stopAndSave]);

  useEffect(() => {
    if (timerRunning && timerMatterIdRef.current && timerMatterIdRef.current !== activeMatterId) {
      stopAndSave();
    }
  }, [activeMatterId, timerRunning, stopAndSave]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/clients", icon: Users, label: "Clients" },
    { href: "/admin", icon: Settings, label: "Administration" },
  ];

  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <aside
      className="flex flex-col h-full relative transition-all duration-200"
      style={{
        width: collapsed ? 52 : 240,
        minWidth: collapsed ? 52 : 240,
        background: "var(--midnight-deep)",
        borderRight: "0.5px solid rgba(224,224,224,0.08)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-3 py-3.5"
        style={{ borderBottom: "0.5px solid rgba(224,224,224,0.08)" }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
          style={{
            background: "rgba(0,255,195,0.06)",
            border: "0.5px solid rgba(0,255,195,0.25)",
          }}
        >
          <Scale size={15} style={{ color: "var(--verdict-neon)" }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div
              className="font-serif font-semibold text-sm leading-none tracking-tight"
              style={{ color: "var(--fg-primary)" }}
            >
              {settings.firmName || "LEX PROTOCOL"}
            </div>
            <div
              className="font-mono text-[9px] tracking-[0.2em] uppercase mt-1"
              style={{ color: "var(--fg-quaternary)" }}
            >
              ARES v5
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-2 pt-3 space-y-px">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <LexTooltip key={href} content={label} side="right">
              <Link
                href={href}
                className="flex items-center gap-2.5 rounded px-2.5 py-2 text-sm cursor-pointer transition-all duration-150"
                style={{
                  background: active ? "rgba(0,255,195,0.06)" : "transparent",
                  borderLeft: active ? "2px solid var(--verdict-neon)" : "2px solid transparent",
                  paddingLeft: active ? 10 : 12,
                  color: active ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                }}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-[13px]" style={{ fontFamily: "var(--font-sans)" }}>{label}</span>
                )}
              </Link>
            </LexTooltip>
          );
        })}
      </nav>

      {/* New Matter */}
      {!collapsed && (
        <div className="px-2 pt-3">
          <button
            onClick={onNewMatter}
            className="w-full flex items-center gap-2 rounded px-2.5 py-2 text-[10px] font-mono tracking-[0.14em] uppercase cursor-pointer transition-all duration-150"
            style={{
              background: "rgba(0,255,195,0.04)",
              border: "0.5px dashed rgba(0,255,195,0.28)",
              color: "var(--verdict-neon)",
            }}
          >
            <Plus size={12} />
            New Matter
          </button>
        </div>
      )}

      {/* Matters list */}
      <div
        className="flex-1 overflow-y-auto px-2 pt-3 space-y-px"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(224,224,224,0.06) transparent" }}
      >
        {!collapsed && matters.length > 0 && (
          <div className="px-2.5 pb-2 flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              Matters
            </span>
            <span
              className="font-mono text-[9px] px-1.5 py-0.5 rounded-full"
              style={{
                border: "0.5px solid rgba(224,224,224,0.10)",
                color: "var(--fg-quaternary)",
                background: "rgba(224,224,224,0.03)",
              }}
            >
              {matters.length}
            </span>
          </div>
        )}
        {matters.map((m: Matter) => {
          const active = activeMatterId === m.id;
          const dotColor = STATUS_DOT[m.status] ?? "var(--fg-tertiary)";
          return (
            <LexTooltip key={m.id} content={`${m.title} — ${m.status}`} side="right">
              <Link
                href={`/matters/${m.id}/overview`}
                className="flex items-center gap-2 rounded px-2.5 py-2 cursor-pointer transition-all duration-150 group"
                style={{
                  background: active ? "rgba(0,255,195,0.05)" : "transparent",
                  borderLeft: active ? "2px solid var(--verdict-neon)" : "2px solid transparent",
                  paddingLeft: active ? 10 : 12,
                }}
              >
                <Circle
                  size={5}
                  className="flex-shrink-0"
                  fill={dotColor}
                  style={{ color: dotColor, flexShrink: 0 }}
                />
                {!collapsed && (
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-[12px] truncate"
                      style={{
                        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                      }}
                    >
                      {m.title}
                    </span>
                    <span
                      className="font-mono text-[9px] tracking-[0.14em] uppercase truncate"
                      style={{ color: "var(--fg-quaternary)" }}
                    >
                      {m.status}
                    </span>
                  </div>
                )}
              </Link>
            </LexTooltip>
          );
        })}

        {!collapsed && matters.length === 0 && (
          <div className="px-2.5 py-6 text-center">
            <Folder size={20} className="mx-auto mb-2" style={{ color: "var(--fg-quaternary)" }} />
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              No matters
            </p>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
        {/* Timer + usage */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3.5 py-2">
            <LexTooltip
              content={timerRunning ? "Stop & save entry" : activeMatterId ? "Start billable timer" : "Open a matter first"}
              side="top"
            >
              <button
                onClick={() => activeMatterId ? startTimer(activeMatterId) : undefined}
                disabled={!activeMatterId && !timerRunning}
                className="flex items-center gap-1.5 cursor-pointer"
                style={{ background: "none", border: "none", padding: 0 }}
              >
                {timerRunning
                  ? <Square size={10} fill="var(--verdict-crimson)" style={{ color: "var(--verdict-crimson)" }} />
                  : <Play size={10} style={{ color: activeMatterId ? "var(--verdict-neon)" : "var(--fg-quaternary)" }} />
                }
                <span
                  className="font-mono text-[10px]"
                  style={{ color: timerRunning ? "var(--verdict-crimson)" : "var(--fg-quaternary)" }}
                >
                  {timerRunning
                    ? fmtElapsed(displayElapsed)
                    : activeMatterId
                      ? (() => { const mt = getMatter(activeMatterId); const mins = (mt?.totalMinsBilled as number) ?? 0; return `${String(Math.floor(mins / 60)).padStart(2, "0")}h ${String(mins % 60).padStart(2, "0")}m`; })()
                      : "00:00:00"
                  }
                </span>
              </button>
            </LexTooltip>
            <UsagePill />
          </div>
        )}

        {/* User row / account menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors"
            style={{
              background: userMenuOpen ? "rgba(0,255,195,0.05)" : "transparent",
              border: "none",
            }}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(0,255,195,0.15), rgba(106,0,255,0.15))",
                border: "0.5px solid rgba(0,255,195,0.2)",
              }}
            >
              <User size={12} style={{ color: "var(--verdict-neon)" }} />
            </div>
            {!collapsed && (
              <span
                className="text-[12px] truncate flex-1 font-mono text-left"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {user?.email?.split("@")[0] ?? "User"}
              </span>
            )}
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full mb-1 z-30 min-w-[180px] rounded overflow-hidden"
              style={{
                left: collapsed ? "calc(100% + 6px)" : 12,
                right: collapsed ? "auto" : 12,
                bottom: collapsed ? "auto" : "100%",
                top: collapsed ? 0 : "auto",
                background: "var(--midnight-deep)",
                border: "0.5px solid rgba(0,255,195,0.22)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {!collapsed && user?.email && (
                <div
                  className="px-3 py-2 font-mono text-[10px] truncate"
                  style={{
                    color: "var(--fg-quaternary)",
                    borderBottom: "0.5px solid rgba(224,224,224,0.06)",
                  }}
                >
                  {user.email}
                </div>
              )}
              {[
                { href: "/settings?tab=profile",  icon: UserCircle, label: "Profile & Usage" },
                { href: "/settings?tab=billing",  icon: CreditCard, label: "Billing & Plan" },
                { href: "/settings?tab=api-key",  icon: Key,        label: "API Keys" },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-[12px] transition-colors"
                  style={{
                    color: "var(--fg-secondary)",
                    textDecoration: "none",
                  }}
                  role="menuitem"
                >
                  <Icon size={12} style={{ color: "var(--verdict-neon)", flexShrink: 0 }} />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
              <button
                onClick={() => { setUserMenuOpen(false); signOut(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer transition-colors"
                style={{
                  background: "none",
                  border: "none",
                  borderTop: "0.5px solid rgba(224,224,224,0.06)",
                  color: "var(--verdict-crimson)",
                }}
                role="menuitem"
              >
                <LogOut size={12} style={{ flexShrink: 0 }} />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Version */}
        <VersionPill collapsed={collapsed} />

        {/* Collapse */}
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center py-2 cursor-pointer transition-all duration-150"
          style={{
            color: "var(--fg-quaternary)",
            background: "none",
            border: "none",
            borderTop: "0.5px solid rgba(224,224,224,0.06)",
          }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>
    </aside>
  );
}
