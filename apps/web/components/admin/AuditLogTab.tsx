"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

interface AuditRow {
  id: number;
  user_email: string | null;
  matter_title: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export function AuditLogTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sealing, setSealing] = useState(false);
  const [sealMsg, setSealMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE = 50;

  async function load(p: number) {
    setLoading(true);
    const { data } = await supabase.rpc("get_audit_log", { p_limit: PAGE, p_offset: p * PAGE });
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sealCheckpoint() {
    setSealing(true);
    setSealMsg(null);
    const now = new Date();
    const { data, error } = await supabase.rpc("generate_audit_checkpoint", {
      p_year: now.getFullYear(),
      p_month: now.getMonth() + 1,
    });
    setSealMsg(error ? `Error: ${error.message}` : `Sealed. SHA-256: ${data}`);
    setSealing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionHeading>AUDIT LOG</SectionHeading>
        <button
          onClick={sealCheckpoint}
          disabled={sealing}
          className="lex-btn lex-btn--secondary"
        >
          <Lock size={11} />
          {sealing ? "Sealing…" : "Seal This Month"}
        </button>
      </div>

      {sealMsg && (
        <div
          className="rounded px-3 py-2 mb-4 text-xs font-mono break-all"
          style={{ background: "var(--bg-raised)", color: "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}
        >
          {sealMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>No audit events yet.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-raised)" }}>
                  {["Time", "User", "Action", "Entity", "Matter"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                    <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: "var(--fg-tertiary)" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: "var(--fg-primary)" }}>
                      {r.user_email ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: "var(--verdict-neon)" }}>
                      {r.action}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                      {r.entity_type ?? ""}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "var(--fg-tertiary)" }}>
                      {r.matter_title ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="lex-btn lex-btn--ghost"
            >
              Previous
            </button>
            <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={rows.length < PAGE}
              className="lex-btn lex-btn--ghost"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
