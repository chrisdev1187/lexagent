"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getApiHeaders } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { CreditCard, ExternalLink } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface Plan {
  id: string;
  name: string;
  usd_budget: number;
}

interface UserRole {
  plan_id: string;
  byok_active: boolean;
}

const PLAN_COLOR: Record<string, string> = {
  starter:      "var(--fg-tertiary)",
  professional: "var(--verdict-neon)",
  firm:         "var(--verdict-amber)",
  premium:      "var(--verdict-violet)",
};

export default function BillingSettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [role, setRole] = useState<UserRole | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated — welcome aboard!");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("plan_id, byok_active, plans(id, name, usd_budget)")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setRole(data as UserRole);
          setPlan((data as any).plans as Plan);
        }
        setLoading(false);
      });
  }, [user]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/billing/portal`, {
        method: "GET",
        headers: getApiHeaders(),
      });
      const data = await res.json() as { url?: string };
      if (data.url) window.open(data.url, "_blank", "noopener");
    } catch {
      // silently fail
    } finally {
      setPortalLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--verdict-neon)" }}>▸</span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mt-1" style={{ color: "var(--fg-primary)" }}>
          Billing &amp; Plan
        </h1>
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>
          Manage your subscription and payment details
        </p>
      </div>

      {loading ? (
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
          Loading…
        </p>
      ) : (
        <>
          {/* Current plan */}
          <div
            className="rounded p-5"
            style={{
              background: "rgba(17,17,20,0.7)",
              border: "0.5px solid rgba(224,224,224,0.09)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>
                  Current Plan
                </p>
                <p
                  className="font-serif text-2xl font-semibold"
                  style={{ color: PLAN_COLOR[role?.plan_id ?? "starter"] ?? "var(--fg-primary)" }}
                >
                  {plan?.name ?? role?.plan_id ?? "Starter"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] tracking-[0.12em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>
                  Monthly AI budget
                </p>
                <p className="font-serif text-xl font-semibold" style={{ color: "var(--fg-primary)" }}>
                  ${plan?.usd_budget ?? 8}
                </p>
              </div>
            </div>

            {role?.byok_active && (
              <div
                className="flex items-center gap-2 rounded px-3 py-2 text-xs font-mono tracking-wide mt-2"
                style={{
                  background: "rgba(0,255,195,0.05)",
                  border: "0.5px solid rgba(0,255,195,0.22)",
                  color: "var(--verdict-neon)",
                }}
              >
                BYOK Active — Anthropic bills you directly for AI usage
              </div>
            )}
          </div>

          {/* Billing portal */}
          <div
            className="rounded p-5 space-y-3"
            style={{
              background: "rgba(17,17,20,0.7)",
              border: "0.5px solid rgba(224,224,224,0.09)",
            }}
          >
            <div>
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>
                Payment &amp; Invoices
              </p>
              <p className="text-[13px]" style={{ color: "var(--fg-tertiary)" }}>
                Manage your payment method, download invoices, and cancel your subscription through the Lemon Squeezy billing portal.
              </p>
            </div>
            <button onClick={openPortal} disabled={portalLoading} className="lex-btn lex-btn--secondary">
              <CreditCard size={13} />
              {portalLoading ? "Opening…" : "Open Billing Portal"}
              <ExternalLink size={11} />
            </button>
          </div>

          {/* Upgrade CTA */}
          {(role?.plan_id === "starter" || role?.plan_id === "professional") && (
            <div
              className="rounded p-5"
              style={{
                background: "rgba(0,255,195,0.04)",
                border: "0.5px solid rgba(0,255,195,0.18)",
              }}
            >
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--verdict-neon)" }}>
                Upgrade your plan
              </p>
              <p className="text-[13px] mb-4" style={{ color: "var(--fg-tertiary)" }}>
                Get more AI budget, additional matters, and premium features.
              </p>
              <a href="/pricing" className="lex-btn lex-btn--primary">
                View Plans
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
