"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useBudgetStatus } from "@/hooks/useBudgetStatus";
import Link from "next/link";

interface CreditStatus {
  used: number;
  limit: number;
  remaining: number;
  pct_used: number;
  plan_id: string;
}

export function UsagePill() {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, seq]);

  if (!user || !data) return null;

  // Free-plan users: limit=0, hide pill (free_tier_usage handles them)
  if (data.limit === 0) return null;

  const pct = data.pct_used;
  const color = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";
  const borderColor = pct >= 100 ? "rgba(255,51,85,0.3)" : pct >= 80 ? "rgba(255,184,0,0.3)" : "rgba(0,255,195,0.25)";
  const label = isAdmin
    ? `${data.remaining} / ${data.limit} credits`
    : `${data.remaining} credits`;

  return (
    <Link
      href={isAdmin ? "/admin" : "/settings/profile"}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] tracking-[0.1em] transition-opacity hover:opacity-80"
      style={{
        background: "rgba(255,255,255,0.03)",
        color,
        border: `0.5px solid ${borderColor}`,
      }}
      title={`${data.used} credits used of ${data.limit} this month`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color, flexShrink: 0, boxShadow: `0 0 4px ${color}` }}
      />
      {label}
    </Link>
  );
}
