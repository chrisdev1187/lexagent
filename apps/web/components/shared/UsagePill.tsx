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
  const { user } = useAuth();
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

  const pct = data.budget > 0 ? (data.spent / data.budget) * 100 : 0;
  const color = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#10B981";

  return (
    <Link
      href="/settings/profile"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-opacity hover:opacity-80"
      style={{ background: "var(--panel)", color, border: `1px solid ${color}33` }}
      title="Monthly AI usage"
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color, flexShrink: 0 }}
      />
      ${data.spent.toFixed(2)} / ${data.budget}
    </Link>
  );
}
