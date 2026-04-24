"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface TabUsage {
  tab: string;
  input_tok: number;
  output_tok: number;
  mem_injected: number;
  calls: number;
}

export interface AdminUserUsage {
  user_id: string;
  email: string;
  input_tok: number;
  output_tok: number;
  mem_injected: number;
  calls: number;
  efficiency: number;
}

export interface DailyTrend {
  day: string;
  input_tok: number;
  output_tok: number;
}

export function useMyTokenUsage() {
  const [data, setData] = useState<TabUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_my_token_usage")
      .then(({ data: rows }) => { if (rows) setData(rows as TabUsage[]); })
      .then(() => setLoading(false), () => setLoading(false));
  }, []);

  const total = data.reduce((s, r) => s + r.input_tok + r.output_tok, 0);
  const memTotal = data.reduce((s, r) => s + r.mem_injected, 0);
  const efficiency = total > 0 ? Math.round((memTotal / total) * 100) : 0;

  return { data, loading, total, memTotal, efficiency };
}

export function useAdminTokenUsage() {
  const [users, setUsers] = useState<AdminUserUsage[]>([]);
  const [trend, setTrend] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.rpc("get_admin_token_summary"),
      supabase.rpc("get_token_daily_trend"),
    ]).then(([summary, daily]) => {
      if (summary.data) setUsers(summary.data as AdminUserUsage[]);
      if (daily.data) setTrend(daily.data as DailyTrend[]);
    }).finally(() => setLoading(false));
  }, []);

  const grandTotal = users.reduce((s, u) => s + u.input_tok + u.output_tok, 0);
  const avgEfficiency = users.length > 0
    ? Math.round(users.reduce((s, u) => s + u.efficiency, 0) / users.length)
    : 0;

  return { users, trend, loading, grandTotal, avgEfficiency };
}
