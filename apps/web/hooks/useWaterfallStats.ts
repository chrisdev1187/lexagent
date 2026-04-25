import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface WaterfallStat {
  provider: string;
  call_count: number;
  total_input_tok: number;
  total_output_tok: number;
  avg_tok: number;
  pct_of_total: number;
  last_seen: string;
}

export function useWaterfallStats(daysBack = 30) {
  const [data, setData] = useState<WaterfallStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase.rpc("get_waterfall_stats", { days_back: daysBack });
    if (err) { setError(err.message); }
    else { setData((rows as WaterfallStat[]) ?? []); }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [daysBack]);

  return { data, loading, error, reload: load };
}
