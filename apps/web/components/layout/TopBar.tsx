"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale, Menu, Plus, X } from "lucide-react";
import { useSettings } from "@/providers/settings-provider";
import { Sidebar } from "./Sidebar";

interface TopBarProps {
  onNewMatter: () => void;
}

export function TopBar({ onNewMatter }: TopBarProps) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className="flex items-center justify-between px-4 h-14 md:hidden"
        style={{
          background: "var(--sidebar-bg)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <button
          onClick={() => setOpen(true)}
          className="cursor-pointer p-1"
          style={{ color: "var(--text-muted)" }}
        >
          <Menu size={20} />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <Scale size={18} style={{ color: "var(--emerald)" }} />
          <span className="font-serif italic text-base" style={{ color: "var(--emerald)" }}>
            {settings.firmName || "LexAgent"}
          </span>
        </Link>

        <button
          onClick={onNewMatter}
          className="cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
            color: "#0A0F0D",
          }}
        >
          <Plus size={13} />
          New
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 flex flex-col"
            style={{ width: 240 }}
          >
            <div
              className="flex items-center justify-end px-3 py-3"
              style={{
                background: "var(--sidebar-bg)",
                borderBottom: "1px solid var(--sidebar-border)",
              }}
            >
              <button onClick={() => setOpen(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar onNewMatter={() => { setOpen(false); onNewMatter(); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
