"use client";

import { useState } from "react";
import { useRegion, formatPrice } from "@/providers/region-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface Plan {
  id: string;
  name: string;
  tagline: string;
  zar: number;
  gbp: number;
  usd: number;
  budget: string;
  matterLimit: string;
  seats: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  isPremium?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo practitioners getting started",
    zar: 800, gbp: 35, usd: 45,
    budget: "$8/mo AI budget",
    matterLimit: "10 matters",
    seats: "1 seat",
    features: [
      "Legal research (Claude Sonnet 4.6)",
      "Document drafting",
      "Citation verification",
      "10 active matters",
      "Email support",
    ],
    cta: "Get Started",
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Growing law practices",
    zar: 1600, gbp: 75, usd: 95,
    budget: "$20/mo AI budget",
    matterLimit: "25 matters",
    seats: "Up to 3 seats",
    features: [
      "Everything in Starter",
      "Case strategy generation",
      "Judge intelligence profiles",
      "25 active matters",
      "Priority email support",
      "Usage analytics dashboard",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    id: "firm",
    name: "Firm",
    tagline: "Established firms and teams",
    zar: 3500, gbp: 160, usd: 200,
    budget: "$35/mo AI budget",
    matterLimit: "60 matters",
    seats: "Up to 10 seats",
    features: [
      "Everything in Professional",
      "Conflict of interest checker",
      "Timeline builder",
      "60 active matters across all seats",
      "Dedicated Slack channel",
      "Quarterly strategy review",
    ],
    cta: "Contact Sales",
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Mission-critical legal operations",
    zar: 0, gbp: 2000, usd: 2000,
    budget: "$150/mo AI budget",
    matterLimit: "Unlimited matters",
    seats: "Unlimited seats",
    features: [
      "Everything in Firm",
      "Custom feature development",
      "Custom API integrations",
      "Personal onboarding & training",
      "CEO-level dedicated support",
      "SLA guarantee",
    ],
    cta: "Book a Demo",
    isPremium: true,
  },
];

const inputStyle = {
  background: "rgba(255,255,255,0.03)",
  color: "var(--fg-primary)",
  border: "0.5px solid rgba(224,224,224,0.10)",
  outline: "none",
};

