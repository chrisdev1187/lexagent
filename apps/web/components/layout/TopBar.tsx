"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { useSettings } from "@/providers/settings-provider";
import { AlertBell } from "@/components/shared/AlertBell";

export function TopBar() {
  const { settings } = useSettings();

  return (
    <header
      className="flex items-center justify-between px-4 md:hidden flex-shrink-0 lex-texture"
      style={{
        height: 52,
        background: "rgba(10,10,12,0.94)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "0.5px solid rgba(224,224,224,0.07)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
        <div
          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(0,255,195,0.14) 0%, rgba(106,0,255,0.14) 100%)",
            border: "0.5px solid rgba(0,255,195,0.28)",
            boxShadow: "0 0 10px rgba(0,255,195,0.12)",
          }}
        >
          <Scale size={13} style={{ color: "var(--verdict-neon)" }} />
        </div>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--fg-primary)",
          }}
        >
          {settings.firmName || "LEX PROTOCOL"}
        </span>
      </Link>
      <AlertBell collapsed />
    </header>
  );
}
