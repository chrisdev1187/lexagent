"use client";

import { useState, useEffect } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AiUsageRow {
  id: string;
  user_id: string;
  matter_id: string | null;
  tab: string;
  input_tok: number;
  output_tok: number;
  mem_injected: number;
  model: string | null;
  created_at: string;
}

export function LiveFeedTab() {
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Load recent 50 rows
    supabase
      .from("ai_usage")
      .select("id, user_id, matter_id, tab, input_tok, output_tok, mem_injected, model, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows(data ?? []));

    // Subscribe to new inserts
    const channel = supabase
      .channel("ai_usage_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_usage" }, payload => {
        if (!paused) {
          setRows(prev => [payload.new as AiUsageRow, ...prev].slice(0, 100));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update paused state effect for subscription
  useEffect(() => {
    if (!paused) return;
    // when paused changes, we just gate the push in the handler above
  }, [paused]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio size={14} style={{ color: paused ? "var(--fg-tertiary)" : "var(--verdict-neon)" }} />
          <span className="text-xs font-mono" style={{ color: paused ? "var(--fg-tertiary)" : "var(--verdict-neon)" }}>
            {paused ? "PAUSED" : "LIVE"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{rows.length} events</span>
          <button
            onClick={() => setPaused(p => !p)}
            className="lex-btn lex-btn--ghost text-xs"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => setRows([])}
            className="lex-btn lex-btn--ghost text-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded px-4 py-10 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <Radio size={24} className="mx-auto mb-2" style={{ color: "var(--fg-tertiary)" }} />
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Waiting for AI requests… Make a request in any matter tab to see it appear here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded px-3 py-2"
              style={{
                background: i === 0 && !paused ? "rgba(0,255,195,0.04)" : "rgba(17,17,20,0.6)",
                border: `0.5px solid ${i === 0 && !paused ? "rgba(0,255,195,0.18)" : "rgba(224,224,224,0.07)"}`,
              }}
            >
              <div className="flex items-center gap-3 min-w-0 text-xs">
                <span className="font-mono flex-shrink-0" style={{ color: "var(--fg-quaternary)" }}>
                  {new Date(row.created_at).toLocaleTimeString()}
                </span>
                <span className="px-1.5 py-0.5 rounded font-mono text-[10px] flex-shrink-0" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.18)" }}>
                  {row.tab}
                </span>
                <span className="truncate" style={{ color: "var(--fg-secondary)" }}>{row.model ?? "waterfall"}</span>
              </div>
              <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-4 font-mono" style={{ color: "var(--fg-tertiary)" }}>
                <span style={{ color: "var(--verdict-neon)" }}>↑{row.input_tok}</span>
                <span style={{ color: "var(--verdict-violet)" }}>↓{row.output_tok}</span>
                {row.mem_injected > 0 && <span style={{ color: "var(--verdict-amber)" }}>M:{row.mem_injected}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
