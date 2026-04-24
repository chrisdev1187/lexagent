"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, Zap } from "lucide-react";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";

export function BudgetWarningBanner() {
  const { status, spent, budget, seq } = useBudgetStatus();
  const [dismissed, setDismissed] = useState(false);

  // Re-show banner if status changes to a worse level (new AI call tipped the threshold).
  useEffect(() => {
    if (status === "warning" || status === "rate_limited") {
      setDismissed(false);
    }
  }, [status, seq]);

  if (dismissed) return null;
  if (status !== "warning" && status !== "rate_limited") return null;

  const pct   = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const isRl  = status === "rate_limited";
  const color  = isRl ? "var(--verdict-crimson)"  : "var(--verdict-amber)";
  const border = isRl ? "rgba(255,51,85,0.25)"    : "rgba(255,184,0,0.25)";
  const bg     = isRl ? "rgba(255,51,85,0.06)"    : "rgba(255,184,0,0.06)";
  const label  = isRl
    ? `AI budget limit reached (${pct}% used) — further requests are rate-limited.`
    : `AI budget ${pct}% used — approaching monthly limit.`;

  return (
    <div
      role="alert"
      className="flex items-center gap-2.5 px-4 py-2"
      style={{
        background: bg,
        borderBottom: `0.5px solid ${border}`,
        minHeight: 36,
      }}
    >
      <AlertTriangle size={13} style={{ color, flexShrink: 0 }} />
      <span
        className="flex-1 font-mono text-[10px] tracking-[0.08em]"
        style={{ color }}
      >
        {label}
      </span>
      <a
        href="/settings/billing"
        className="flex items-center gap-1 font-mono text-[10px] tracking-[0.1em] uppercase underline underline-offset-2"
        style={{ color, flexShrink: 0 }}
      >
        <Zap size={10} />
        Upgrade
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="lex-btn lex-btn--icon lex-btn--ghost"
        style={{ padding: 2 }}
        aria-label="Dismiss"
      >
        <X size={12} style={{ color }} />
      </button>
    </div>
  );
}
