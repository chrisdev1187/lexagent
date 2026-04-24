"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

export function VersionBadge() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <Link
      href="/changelog"
      title={`LexAgent v${version} — changelog`}
      className="fixed top-3 right-4 z-40 font-mono text-[11px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full transition-all duration-150 hover:scale-105"
      style={{
        background: "rgba(0,255,195,0.08)",
        border: "0.5px solid rgba(0,255,195,0.45)",
        color: "var(--verdict-neon)",
        textShadow: "0 0 6px rgba(0,255,195,0.45)",
        boxShadow: "0 0 10px rgba(0,255,195,0.12)",
        textDecoration: "none",
      }}
    >
      v{version}
    </Link>
  );
}
