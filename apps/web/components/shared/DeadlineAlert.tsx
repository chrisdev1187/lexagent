"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useMatters, Matter } from "@/providers/matters-provider";

interface Deadline { id: string; title: string; dueDate: string; priority: string; done: boolean; }

function getAlerts(matters: Matter[]) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const alerts: { matterId: string; matterTitle: string; deadline: Deadline; type: "overdue" | "today" | "tomorrow" }[] = [];
  for (const m of matters) {
    for (const d of (m.deadlines as Deadline[] ?? [])) {
      if (d.done) continue;
      if (d.dueDate < today) alerts.push({ matterId: m.id, matterTitle: m.title, deadline: d, type: "overdue" });
      else if (d.dueDate === today) alerts.push({ matterId: m.id, matterTitle: m.title, deadline: d, type: "today" });
      else if (d.dueDate === tomorrow) alerts.push({ matterId: m.id, matterTitle: m.title, deadline: d, type: "tomorrow" });
    }
  }
  return alerts;
}

const TYPE_STYLE = {
  overdue: { bg: "rgba(255,51,85,0.05)",  border: "rgba(255,51,85,0.25)",  color: "var(--verdict-crimson)", label: "OVERDUE" },
  today:   { bg: "rgba(255,184,0,0.05)",  border: "rgba(255,184,0,0.25)",  color: "var(--verdict-amber)",   label: "TODAY" },
  tomorrow:{ bg: "rgba(0,255,195,0.04)",  border: "rgba(0,255,195,0.20)",  color: "var(--verdict-neon)",    label: "TOMORROW" },
};

export function DeadlineAlert() {
  const { matters, loaded } = useMatters();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem("lex-dismissed-deadlines") ?? "[]")); }
    catch { return new Set(); }
  });

  const alerts = loaded ? getAlerts(matters).filter(a => !dismissed.has(a.deadline.id)) : [];
  if (!alerts.length) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    sessionStorage.setItem("lex-dismissed-deadlines", JSON.stringify([...next]));
  };

  const dismissAll = () => {
    const next = new Set([...dismissed, ...alerts.map(a => a.deadline.id)]);
    setDismissed(next);
    sessionStorage.setItem("lex-dismissed-deadlines", JSON.stringify([...next]));
  };

  return (
    <div className="mx-4 mt-3 rounded overflow-hidden" style={{ border: "0.5px solid rgba(255,51,85,0.25)" }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "rgba(255,51,85,0.06)", borderBottom: "0.5px solid rgba(255,51,85,0.15)" }}
      >
        <div className="flex items-center gap-2">
          <Bell size={12} style={{ color: "var(--verdict-crimson)" }} />
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase font-semibold" style={{ color: "var(--verdict-crimson)" }}>
            {alerts.length} DEADLINE ALERT{alerts.length !== 1 ? "S" : ""}
          </span>
        </div>
        <button onClick={dismissAll} className="font-mono text-[9px] tracking-[0.12em] uppercase cursor-pointer" style={{ color: "var(--fg-quaternary)" }}>
          Dismiss all
        </button>
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(220,38,38,0.1)" }}>
        {alerts.slice(0, 5).map(({ matterId, matterTitle, deadline, type }) => {
          const s = TYPE_STYLE[type];
          return (
            <div key={deadline.id} className="flex items-center gap-3 px-4 py-2.5" style={{ background: s.bg }}>
              <span
                className="font-mono text-[9px] tracking-[0.14em] uppercase font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: `${s.color}15`, color: s.color, border: `0.5px solid ${s.border}` }}
              >
                {s.label}
              </span>
              <div className="flex-1 min-w-0">
                <Link href={`/matters/${matterId}/deadlines`} className="text-[13px] font-medium hover:underline truncate block" style={{ color: "var(--fg-primary)" }}>
                  {deadline.title}
                </Link>
                <span className="font-mono text-[9px] tracking-[0.1em] uppercase" style={{ color: "var(--fg-quaternary)" }}>{matterTitle}</span>
              </div>
              <button onClick={() => dismiss(deadline.id)} className="flex-shrink-0 cursor-pointer" style={{ color: "var(--fg-quaternary)", background: "none", border: "none" }}>
                <X size={13} />
              </button>
            </div>
          );
        })}
        {alerts.length > 5 && (
          <div className="px-4 py-2 font-mono text-[9px] tracking-[0.1em] uppercase" style={{ color: "var(--fg-quaternary)", background: "rgba(220,38,38,0.04)" }}>
            +{alerts.length - 5} more — <Link href="/dashboard" className="underline">view all</Link>
          </div>
        )}
      </div>
    </div>
  );
}
