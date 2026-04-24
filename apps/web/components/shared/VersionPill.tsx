"use client";

import Link from "next/link";
import { LexTooltip } from "./LexTooltip";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

export function VersionPill({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <LexTooltip content={`v${version} — changelog`} side="right">
        <Link
          href="/changelog"
          className="flex items-center justify-center py-1.5 font-mono text-[9px] tracking-[0.14em] cursor-pointer transition-all duration-150"
          style={{
            color: "var(--fg-quaternary)",
            textDecoration: "none",
          }}
        >
          v{version.split(".").slice(0, 2).join(".")}
        </Link>
      </LexTooltip>
    );
  }

  return (
    <LexTooltip content="View changelog" side="top">
      <Link
        href="/changelog"
        className="flex items-center justify-between px-3 py-1.5 font-mono text-[9px] tracking-[0.14em] uppercase cursor-pointer transition-all duration-150"
        style={{
          color: "var(--fg-quaternary)",
          textDecoration: "none",
          borderTop: "0.5px solid rgba(224,224,224,0.06)",
        }}
      >
        <span>LexAgent</span>
        <span
          className="px-1.5 py-0.5 rounded-full"
          style={{
            background: "rgba(0,255,195,0.06)",
            border: "0.5px solid rgba(0,255,195,0.22)",
            color: "var(--verdict-neon)",
          }}
        >
          v{version}
        </span>
      </Link>
    </LexTooltip>
  );
}
