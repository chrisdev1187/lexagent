"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Plus, Settings, AlignJustify, X,
} from "lucide-react";
import { Sidebar } from "./Sidebar";

interface MobileNavProps {
  onNewMatter: () => void;
}

export function MobileNav({ onNewMatter }: MobileNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));

  const navItemStyle = (href: string): React.CSSProperties => ({
    color: isActive(href) ? "var(--verdict-neon)" : "var(--fg-tertiary)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    minWidth: 48,
    minHeight: 44,
    padding: "6px 10px",
    borderRadius: 8,
    textDecoration: "none",
    transition: "color 0.15s",
    cursor: "pointer",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    letterSpacing: "0.06em",
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase",
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          background: "rgba(4,4,7,0.94)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          borderTop: "0.5px solid rgba(224,224,224,0.09)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          className="flex items-center justify-around px-1"
          style={{ height: 60 }}
        >
          <Link href="/dashboard" style={navItemStyle("/dashboard")}>
            <LayoutDashboard size={21} strokeWidth={isActive("/dashboard") ? 2 : 1.75} />
            <span style={labelStyle}>Home</span>
          </Link>

          <Link href="/clients" style={navItemStyle("/clients")}>
            <Users size={21} strokeWidth={isActive("/clients") ? 2 : 1.75} />
            <span style={labelStyle}>Clients</span>
          </Link>

          <button
            onClick={onNewMatter}
            className="cursor-pointer flex items-center justify-center glow-pulse"
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "var(--verdict-neon)",
              color: "var(--midnight-court)",
              border: "none",
              boxShadow: "0 0 22px rgba(0,255,195,0.50), 0 4px 12px rgba(0,0,0,0.45)",
              marginBottom: 6,
              flexShrink: 0,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>

          <Link href="/settings" style={navItemStyle("/settings")}>
            <Settings size={21} strokeWidth={isActive("/settings") ? 2 : 1.75} />
            <span style={labelStyle}>Settings</span>
          </Link>

          <button
            onClick={() => setDrawerOpen(true)}
            className="cursor-pointer"
            style={{
              ...navItemStyle("/matters"),
              color: drawerOpen ? "var(--verdict-neon)" : "var(--fg-tertiary)",
              background: "none",
              border: "none",
            }}
          >
            <AlignJustify size={21} strokeWidth={1.75} />
            <span style={labelStyle}>Matters</span>
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 flex flex-col"
            style={{
              width: 280,
              zIndex: 1,
              animation: "slideInLeft 0.26s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <div
              className="flex items-center justify-between flex-shrink-0"
              style={{
                padding: "12px 16px",
                background: "var(--midnight-deep)",
                borderBottom: "0.5px solid rgba(224,224,224,0.08)",
              }}
            >
              <span
                className="font-mono text-[9px] tracking-[0.2em] uppercase"
                style={{ color: "var(--fg-quaternary)" }}
              >
                Matters & Navigation
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="cursor-pointer flex items-center justify-center"
                style={{
                  color: "var(--fg-tertiary)",
                  background: "none",
                  border: "none",
                  minWidth: 40,
                  minHeight: 40,
                  borderRadius: 6,
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar
                onNewMatter={() => {
                  setDrawerOpen(false);
                  onNewMatter();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
