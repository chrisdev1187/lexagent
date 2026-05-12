"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale, LayoutDashboard, Settings, ChevronLeft,
  Plus, Circle, Folder, LogOut, User, Square, Play, Users,
  UserCircle, CreditCard, Key, Building2, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/providers/settings-provider";
import { useMatters, Matter } from "@/providers/matters-provider";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { EconomyGauge } from "@/components/economy/EconomyGauge";
import { VersionPill } from "@/components/shared/VersionPill";
import { AlertBell } from "@/components/shared/AlertBell";
import { ScanlineWipe } from "@/components/brand/ScanlineWipe";

const STATUS_DOT: Record<string, string> = {
  Active: "var(--verdict-neon)",
  Closed: "var(--fg-tertiary)",
  Pending: "var(--verdict-amber)",
  Urgent: "var(--verdict-crimson)",
};

interface SidebarProps {
  onNewMatter: () => void;
}

export function Sidebar({ onNewMatter }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut, isAdmin } = useAuth();
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
    { href: "/dashboard",      icon: LayoutDashboard, label: "Overview"      },
    { href: "/clients",        icon: Users,           label: "Client List"        },
    { href: "/settings",       icon: Settings,        label: "Preferences"       },
    ...(isAdmin ? [{ href: "/admin", icon: Building2, label: "Firm Admin" }] : []),
  ];

  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <aside
      className="flex flex-col h-full relative transition-all duration-200"
      style={{
        width: collapsed ? 52 : 280,
        minWidth: collapsed ? 52 : 280,
        background: "var(--bg-panel, var(--midnight-deep))",
        borderRight: "0.5px solid var(--border-hair, rgba(224,224,224,0.08))",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-3 flex-shrink-0"
        style={{ height: 56, borderBottom: "0.5px solid rgba(224,224,224,0.08)" }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(0,255,195,0.14) 0%, rgba(106,0,255,0.14) 100%)",
            border: "0.5px solid rgba(0,255,195,0.28)",
            boxShadow: "0 0 12px rgba(0,255,195,0.15)",
          }}
        >
          {settings.firmLogo
            ? <img src={settings.firmLogo} alt="Firm logo" className="w-full h-full object-contain" />
            : <Scale size={15} style={{ color: "var(--verdict-neon)" }} />
          }
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex flex-col">
            {settings.firmName
              ? (
                <>
                  <div className="font-serif font-semibold text-sm leading-tight tracking-tight" style={{ color: "var(--fg-primary)" }}>
                    {settings.firmName}
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
                    Legal AI
                  </div>
                </>
              )
              : <ScanlineWipe fontSize={13} />
            }
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="px-2 pt-4 flex-shrink-0">
        {!collapsed && (
          <div
            className="px-2.5 pb-1.5 font-mono text-[9px] tracking-[0.22em] uppercase"
            style={{ color: "var(--fg-quaternary)" }}
          >
            Navigation
          </div>
        )}
        <div className="space-y-px">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
            return (
              <LexTooltip key={href} content={label} side="right">
                <Link
                  href={href}
                  className="flex items-center gap-2.5 rounded cursor-pointer transition-all duration-150"
                  style={{
                    background: active ? "rgba(0,255,195,0.07)" : "transparent",
                    borderLeft: active ? "2px solid var(--verdict-neon)" : "2px solid transparent",
                    padding: "8px 10px",
                    paddingLeft: active ? 10 : 12,
                    color: active ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "var(--font-sans)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </LexTooltip>
            );
          })}
        </div>
      </nav>

      {/* New Matter */}
      <div className="px-2 pt-3 flex-shrink-0">
        {collapsed ? (
          <LexTooltip content="New Matter" side="right">
            <button
              onClick={onNewMatter}
              className="w-full flex items-center justify-center rounded py-2 cursor-pointer transition-all duration-150"
              style={{
                background: "rgba(0,255,195,0.05)",
                border: "0.5px dashed rgba(0,255,195,0.28)",
                color: "var(--verdict-neon)",
                minHeight: 36,
              }}
            >
              <Plus size={14} />
            </button>
          </LexTooltip>
        ) : (
          <button
            onClick={onNewMatter}
            className="w-full flex items-center gap-2 rounded px-3 py-2.5 text-[10px] font-mono tracking-[0.14em] uppercase cursor-pointer transition-all duration-150"
            style={{
              background: "rgba(0,255,195,0.05)",
              border: "0.5px dashed rgba(0,255,195,0.28)",
              color: "var(--verdict-neon)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0,255,195,0.09)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0,255,195,0.05)";
            }}
          >
            <Plus size={12} />
            New Matter
          </button>
        )}
      </div>

      {/* Matters list */}
      <div
        className="flex-1 overflow-y-auto px-2 pt-3 border-t border-white/5 mt-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(224,224,224,0.06) transparent" }}
      >
        {!collapsed && matters.length > 0 && (
          <div className="px-2.5 pb-2 pt-2 flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.22em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              Recent Matters
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
        <div className="space-y-px">
          {matters.map((m: Matter, idx: number) => {
            const active = activeMatterId === m.id;
            const dotColor = STATUS_DOT[m.status] ?? "var(--fg-tertiary)";
            return (
              <LexTooltip key={m.id} content={`${m.title} — ${m.status}`} side="right">
                <Link
                  href={`/matters/${m.id}/overview`}
                  className="flex items-center gap-2.5 rounded px-2.5 py-2.5 cursor-pointer transition-all duration-150 group fade-in"
                  style={{
                    animationDelay: `${idx * 0.04}s`,
                    background: active ? "rgba(0,255,195,0.06)" : "transparent",
                    borderLeft: active ? "2px solid var(--verdict-neon)" : "2px solid transparent",
                    paddingLeft: active ? 10 : 12,
                    textDecoration: "none",
                    borderRadius: 6,
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
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
                        className="truncate"
                        style={{
                          color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                          fontSize: 13,
                          lineHeight: 1.3,
                        }}
                      >
                        {m.title}
                      </span>
                      {m.client && (
                        <span
                          className="font-mono text-[9px] tracking-[0.1em] truncate"
                          style={{ color: "var(--fg-quaternary)" }}
                        >
                          {m.client}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </LexTooltip>
            );
          })}
        </div>

        {!collapsed && matters.length === 0 && (
          <div className="px-2.5 py-8 text-center">
            <div
              className="w-10 h-10 rounded flex items-center justify-center mx-auto mb-3"
              style={{
                background: "rgba(224,224,224,0.04)",
                border: "0.5px solid rgba(224,224,224,0.08)",
              }}
            >
              <Folder size={16} style={{ color: "var(--fg-quaternary)" }} />
            </div>
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              No matters yet
            </p>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)", flexShrink: 0 }}>
        {/* Timer + usage */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3.5 py-2.5">
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
          </div>
        )}

        {!collapsed && (
          <div className="mx-2 mb-2 rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <EconomyGauge />
          </div>
        )}

        {/* Alert bell */}
        <div style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)", padding: "4px 8px" }}>
          <AlertBell collapsed={collapsed} />
        </div>

        {/* Feedback link */}
        <LexTooltip content="Feedback & Bug Reports" side="right">
          <Link
            href="/feedback"
            className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
            style={{
              color: pathname === "/feedback" ? "var(--verdict-neon)" : "var(--fg-quaternary)",
              textDecoration: "none",
              borderTop: "0.5px solid rgba(224,224,224,0.06)",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--fg-secondary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = pathname === "/feedback" ? "var(--verdict-neon)" : "var(--fg-quaternary)"}
          >
            <MessageSquare size={13} className="flex-shrink-0" />
            {!collapsed && <span className="font-mono text-[11px] tracking-[0.12em]">Feedback</span>}
          </Link>
        </LexTooltip>

        {/* User row / account menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
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
                background: "linear-gradient(135deg, rgba(0,255,195,0.18), rgba(106,0,255,0.18))",
                border: "0.5px solid rgba(0,255,195,0.25)",
              }}
            >
              <User size={12} style={{ color: "var(--verdict-neon)" }} />
            </div>
            {!collapsed && (
              <span
                className="text-[11px] truncate flex-1 font-mono text-left"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {user?.email?.split("@")[0] ?? "User"}
              </span>
            )}
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute z-30 min-w-[180px] rounded overflow-hidden"
              style={{
                left: collapsed ? "calc(100% + 6px)" : 12,
                right: collapsed ? "auto" : 12,
                bottom: collapsed ? "auto" : "100%",
                top: collapsed ? 0 : "auto",
                background: "var(--midnight-deep)",
                border: "0.5px solid rgba(0,255,195,0.22)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(0,255,195,0.08)",
              }}
            >
              {!collapsed && user?.email && (
                <div
                  className="px-3 py-2.5 font-mono text-[10px] truncate"
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
                  className="flex items-center gap-2 px-3 py-2.5 text-[12px] transition-colors"
                  style={{
                    color: "var(--fg-secondary)",
                    textDecoration: "none",
                  }}
                  role="menuitem"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <Icon size={12} style={{ color: "var(--verdict-neon)", flexShrink: 0 }} />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
              <button
                onClick={() => { setUserMenuOpen(false); signOut(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] cursor-pointer transition-colors"
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
          className="w-full flex items-center justify-center py-2 cursor-pointer"
          style={{
            color: "var(--fg-quaternary)",
            background: "none",
            border: "none",
            borderTop: "0.5px solid rgba(224,224,224,0.06)",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--fg-primary)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--fg-quaternary)"}
        >
          <ChevronLeft
            size={13}
            style={{ transition: "transform 0.2s var(--ease-terminal)", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>
    </aside>
  );
}
