"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import { Zap, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";

interface CreditStatus {
  used: number;
  limit: number;
  remaining: number;
  pct_used: number;
}

export function EconomyGauge() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<CreditStatus | null>(null);
  const { seq } = useBudgetStatus();

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("get_credit_status", { p_user_id: user.id })
      .then(({ data: d }) => {
        if (d) setData(d as CreditStatus);
      });
  }, [user, seq]);

  if (!user || !data || data.limit === 0) return null;

  const pct = Math.min(data.pct_used, 100);
  const isHigh = pct >= 85;
  const isExhausted = pct >= 100;

  const color = isExhausted ? "var(--verdict-crimson)" : isHigh ? "var(--verdict-amber)" : "var(--verdict-neon)";

  return (
    <div className="px-3 py-2 space-y-2">
      <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.15em] text-[var(--fg-quaternary)]">
        <div className="flex items-center gap-1.5">
          <Zap size={10} style={{ color: isExhausted ? "var(--verdict-crimson)" : "var(--verdict-neon)" }} />
          <span>Credit Pool</span>
        </div>
        <span style={{ color }}>{100 - Math.floor(pct)}% Free</span>
      </div>

      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-[var(--fg-secondary)]">{data.remaining.toLocaleString()} <span className="text-[var(--fg-quaternary)]">LEFT</span></span>
        <Link href="/settings/billing" className="text-[9px] font-mono text-[var(--verdict-neon)] hover:underline">UPGRADE</Link>
      </div>

      {isHigh && (
        <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--verdict-amber)]/5 border border-[var(--verdict-amber)]/20 mt-1">
          <AlertTriangle size={10} className="text-[var(--verdict-amber)]" />
          <span className="text-[8px] font-mono text-[var(--verdict-amber)] leading-none uppercase">Low Balance</span>
        </div>
      )}
    </div>
  );
}