export default function PricingPage() {
  const region = useRegion();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadForm, setLeadForm] = useState({ email: "", full_name: "", firm: "", message: "" });
  const [loading, setLoading] = useState<string | null>(null);

  function getPrice(plan: Plan): number {
    if (region.currency === "ZAR") return plan.zar;
    if (region.currency === "GBP") return plan.gbp;
    return plan.usd;
  }

  async function handleCTA(plan: Plan) {
    if (plan.isPremium) { setShowLeadForm(true); return; }
    setLoading(plan.id);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("sb-token") : null;
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      // silently fail
    } finally {
      setLoading(null);
    }
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`${API_URL}/api/billing/premium-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadForm),
    });
    setLeadSubmitted(true);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--midnight-court)" }}>
      {/* Header */}
      <div className="text-center py-20 px-4">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--verdict-neon)" }}>
          Transparent pricing
        </p>
        <h1 className="font-serif text-5xl font-semibold tracking-tight mb-4" style={{ color: "var(--fg-primary)" }}>
          Legal AI that pays for itself
        </h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--fg-tertiary)" }}>
          Powered by Claude Sonnet 4.6. All plans include the same frontier model — higher tiers unlock more usage and features.
        </p>
        {region.currency !== "USD" && (
          <p className="font-mono text-[10px] tracking-[0.1em] uppercase mt-3" style={{ color: "var(--fg-quaternary)" }}>
            Prices shown in {region.currency} ({region.region})
          </p>
        )}
      </div>

      {/* Plans grid */}
      <div className="max-w-7xl mx-auto px-4 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="rounded p-6 flex flex-col"
            style={{
              background: plan.highlighted ? "rgba(0,255,195,0.06)" : "rgba(17,17,20,0.7)",
              border: plan.highlighted ? "0.5px solid rgba(0,255,195,0.35)" : "0.5px solid rgba(224,224,224,0.09)",
              boxShadow: plan.highlighted ? "0 0 30px rgba(0,255,195,0.08)" : "none",
            }}
          >
            <div className="mb-5">
              <p className="font-mono text-[9px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "var(--fg-quaternary)" }}>
                {plan.tagline}
              </p>
              <h2 className="font-serif text-2xl font-semibold" style={{ color: plan.highlighted ? "var(--verdict-neon)" : "var(--fg-primary)" }}>
                {plan.name}
              </h2>
            </div>

            <div className="mb-6">
              {plan.isPremium ? (
                <p className="font-serif text-3xl font-semibold" style={{ color: "var(--verdict-violet)" }}>Custom</p>
              ) : (
                <>
                  <p className="font-serif text-4xl font-semibold" style={{ color: "var(--fg-primary)" }}>
                    {formatPrice(getPrice(plan), region)}
                    <span className="text-sm font-normal ml-1" style={{ color: "var(--fg-quaternary)" }}>/seat/mo</span>
                  </p>
                  {region.currency !== "USD" && (
                    <p className="font-mono text-[10px] mt-1" style={{ color: "var(--fg-quaternary)" }}>${plan.usd} USD/seat/mo</p>
                  )}
                </>
              )}
              <p className="font-mono text-[10px] tracking-[0.08em] mt-2" style={{ color: "var(--fg-quaternary)" }}>
                {plan.budget} · {plan.matterLimit} · {plan.seats}
              </p>
            </div>

            <ul className="space-y-2 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--fg-secondary)" }}>
                  <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--verdict-neon)" }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCTA(plan)}
              disabled={loading === plan.id}
              className={`w-full justify-center lex-btn ${plan.highlighted ? "lex-btn--primary" : "lex-btn--secondary"}`}
            >
              {loading === plan.id ? "Loading…" : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Premium lead modal */}
      {showLeadForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={() => !leadSubmitted && setShowLeadForm(false)}
        >
          <div
            className="rounded p-8 max-w-md w-full"
            style={{
              background: "rgba(17,17,20,0.92)",
              border: "0.5px solid rgba(224,224,224,0.12)",
              boxShadow: "0 0 40px rgba(0,255,195,0.06)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {leadSubmitted ? (
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(0,255,195,0.08)", border: "0.5px solid rgba(0,255,195,0.28)" }}
                >
                  <span style={{ color: "var(--verdict-neon)", fontSize: 20 }}>✓</span>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>Request received</h3>
                <p className="text-[13px]" style={{ color: "var(--fg-tertiary)" }}>
                  We'll be in touch within 24 hours to schedule a call.
                </p>
                <button
                  className="lex-btn lex-btn--primary mt-6"
                  onClick={() => setShowLeadForm(false)}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submitLead} className="space-y-4">
                <div>
                  <h3 className="font-serif text-xl font-semibold" style={{ color: "var(--fg-primary)" }}>Book a Premium Demo</h3>
                  <p className="text-[12px] mt-1" style={{ color: "var(--fg-quaternary)" }}>
                    Premium is limited to 1 new client per month. Tell us about your firm.
                  </p>
                </div>
                {[
                  { field: "email", label: "Email", required: true, type: "email" },
                  { field: "full_name", label: "Full Name", required: false, type: "text" },
                  { field: "firm", label: "Firm / Organisation", required: false, type: "text" },
                ].map(({ field, label, required, type }) => (
                  <div key={field}>
                    <label className="block font-mono text-[9px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "var(--fg-quaternary)" }}>{label}</label>
                    <input
                      type={type}
                      required={required}
                      value={leadForm[field as keyof typeof leadForm]}
                      onChange={(e) => setLeadForm((p) => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2 rounded text-[13px] lex-focus"
                      style={inputStyle}
                    />
                  </div>
                ))}
                <div>
                  <label className="block font-mono text-[9px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "var(--fg-quaternary)" }}>Message (optional)</label>
                  <textarea
                    rows={3}
                    value={leadForm.message}
                    onChange={(e) => setLeadForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full px-3 py-2 rounded text-[13px] resize-none lex-focus"
                    style={inputStyle}
                  />
                </div>
                <button
                  type="submit"
                  className="lex-btn lex-btn--primary w-full justify-center"
                >
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
