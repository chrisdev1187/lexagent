"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface UserRole {
  plan_id: string;
  byok_active: boolean;
}

interface UsageMonthly {
  total_usd_cost: number;
  total_requests: number;
}

interface Plan {
  id: string;
  name: string;
  usd_budget: number;
}

interface UsageEvent {
  tool_name: string;
  model: string;
  usd_cost: number;
  created_at: string;
}

const PLAN_COLOR: Record<string, string> = {
  starter:      "var(--fg-tertiary)",
  professional: "var(--verdict-neon)",
  firm:         "var(--verdict-amber)",
  premium:      "var(--verdict-violet)",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [monthly, setMonthly] = useState<UsageMonthly | null>(null);
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const now = new Date();
      const [roleRes, monthRes, eventsRes] = await Promise.all([
        supabase.from("user_roles").select("plan_id, byok_active, plans(id, name, usd_budget)").eq("user_id", user!.id).single(),
        supabase.from("usage_monthly").select("total_usd_cost, total_requests").eq("user_id", user!.id).eq("year", now.getFullYear()).eq("month", now.getMonth() + 1).single(),
        supabase.from("usage_events").select("tool_name, model, usd_cost, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (roleRes.data) { setRole(roleRes.data as UserRole); setPlan((roleRes.data as any).plans as Plan); }
      if (monthRes.data) setMonthly(monthRes.data);
      if (eventsRes.data) setEvents(eventsRes.data as UsageEvent[]);
      setLoading(false);
    }
    load();
  }, [user]);

  if (!user) return null;

  const usdSpent = monthly?.total_usd_cost ?? 0;
  const usdBudget = plan?.usd_budget ?? 8;
  const pct = Math.min((usdSpent / usdBudget) * 100, 100);
  const barColor = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--verdict-neon)" }}>▸</span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mt-1" style={{ color: "var(--fg-primary)" }}>
          Profile &amp; Usage
        </h1>
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>
          {user.email}
        </p>
      </div>

      {loading ? (
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
          Loading…
        </p>
      ) : (
        <>
          {/* Plan card */}
          <div
            className="rounded p-5"
            style={{
              background: "rgba(17,17,20,0.7)",
              border: "0.5px solid rgba(224,224,224,0.09)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p
                  className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1"
                  style={{ color: "var(--fg-quaternary)" }}
                >
                  Current Plan
                </p>
                <p
                  className="font-serif text-xl font-semibold"
                  style={{ color: PLAN_COLOR[role?.plan_id ?? "starter"] ?? "var(--fg-primary)" }}
                >
                  {plan?.name ?? role?.plan_id ?? "Starter"}
                </p>
              </div>
              {role?.byok_active && (
                <span
                  className="font-mono text-[9px] tracking-[0.14em] uppercase px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(0,255,195,0.06)",
                    border: "0.5px solid rgba(0,255,195,0.25)",
                    color: "var(--verdict-neon)",
                  }}
                >
                  BYOK Active
                </span>
              )}
            </div>

            {/* Usage bar */}
            <div>
              <div
                className="flex justify-between font-mono text-[10px] tracking-[0.1em] mb-1.5"
                style={{ color: "var(--fg-quaternary)" }}
              >
                <span>AI USAGE THIS MONTH</span>
                <span>${usdSpent.toFixed(4)} / ${usdBudget}</span>
              </div>
              <div
                className="h-1 rounded-full"
                style={{ background: "rgba(224,224,224,0.06)" }}
              >
                <div
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: barColor,
                    boxShadow: `0 0 6px ${barColor}`,
                  }}
                />
              </div>
              {pct >= 80 && (
                <p
                  className="font-mono text-[10px] tracking-[0.1em] mt-1.5"
                  style={{ color: barColor }}
                >
                  {pct >= 100 ? "BUDGET EXHAUSTED — upgrade to continue." : "APPROACHING MONTHLY LIMIT."}
                </p>
              )}
            </div>

            <div
              className="mt-4 font-mono text-[10px] tracking-[0.1em]"
              style={{ color: "var(--fg-quaternary)" }}
            >
              {monthly?.total_requests ?? 0} AI REQUESTS THIS MONTH
            </div>
          </div>

          {/* Recent usage events */}
          <div>
            <h2
              className="font-serif text-base font-semibold mb-3 tracking-tight"
              style={{ color: "var(--fg-primary)" }}
            >
              Recent AI Calls
            </h2>
            {events.length === 0 ? (
              <p
                className="font-mono text-[10px] tracking-[0.14em] uppercase"
                style={{ color: "var(--fg-quaternary)" }}
              >
                No usage recorded yet.
              </p>
            ) : (
              <div
                className="rounded overflow-hidden"
                style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      {["Tool", "Model", "Cost (USD)", "Time"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left font-mono text-[9px] tracking-[0.14em] uppercase"
                          style={{ color: "var(--fg-quaternary)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr
                        key={i}
                        style={{
                          borderTop: "0.5px solid rgba(224,224,224,0.06)",
                          color: "var(--fg-secondary)",
                        }}
                      >
                        <td className="px-4 py-2 capitalize text-[13px]">{e.tool_name}</td>
                        <td className="px-4 py-2 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{e.model}</td>
                        <td className="px-4 py-2 font-mono text-[10px]" style={{ color: "var(--verdict-neon)" }}>${Number(e.usd_cost).toFixed(6)}</td>
                        <td className="px-4 py-2 font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>
                          {new Date(e.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <a href="/settings/billing" className="lex-btn lex-btn--primary">
              MANAGE PLAN
            </a>
            <a href="/settings/api-key" className="lex-btn lex-btn--secondary">
              BYOK KEY SETTINGS
            </a>
          </div>
        </>
      )}
    </div>
  );
}
