"use client";

import { useState, useEffect } from "react";
import { PLAN_DETAILS } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

export function AdminBillingTab() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<{ spent: number; budget: number; plan_id: string; requests: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    Promise.all([
      supabase.from("user_roles").select("plan_id, plans(usd_budget)").eq("user_id", user.id).single(),
      supabase.from("usage_monthly")
        .select("total_usd_cost, total_requests")
        .eq("user_id", user.id)
        .eq("year", now.getFullYear())
        .eq("month", now.getMonth() + 1)
        .single(),
    ]).then(([roleRes, usageRes]) => {
      const plan_id = roleRes.data?.plan_id ?? "starter";
      const budget = Number((roleRes.data?.plans as any)?.usd_budget ?? 8);
      const spent = Number(usageRes.data?.total_usd_cost ?? 0);
      const requests = Number(usageRes.data?.total_requests ?? 0);
      setData({ spent, budget, plan_id, requests });
      setLoading(false);
    });
  }, [user]);

  if (loading) return <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>;
  if (!data) return null;

  const pct = data.budget > 0 ? Math.min((data.spent / data.budget) * 100, 100) : 0;
  const barColor = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";
  const plan = PLAN_DETAILS[data.plan_id] ?? PLAN_DETAILS.starter;

  return (
    <div>
      <SectionHeading>CURRENT PLAN</SectionHeading>
      <div className="rounded p-4 mb-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--fg-primary)" }}>{plan.name}</p>
            {plan.price_usd && (
              <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>${plan.price_usd}/mo</p>
            )}
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.28)" }}>
            Active
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan.features.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(17,17,20,0.7)", color: "var(--fg-secondary)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
              {f}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--fg-tertiary)" }}>
          {plan.matter_limit && <span>Up to {plan.matter_limit} matters</span>}
          {plan.seat_limit && <span>Up to {plan.seat_limit} seat{plan.seat_limit > 1 ? "s" : ""}</span>}
        </div>
      </div>

      <SectionHeading>AI USAGE — THIS MONTH</SectionHeading>
      <div className="rounded p-4 mb-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-end justify-between mb-2">
          <div>
            {isAdmin ? (
              <p className="text-lg font-mono font-semibold" style={{ color: "var(--fg-primary)" }}>
                ${data.spent.toFixed(4)}
                <span className="text-sm font-normal ml-1" style={{ color: "var(--fg-tertiary)" }}>/ ${data.budget}</span>
              </p>
            ) : (
              <p className="text-lg font-mono font-semibold" style={{ color: "var(--fg-primary)" }}>
                {Math.round(pct)}%
                <span className="text-sm font-normal ml-1" style={{ color: "var(--fg-tertiary)" }}>of monthly quota</span>
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{data.requests} AI request{data.requests !== 1 ? "s" : ""}</p>
          </div>
          <span className="text-xs font-mono" style={{ color: barColor }}>{Math.round(pct)}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(17,17,20,0.7)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>

      {data.plan_id !== "premium" && (
        <div className="rounded p-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.28)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--verdict-neon)" }}>Upgrade your plan</p>
          <p className="text-xs mb-3" style={{ color: "var(--fg-secondary)" }}>
            Get more matters, seats, and AI quota with a higher plan.
          </p>
          <a
            href="mailto:sales@lexagent.ai?subject=Upgrade%20Request"
            className="lex-btn lex-btn--primary"
          >
            Contact Sales
          </a>
        </div>
      )}
    </div>
  );
}
