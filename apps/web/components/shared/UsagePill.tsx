"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface UsageData {
  spent: number;
  budget: number;
}

export function UsagePill() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    Promise.all([
      supabase
        .from("usage_monthly")
        .select("total_usd_cost")
        .eq("user_id", user.id)
        .eq("year", now.getFullYear())
        .eq("month", now.getMonth() + 1)
        .single(),
      supabase
        .from("user_roles")
        .select("plans(usd_budget)")
        .eq("user_id", user.id)
        .single(),
    ]).then(([monthRes, roleRes]) => {
      const spent = Number(monthRes.data?.total_usd_cost ?? 0);
      const budget = Number((roleRes.data?.plans as any)?.usd_budget ?? 8);
      setData({ spent, budget });
    });
  }, [user]);

  if (!user || !data) return null;

  const pct = data.budget > 0 ? Math.min((data.spent / data.budget) * 100, 100) : 0;
  const color = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";
  const borderColor = pct >= 100 ? "rgba(255,51,85,0.3)" : pct >= 80 ? "rgba(255,184,0,0.3)" : "rgba(0,255,195,0.25)";
  const label = isAdmin
    ? `$${data.spent.toFixed(2)} / $${data.budget}`
    : `${Math.round(pct)}% used`;

  return (
    <Link
      href="/admin"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] tracking-[0.1em] transition-opacity hover:opacity-80"
      style={{
        background: "rgba(255,255,255,0.03)",
        color,
        border: `0.5px solid ${borderColor}`,
      }}
      title="Monthly AI usage"
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color, flexShrink: 0, boxShadow: `0 0 4px ${color}` }}
      />
      {label}
    </Link>
  );
}
