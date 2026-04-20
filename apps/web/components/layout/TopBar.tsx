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
        className="flex items-center justify-between px-4 md:hidden"
        style={{
          height: 52,
          background: "rgba(10,10,12,0.85)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          borderBottom: "0.5px solid rgba(224,224,224,0.08)",
        }}
      >
        <button
          onClick={() => setOpen(true)}
          className="cursor-pointer p-1"
          style={{ color: "var(--fg-tertiary)", background: "none", border: "none" }}
        >
          <Menu size={18} />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <Scale size={16} style={{ color: "var(--verdict-neon)" }} />
          <span
            className="font-serif font-semibold text-sm tracking-tight"
            style={{ color: "var(--fg-primary)" }}
          >
            {settings.firmName || "LEX PROTOCOL"}
          </span>
        </Link>

        <button
          onClick={onNewMatter}
          className="cursor-pointer flex items-center gap-1.5 rounded px-3 py-1.5"
          style={{
            background: "var(--verdict-neon)",
            color: "var(--midnight-court)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            boxShadow: "0 0 12px rgba(0,255,195,0.35)",
          }}
        >
          <Plus size={12} />
          NEW
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 flex flex-col"
            style={{ width: 240, zIndex: 1 }}
          >
            <div
              className="flex items-center justify-end px-3 py-3"
              style={{
                background: "var(--midnight-deep)",
                borderBottom: "0.5px solid rgba(224,224,224,0.08)",
              }}
            >
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer"
                style={{ color: "var(--fg-tertiary)", background: "none", border: "none" }}
              >
                <X size={16} />
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
