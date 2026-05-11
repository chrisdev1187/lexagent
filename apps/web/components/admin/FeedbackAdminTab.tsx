"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

export function FeedbackAdminTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [filter, setFilter] = useState<{ type: string; status: string }>({ type: "", status: "" });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function updateItem(id: string, patch: Record<string, string>) {
    setUpdating(true);
    await supabase.from("feedback").update(patch).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, ...patch }));
    setUpdating(false);
  }

  const STATUS_OPTIONS = ["open", "in_review", "done", "closed"];
  const PRIORITY_OPTIONS = ["low", "normal", "high", "critical"];
  const TYPE_OPTIONS = ["bug", "feature", "general"];

  const filtered = items.filter(i =>
    (!filter.type || i.type === filter.type) &&
    (!filter.status || i.status === filter.status)
  );

  const typeColor: Record<string, string> = {
    bug: "var(--verdict-crimson)",
    feature: "var(--verdict-neon)",
    general: "var(--verdict-amber)",
  };
  const priorityColor: Record<string, string> = {
    low: "var(--fg-tertiary)",
    normal: "var(--fg-secondary)",
    high: "var(--verdict-amber)",
    critical: "var(--verdict-crimson)",
  };
  const statusColor: Record<string, string> = {
    open: "var(--verdict-neon)",
    in_review: "var(--verdict-amber)",
    done: "var(--fg-tertiary)",
    closed: "var(--fg-quaternary)",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionHeading>FEEDBACK SUBMISSIONS</SectionHeading>
        <div className="flex gap-2">
          <select
            value={filter.type}
            onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
            className="rounded px-2 py-1 text-xs lex-focus"
            style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)", color: "var(--fg-secondary)", outline: "none" }}
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="rounded px-2 py-1 text-xs lex-focus"
            style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)", color: "var(--fg-secondary)", outline: "none" }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>No feedback submissions yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-raised)" }}>
                {["Type", "Title", "User", "Priority", "Status", "Date", ""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ color: typeColor[item.type] ?? "var(--fg-tertiary)", background: "rgba(255,255,255,0.04)" }}>{item.type}</span>
                  </td>
                  <td className="px-3 py-2.5 font-medium max-w-[200px] truncate" style={{ color: "var(--fg-primary)" }}>{item.title}</td>
                  <td className="px-3 py-2.5 text-xs truncate max-w-[140px]" style={{ color: "var(--fg-tertiary)" }}>{item.metadata?.user_email ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: priorityColor[item.priority] ?? "var(--fg-tertiary)" }}>{item.priority}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ color: statusColor[item.status] ?? "var(--fg-tertiary)", background: "rgba(255,255,255,0.04)" }}>{item.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: "var(--fg-tertiary)" }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => setSelected(item)} className="lex-btn lex-btn--ghost text-xs py-0.5 px-2">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div
            className="h-full overflow-y-auto"
            style={{ width: 480, background: "var(--midnight-deep)", borderLeft: "0.5px solid rgba(0,255,195,0.2)", padding: 28 }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: typeColor[selected.type] ?? "var(--fg-tertiary)" }}>{selected.type.toUpperCase()}</p>
                <h3 className="text-base font-medium" style={{ color: "var(--fg-primary)" }}>{selected.title}</h3>
                <p className="text-xs mt-1" style={{ color: "var(--fg-tertiary)" }}>{selected.metadata?.user_email ?? "—"} · {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="lex-btn lex-btn--ghost text-xs">✕</button>
            </div>

            <div className="rounded p-4 mb-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--fg-secondary)", lineHeight: 1.7 }}>{selected.body}</p>
            </div>

            {selected.rating && (
              <p className="text-xs mb-4" style={{ color: "var(--verdict-amber)" }}>Rating: {"★".repeat(selected.rating)}{"☆".repeat(5 - selected.rating)}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-wider mb-1.5" style={{ color: "var(--fg-tertiary)" }}>STATUS</p>
                <select
                  value={selected.status}
                  onChange={e => updateItem(selected.id, { status: e.target.value })}
                  disabled={updating}
                  className="w-full rounded px-3 py-2 text-sm lex-focus"
                  style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)", color: "var(--fg-primary)", outline: "none" }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-wider mb-1.5" style={{ color: "var(--fg-tertiary)" }}>PRIORITY</p>
                <select
                  value={selected.priority}
                  onChange={e => updateItem(selected.id, { priority: e.target.value })}
                  disabled={updating}
                  className="w-full rounded px-3 py-2 text-sm lex-focus"
                  style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)", color: "var(--fg-primary)", outline: "none" }}
                >
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {selected.metadata?.url && (
              <p className="text-[10px] mt-4 font-mono truncate" style={{ color: "var(--fg-quaternary)" }}>URL: {selected.metadata.url}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
