"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getApiHeaders } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { CreditCard, ExternalLink, User } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface UserRole { plan_id: string; byok_active: boolean; byok_key?: string | null; }
interface Plan { id: string; name: string; usd_budget: number; }
interface UsageMonthly { total_usd_cost: number; total_requests: number; }
interface UsageEvent { tool_name: string; model: string; usd_cost: number; created_at: string; }

const PLAN_COLOR: Record<string, string> = {
  starter:      "var(--fg-tertiary)",
  professional: "var(--verdict-neon)",
  firm:         "var(--verdict-amber)",
  premium:      "var(--verdict-violet)",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type Tab = "profile" | "billing" | "api-key";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile",  label: "Profile & Usage" },
  { id: "billing",  label: "Billing & Plan" },
  { id: "api-key",  label: "API Key (BYOK)" },
];

/* ── Profile tab ───────────────────────────────────────────────────────── */
function ProfileTab({
  user, role, plan, monthly, events, loading,
}: {
  user: { email?: string };
  role: UserRole | null;
  plan: Plan | null;
  monthly: UsageMonthly | null;
  events: UsageEvent[];
  loading: boolean;
}) {
  const usdSpent = monthly?.total_usd_cost ?? 0;
  const usdBudget = plan?.usd_budget ?? 8;
  const pct = Math.min((usdSpent / usdBudget) * 100, 100);
  const barColor = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";

  return (
    <div className="space-y-6">
      <div
        className="rounded p-5"
        style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,195,0.15), rgba(106,0,255,0.15))",
              border: "0.5px solid rgba(0,255,195,0.2)",
            }}
          >
            <User size={14} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <div>
            <p className="text-[13px]" style={{ color: "var(--fg-primary)" }}>{user.email}</p>
            <p className="font-mono text-[10px] tracking-[0.12em] uppercase mt-0.5" style={{ color: "var(--fg-quaternary)" }}>
              {plan?.name ?? role?.plan_id ?? "Starter"} plan
            </p>
          </div>
          {role?.byok_active && (
            <span
              className="ml-auto font-mono text-[9px] tracking-[0.14em] uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.25)", color: "var(--verdict-neon)" }}
            >
              BYOK Active
            </span>
          )}
        </div>

        {!loading && (
          <div>
            <div
              className="flex justify-between font-mono text-[10px] tracking-[0.1em] mb-1.5"
              style={{ color: "var(--fg-quaternary)" }}
            >
              <span>AI USAGE THIS MONTH</span>
              <span>${usdSpent.toFixed(4)} / ${usdBudget}</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: "rgba(224,224,224,0.06)" }}>
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}` }}
              />
            </div>
            {pct >= 80 && (
              <p className="font-mono text-[10px] tracking-[0.1em] mt-1.5" style={{ color: barColor }}>
                {pct >= 100 ? "BUDGET EXHAUSTED — upgrade to continue." : "APPROACHING MONTHLY LIMIT."}
              </p>
            )}
            <div className="mt-3 font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
              {monthly?.total_requests ?? 0} AI REQUESTS THIS MONTH
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <div>
          <h2 className="font-serif text-base font-semibold mb-3 tracking-tight" style={{ color: "var(--fg-primary)" }}>
            Recent AI Calls
          </h2>
          {events.length === 0 ? (
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              No usage recorded yet.
            </p>
          ) : (
            <div className="rounded overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Tool", "Model", "Cost (USD)", "Time"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i} style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)", color: "var(--fg-secondary)" }}>
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
      )}
    </div>
  );
}

/* ── Billing tab ───────────────────────────────────────────────────────── */
function BillingTab({ role, plan, loading }: { role: UserRole | null; plan: Plan | null; loading: boolean }) {
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
      <div className="rounded p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Current Plan</p>
            <p className="font-serif text-2xl font-semibold" style={{ color: PLAN_COLOR[role?.plan_id ?? "starter"] ?? "var(--fg-primary)" }}>
              {plan?.name ?? role?.plan_id ?? "Starter"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.12em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Monthly AI budget</p>
            <p className="font-serif text-xl font-semibold" style={{ color: "var(--fg-primary)" }}>${plan?.usd_budget ?? 8}</p>
          </div>
        </div>
        {role?.byok_active && (
          <div
            className="flex items-center gap-2 rounded px-3 py-2 text-xs font-mono tracking-wide"
            style={{ background: "rgba(0,255,195,0.05)", border: "0.5px solid rgba(0,255,195,0.22)", color: "var(--verdict-neon)" }}
          >
            BYOK Active — Anthropic bills you directly for AI usage
          </div>
        )}
      </div>

      <div className="rounded p-5 space-y-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Payment &amp; Invoices</p>
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

      {(role?.plan_id === "starter" || role?.plan_id === "professional") && (
        <div className="rounded p-5" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.18)" }}>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--verdict-neon)" }}>Upgrade your plan</p>
          <p className="text-[13px] mb-4" style={{ color: "var(--fg-tertiary)" }}>
            Get more AI budget, additional matters, and premium features.
          </p>
          <a href="/pricing" className="lex-btn lex-btn--primary">View Plans</a>
        </div>
      )}
    </div>
  );
}

/* ── API Key tab ───────────────────────────────────────────────────────── */
function ApiKeyTab({ user, loading: outerLoading }: { user: { id: string }; loading: boolean }) {
  const [byokActive, setByokActive] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("user_roles")
      .select("byok_active, byok_key")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) { setByokActive(!!data.byok_active); setHasKey(!!data.byok_key); }
        setLoading(false);
      });
  }, [user.id]);

  async function saveKey() {
    if (!keyInput.trim()) return;
    setSaving(true);
    await supabase.from("user_roles").update({ byok_key: keyInput.trim(), byok_active: true }).eq("user_id", user.id);
    setHasKey(true); setByokActive(true); setKeyInput(""); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function toggleByok() {
    const next = !byokActive;
    await supabase.from("user_roles").update({ byok_active: next }).eq("user_id", user.id);
    setByokActive(next);
  }

  async function removeKey() {
    await supabase.from("user_roles").update({ byok_key: null, byok_active: false }).eq("user_id", user.id);
    setHasKey(false); setByokActive(false);
  }

  if (loading || outerLoading) return <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>BYOK Status</p>
            <p className="text-[13px] font-medium" style={{ color: byokActive ? "var(--verdict-neon)" : "var(--fg-secondary)" }}>
              {byokActive ? "Active — your key is being used" : "Inactive — using LexAgent shared key"}
            </p>
          </div>
          {hasKey && (
            <button
              onClick={toggleByok}
              className="relative inline-flex items-center h-5 rounded-full w-9 transition-colors cursor-pointer"
              style={{
                background: byokActive ? "var(--verdict-neon)" : "rgba(255,255,255,0.08)",
                border: `0.5px solid ${byokActive ? "rgba(0,255,195,0.4)" : "rgba(224,224,224,0.12)"}`,
              }}
            >
              <span
                className="inline-block w-3.5 h-3.5 rounded-full transition-transform"
                style={{
                  background: byokActive ? "var(--midnight-court)" : "var(--fg-tertiary)",
                  transform: byokActive ? "translateX(18px)" : "translateX(2px)",
                }}
              />
            </button>
          )}
        </div>
      </div>

      <div className="rounded p-5 space-y-4" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>
            {hasKey ? "Replace API Key" : "Add API Key"}
          </p>
          {hasKey && <p className="text-[12px]" style={{ color: "var(--fg-tertiary)" }}>A key is stored. Enter a new one to replace it.</p>}
        </div>
        <div className="flex gap-3">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded text-[13px] font-mono lex-focus"
            style={{ background: "rgba(255,255,255,0.03)", color: "var(--fg-primary)", border: "0.5px solid rgba(224,224,224,0.10)", outline: "none" }}
          />
          <button onClick={saveKey} disabled={saving || !keyInput.trim()} className="lex-btn lex-btn--primary">
            {saving ? "SAVING…" : saved ? "SAVED ✓" : "SAVE"}
          </button>
        </div>
        {hasKey && (
          <button onClick={removeKey} className="lex-btn lex-btn--danger">
            Remove key and disable BYOK
          </button>
        )}
      </div>

      <div className="rounded p-5 space-y-2" style={{ background: "rgba(255,255,255,0.015)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
        {[
          "Your key is stored encrypted and never logged.",
          "Anthropic bills you directly for all usage when BYOK is active.",
          "Your LexAgent plan limits (matter count, features) still apply.",
          "Disable BYOK at any time to revert to shared key billing.",
        ].map((line, i) => (
          <p key={i} className="text-[12px] flex gap-2" style={{ color: "var(--fg-tertiary)" }}>
            <span style={{ color: "var(--verdict-neon)" }}>·</span>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ── Inner component (needs useSearchParams) ───────────────────────────── */
function SettingsInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialTab = (searchParams.get("tab") as Tab | null) ?? "profile";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const [role, setRole] = useState<UserRole | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [monthly, setMonthly] = useState<UsageMonthly | null>(null);
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated — welcome aboard!");
      setActiveTab("billing");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--verdict-neon)" }}>▸</span>
            <h1 className="font-serif text-xl font-semibold tracking-tight" style={{ color: "var(--fg-primary)" }}>
              Settings
            </h1>
          </div>
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            {user.email}
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-0.5 mb-6 rounded p-1"
          style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(224,224,224,0.08)" }}
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 px-3 py-2 rounded text-[11px] font-mono tracking-[0.1em] uppercase transition-all duration-150 cursor-pointer"
              style={{
                background: activeTab === id ? "rgba(0,255,195,0.08)" : "transparent",
                border: `0.5px solid ${activeTab === id ? "rgba(0,255,195,0.22)" : "transparent"}`,
                color: activeTab === id ? "var(--verdict-neon)" : "var(--fg-quaternary)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "profile" && (
          <ProfileTab user={user} role={role} plan={plan} monthly={monthly} events={events} loading={loading} />
        )}
        {activeTab === "billing" && (
          <BillingTab role={role} plan={plan} loading={loading} />
        )}
        {activeTab === "api-key" && (
          <ApiKeyTab user={user} loading={loading} />
        )}
      </div>
    </div>
  );
}

/* ── Page export ───────────────────────────────────────────────────────── */
export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
