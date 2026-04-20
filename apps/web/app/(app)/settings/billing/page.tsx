"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRegion, formatPrice } from "@/providers/region-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface Subscription {
  plan_id: string;
  status: string;
  current_period_end: string | null;
  ls_subscription_id: string | null;
}

interface Plan {
  id: string;
  name: string;
  usd_budget: number;
  price_zar: number;
  price_gbp: number;
  price_usd: number;
  features: string[];
}

const PLAN_ORDER = ["starter", "professional", "firm", "premium"];

export default function BillingPage() {
  const { user } = useAuth();
  const region = useRegion();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string>("starter");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [subRes, plansRes, roleRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan_id, status, current_period_end, ls_subscription_id")
          .eq("user_id", user!.id)
          .eq("status", "active")
          .single(),
        supabase.from("plans").select("*").order("price_usd", { ascending: true }),
        supabase.from("user_roles").select("plan_id").eq("user_id", user!.id).single(),
      ]);
      if (subRes.data) setSub(subRes.data as Subscription);
      if (plansRes.data) setPlans(plansRes.data as Plan[]);
      if (roleRes.data) setCurrentPlanId(roleRes.data.plan_id);
      setLoading(false);
    }
    load();
  }, [user]);

  function getPrice(plan: Plan): number {
    if (region.currency === "ZAR") return plan.price_zar;
    if (region.currency === "GBP") return plan.price_gbp;
    return plan.price_usd;
  }

  async function handleCheckout(planId: string) {
    if (planId === "premium") {
      window.location.href = "/pricing#premium";
      return;
    }
    setCheckoutLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/billing/portal`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json() as { url?: string };
      if (data.url) window.open(data.url, "_blank");
    } finally {
      setPortalLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--verdict-neon)" }}>▸</span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mt-1" style={{ color: "var(--fg-primary)" }}>Billing &amp; Plan</h1>
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>Manage your subscription</p>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <>
          {/* Current subscription */}
          {sub && (
            <div className="rounded p-6" style={{ background: "rgba(17,17,20,0.7)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Active Subscription</p>
                  <p className="text-lg font-semibold capitalize" style={{ color: "var(--text)" }}>{sub.plan_id}</p>
                  {sub.current_period_end && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Renews {new Date(sub.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {sub.ls_subscription_id && (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="px-4 py-2 rounded text-sm"
                    style={{ background: "var(--panel)", color: "var(--text)", border: "0.5px solid rgba(224,224,224,0.10)" }}
                  >
                    {portalLoading ? "Loading…" : "Manage Billing"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Plan comparison */}
          <div>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans
                .sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id))
                .map((plan) => {
                  const isCurrent = plan.id === currentPlanId;
                  const isUpgrade = PLAN_ORDER.indexOf(plan.id) > PLAN_ORDER.indexOf(currentPlanId);
                  return (
                    <div
                      key={plan.id}
                      className="rounded p-5"
                      style={{
                        background: isCurrent ? "rgba(0,255,195,0.07)" : "rgba(17,17,20,0.7)",
                        border: isCurrent ? "0.5px solid rgba(0,255,195,0.35)" : "0.5px solid rgba(224,224,224,0.09)",
                        boxShadow: isCurrent ? "0 0 20px rgba(0,255,195,0.08)" : "none",
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{plan.name}</p>
                          <p className="text-sm opacity-70">
                            {plan.id === "premium" ? "Custom pricing" : `${formatPrice(getPrice(plan), region)}/seat/mo`}
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="font-mono text-[9px] tracking-[0.14em] uppercase px-2 py-0.5 rounded" style={{ background: "rgba(0,255,195,0.12)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.3)" }}>
                            Active
                          </span>
                        )}
                      </div>
                      <ul className="text-xs space-y-1 mb-4 opacity-80">
                        {plan.features.slice(0, 3).map((f) => (
                          <li key={f}>✓ {f}</li>
                        ))}
                      </ul>
                      {!isCurrent && (
                        <button
                          onClick={() => handleCheckout(plan.id)}
                          disabled={checkoutLoading === plan.id}
                          className="w-full py-2 rounded text-sm font-semibold"
                          style={{ background: "var(--verdict-neon)", color: "var(--midnight-court)", border: "none" }}
                        >
                          {checkoutLoading === plan.id ? "Loading…" : isUpgrade ? "Upgrade" : "Switch"}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
