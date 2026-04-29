"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, ExternalLink, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useAlertCount } from "@/hooks/useAlertCount";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface RecentAlert {
  alert_id: string;
  entry_date: string | null;
  description: string | null;
  case_name: string | null;
  matter_id: string;
  matter_name: string | null;
  created_at: string;
}

function token(): string {
  try {
    const raw = localStorage.getItem("sb-mgiqicasllvisiwvbiuu-auth-token");
    return (JSON.parse(raw ?? "null") as { access_token?: string } | null)?.access_token ?? "";
  } catch { return ""; }
}

export function AlertBell({ collapsed = false }: { collapsed?: boolean }) {
  const { count, refresh } = useAlertCount();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dockets/alerts/recent`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setAlerts(await res.json());
    } finally { setLoading(false); }
  }

  async function markAllSeen() {
    for (const a of alerts) {
      await fetch(`${API_URL}/api/dockets/alerts/${a.alert_id}/seen`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      });
    }
    setAlerts([]);
    refresh();
  }

  function toggle() {
    if (!open) loadAlerts();
    setOpen(o => !o);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:bg-[rgba(255,255,255,0.05)]"
        title="Docket alerts"
      >
        <Bell className="w-4 h-4" style={{ color: count > 0 ? "var(--verdict-neon)" : "var(--fg-tertiary)" }} />
        {!collapsed && <span className="text-[11px] font-mono" style={{ color: "var(--fg-secondary)" }}>Alerts</span>}
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "var(--verdict-neon)", color: "var(--midnight-deep)" }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-80 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{
            background: "var(--midnight-mid)",
            border: "0.5px solid rgba(224,224,224,0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(224,224,224,0.08)]">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--fg-tertiary)" }}>
              Docket Alerts
            </span>
            {alerts.length > 0 && (
              <button
                onClick={markAllSeen}
                className="flex items-center gap-1 text-[10px] font-mono hover:text-[var(--verdict-neon)] transition-colors"
                style={{ color: "var(--fg-tertiary)" }}
              >
                <CheckCheck className="w-3 h-3" /> Mark all seen
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-center text-[10px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
                Loading…
              </div>
            ) : alerts.length === 0 ? (
              <div className="px-3 py-6 text-center text-[10px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
                No new alerts
              </div>
            ) : (
              alerts.map(a => (
                <Link
                  key={a.alert_id}
                  href={`/matters/${a.matter_id}/docket`}
                  onClick={() => setOpen(false)}
                  className="flex flex-col gap-0.5 px-3 py-2.5 border-b border-[rgba(224,224,224,0.05)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  style={{ textDecoration: "none" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono truncate" style={{ color: "var(--fg-primary)" }}>
                      {a.case_name ?? a.matter_name ?? "Unknown case"}
                    </span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "var(--fg-tertiary)" }} />
                  </div>
                  <span className="text-[10px] font-mono line-clamp-2" style={{ color: "var(--fg-tertiary)" }}>
                    {a.description ?? "New filing"}
                  </span>
                  {a.entry_date && (
                    <span className="text-[9px] font-mono mt-0.5" style={{ color: "var(--fg-quaternary)" }}>
                      {new Date(a.entry_date).toLocaleDateString()}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
