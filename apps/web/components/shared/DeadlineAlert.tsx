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
  overdue: { bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.25)", color: "var(--crimson)", label: "OVERDUE" },
  today:   { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "var(--gold)",   label: "TODAY" },
  tomorrow:{ bg: "var(--emerald-faint)",  border: "var(--emerald-dim)",    color: "var(--emerald)", label: "TOMORROW" },
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
    <div className="mx-4 mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.25)" }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "rgba(220,38,38,0.08)", borderBottom: "1px solid rgba(220,38,38,0.15)" }}
      >
        <div className="flex items-center gap-2">
          <Bell size={13} style={{ color: "var(--crimson)" }} />
          <span className="text-xs font-semibold font-mono tracking-wider" style={{ color: "var(--crimson)" }}>
            {alerts.length} DEADLINE ALERT{alerts.length !== 1 ? "S" : ""}
          </span>
        </div>
        <button onClick={dismissAll} className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
          Dismiss all
        </button>
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(220,38,38,0.1)" }}>
        {alerts.slice(0, 5).map(({ matterId, matterTitle, deadline, type }) => {
          const s = TYPE_STYLE[type];
          return (
            <div key={deadline.id} className="flex items-center gap-3 px-4 py-2.5" style={{ background: s.bg }}>
              <span
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.border}` }}
              >
                {s.label}
              </span>
              <div className="flex-1 min-w-0">
                <Link href={`/matters/${matterId}/deadlines`} className="text-xs font-medium hover:underline truncate block" style={{ color: "var(--text)" }}>
                  {deadline.title}
                </Link>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{matterTitle}</span>
              </div>
              <button onClick={() => dismiss(deadline.id)} className="flex-shrink-0 cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                <X size={13} />
              </button>
            </div>
          );
        })}
        {alerts.length > 5 && (
          <div className="px-4 py-2 text-xs" style={{ color: "var(--text-muted)", background: "rgba(220,38,38,0.04)" }}>
            +{alerts.length - 5} more — <Link href="/dashboard" className="underline">view all</Link>
          </div>
        )}
      </div>
    </div>
  );
}
