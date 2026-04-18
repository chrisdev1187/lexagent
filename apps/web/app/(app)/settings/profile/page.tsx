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

const PLAN_COLORS: Record<string, string> = {
  starter: "#6B7280",
  professional: "#10B981",
  firm: "#F59E0B",
  premium: "#8B5CF6",
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
        supabase
          .from("user_roles")
          .select("plan_id, byok_active, plans(id, name, usd_budget)")
          .eq("user_id", user!.id)
          .single(),
        supabase
          .from("usage_monthly")
          .select("total_usd_cost, total_requests")
          .eq("user_id", user!.id)
          .eq("year", now.getFullYear())
          .eq("month", now.getMonth() + 1)
          .single(),
        supabase
          .from("usage_events")
          .select("tool_name, model, usd_cost, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (roleRes.data) {
        setRole(roleRes.data as UserRole);
        setPlan((roleRes.data as any).plans as Plan);
      }
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
  const barColor = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#10B981";

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-serif" style={{ color: "var(--text)" }}>Profile &amp; Usage</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{user.email}</p>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <>
          {/* Plan badge */}
          <div className="rounded-xl p-6" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Current Plan</p>
                <p className="text-xl font-semibold" style={{ color: PLAN_COLORS[role?.plan_id ?? "starter"] ?? "var(--text)" }}>
                  {plan?.name ?? role?.plan_id ?? "Starter"}
                </p>
              </div>
              {role?.byok_active && (
                <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--panel)", color: "var(--emerald)" }}>
                  BYOK Active
                </span>
              )}
            </div>

            {/* Usage bar */}
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <span>AI Usage this month</span>
                <span>${usdSpent.toFixed(4)} / ${usdBudget}</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "var(--panel)" }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
              {pct >= 80 && (
                <p className="text-xs mt-1" style={{ color: barColor }}>
                  {pct >= 100 ? "Budget exhausted — upgrade to continue at full speed." : "Approaching monthly limit."}
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
              <span>{monthly?.total_requests ?? 0} AI requests this month</span>
            </div>
          </div>

          {/* Recent usage events */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Recent AI Calls</h2>
            {events.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No usage recorded yet.</p>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--panel)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--surface)" }}>
                      {["Tool", "Model", "Cost (USD)", "Time"].map((h) => (
                        <th key={h} className="px-4 py-2 text-left font-normal text-xs" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--panel)", color: "var(--text)" }}>
                        <td className="px-4 py-2 capitalize">{e.tool_name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{e.model}</td>
                        <td className="px-4 py-2 font-mono text-xs">${Number(e.usd_cost).toFixed(6)}</td>
                        <td className="px-4 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
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
            <a
              href="/settings/billing"
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--emerald)", color: "#000" }}
            >
              Manage Plan
            </a>
            <a
              href="/settings/api-key"
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--panel)" }}
            >
              BYOK Key Settings
            </a>
          </div>
        </>
      )}
    </div>
  );
}
