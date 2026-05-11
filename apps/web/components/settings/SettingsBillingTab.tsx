"use client";

import { useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { getApiHeaders } from "@/lib/api";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { PLAN_COLOR } from "@/lib/settings";

interface UserRole { plan_id: string; byok_active: boolean; byok_key?: string | null; }
interface Plan { id: string; name: string; usd_budget: number; }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function SettingsBillingTab({ role, plan, loading }: { role: UserRole | null; plan: Plan | null; loading: boolean }) {
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/billing/portal`, { method: "GET", headers: getApiHeaders() });
      const data = await res.json() as { url?: string };
      if (data.url) window.open(data.url, "_blank", "noopener");
    } catch { /* silent */ } finally { setPortalLoading(false); }
  };

  if (loading) return <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading variant="settings">CURRENT PLAN</SectionHeading>
        <div className="flex items-end justify-between">
          <p className="font-serif text-3xl font-normal" style={{ color: PLAN_COLOR[role?.plan_id ?? "starter"] ?? "var(--fg-primary)", letterSpacing: "-0.02em" }}>
            {plan?.name ?? role?.plan_id ?? "Starter"}
          </p>
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.14em] uppercase mb-0.5" style={{ color: "var(--fg-quaternary)" }}>Monthly credits</p>
            <p className="font-serif text-2xl" style={{ color: "var(--fg-primary)", letterSpacing: "-0.02em" }}>{(plan as any)?.credits_monthly ?? "—"}</p>
          </div>
        </div>
        {role?.byok_active && (
          <div className="flex items-center gap-2 rounded px-3 py-2 mt-4 text-xs font-mono tracking-wide" style={{ background: "rgba(0,255,195,0.05)", border: "0.5px solid rgba(0,255,195,0.22)", color: "var(--verdict-neon)" }}>
            BYOK Active — Anthropic bills you directly for AI usage
          </div>
        )}
      </div>

      <div className="rounded-lg p-6 space-y-4" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div>
          <SectionHeading variant="settings">PAYMENT & INVOICES</SectionHeading>
          <p className="text-[13px]" style={{ color: "var(--fg-tertiary)", lineHeight: 1.65 }}>
            Manage your payment method, download invoices, and cancel your subscription through the billing portal.
          </p>
        </div>
        <button onClick={openPortal} disabled={portalLoading} className="lex-btn lex-btn--secondary">
          <CreditCard size={13} />
          {portalLoading ? "Opening…" : "Open Billing Portal"}
          <ExternalLink size={11} />
        </button>
      </div>

      {(role?.plan_id === "starter" || role?.plan_id === "professional") && (
        <div className="rounded-lg p-6" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.18)" }}>
          <SectionHeading variant="settings">UPGRADE YOUR PLAN</SectionHeading>
          <p className="text-[13px] mb-4" style={{ color: "var(--fg-tertiary)", lineHeight: 1.65 }}>Get more AI budget, additional matters, and premium features.</p>
          <a href="/pricing" className="lex-btn lex-btn--primary">View Plans</a>
        </div>
      )}

      {role?.byok_active && (
        <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <SectionHeading variant="settings">AI CREDITS TOP-UP</SectionHeading>
          <p className="text-[13px] mb-4" style={{ color: "var(--fg-tertiary)", lineHeight: 1.65 }}>
            Purchase additional AI credits through LexAgent to use alongside your BYOK key.
          </p>
          <button disabled className="lex-btn lex-btn--secondary" title="Coming soon">
            <CreditCard size={13} />
            Buy Credits
            <span className="ml-1 font-mono text-[9px] tracking-[0.12em] uppercase opacity-60">COMING SOON</span>
          </button>
        </div>
      )}
    </div>
  );
}
