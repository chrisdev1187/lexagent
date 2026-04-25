"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/providers/settings-provider";
import { supabase } from "@/lib/supabase";
import { getApiHeaders } from "@/lib/api";
import { DEFAULT_SYSTEM } from "@/lib/settings";
import { useToast } from "@/hooks/useToast";
import { LexTooltip } from "@/components/shared/LexTooltip";
import {
  CreditCard, ExternalLink, User, ChevronRight,
  Palette, Cpu, ShieldCheck, FileText, Key,
} from "lucide-react";

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

type Tab = "profile" | "billing" | "api-key" | "ui" | "model" | "shield" | "prompt";

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "profile",  icon: User,        label: "Profile & Usage"     },
  { id: "billing",  icon: CreditCard,  label: "Billing & Plan"      },
  { id: "api-key",  icon: Key,         label: "API Key (BYOK)"      },
  { id: "ui",       icon: Palette,     label: "UI Preferences"      },
  { id: "model",    icon: Cpu,         label: "Model & AI"          },
  { id: "shield",   icon: ShieldCheck, label: "Hallucination Shield" },
  { id: "prompt",   icon: FileText,    label: "System Prompt"       },
];

/* ── Shared helpers ─────────────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] tracking-widest mb-3 mt-6 first:mt-0" style={{ color: "var(--fg-tertiary)" }}>
      {children}
    </h3>
  );
}

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="font-mono text-[11px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>{label}</label>
        {tooltip && (
          <LexTooltip content={tooltip} side="right">
            <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help flex-shrink-0"
              style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}>
              ?
            </span>
          </LexTooltip>
        )}
      </div>
      {children}
    </div>
  );
}

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
      <div className="rounded p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(0,255,195,0.15), rgba(106,0,255,0.15))", border: "0.5px solid rgba(0,255,195,0.2)" }}
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
            <span className="ml-auto font-mono text-[9px] tracking-[0.14em] uppercase px-2.5 py-1 rounded-full" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.25)", color: "var(--verdict-neon)" }}>
              BYOK Active
            </span>
          )}
        </div>

        {!loading && (
          <div>
            <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] mb-1.5" style={{ color: "var(--fg-quaternary)" }}>
              <span>AI USAGE THIS MONTH</span>
              <span>${usdSpent.toFixed(4)} / ${usdBudget}</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: "rgba(224,224,224,0.06)" }}>
              <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}` }} />
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
          <h2 className="font-serif text-base font-semibold mb-3 tracking-tight" style={{ color: "var(--fg-primary)" }}>Recent AI Calls</h2>
          {events.length === 0 ? (
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>No usage recorded yet.</p>
          ) : (
            <div className="rounded overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Tool", "Model", "Cost (USD)", "Time"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i} style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)", color: "var(--fg-secondary)" }}>
                      <td className="px-4 py-2 capitalize text-[13px]">{e.tool_name}</td>
                      <td className="px-4 py-2 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{e.model}</td>
                      <td className="px-4 py-2 font-mono text-[10px]" style={{ color: "var(--verdict-neon)" }}>${Number(e.usd_cost).toFixed(6)}</td>
                      <td className="px-4 py-2 font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>{new Date(e.created_at).toLocaleString()}</td>
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
          <div className="flex items-center gap-2 rounded px-3 py-2 text-xs font-mono tracking-wide" style={{ background: "rgba(0,255,195,0.05)", border: "0.5px solid rgba(0,255,195,0.22)", color: "var(--verdict-neon)" }}>
            BYOK Active — Anthropic bills you directly for AI usage
          </div>
        )}
      </div>

      <div className="rounded p-5 space-y-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Payment &amp; Invoices</p>
          <p className="text-[13px]" style={{ color: "var(--fg-tertiary)" }}>
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
        <div className="rounded p-5" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.18)" }}>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: "var(--verdict-neon)" }}>Upgrade your plan</p>
          <p className="text-[13px] mb-4" style={{ color: "var(--fg-tertiary)" }}>Get more AI budget, additional matters, and premium features.</p>
          <a href="/pricing" className="lex-btn lex-btn--primary">View Plans</a>
        </div>
      )}

      {role?.byok_active && (
        <div className="rounded p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--fg-quaternary)" }}>AI Credits Top-Up</p>
          <p className="text-[13px] mb-3" style={{ color: "var(--fg-tertiary)" }}>
            Purchase additional AI credits through LexAgent to use alongside your BYOK key.
          </p>
          <button
            disabled
            className="lex-btn lex-btn--secondary"
            title="Coming soon"
          >
            <CreditCard size={13} />
            Buy Credits
            <span className="ml-1 font-mono text-[9px] tracking-[0.12em] uppercase opacity-60">COMING SOON</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── API Key (BYOK) tab ─────────────────────────────────────────────────── */
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
              style={{ background: byokActive ? "var(--verdict-neon)" : "rgba(255,255,255,0.08)", border: `0.5px solid ${byokActive ? "rgba(0,255,195,0.4)" : "rgba(224,224,224,0.12)"}` }}
            >
              <span
                className="inline-block w-3.5 h-3.5 rounded-full transition-transform"
                style={{ background: byokActive ? "var(--midnight-court)" : "var(--fg-tertiary)", transform: byokActive ? "translateX(18px)" : "translateX(2px)" }}
              />
            </button>
          )}
        </div>
      </div>

      {/* BYOK progress bar (only when active) */}
      {byokActive && (
        <div className="rounded p-4" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.18)" }}>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--verdict-neon)" }}>BYOK — Anthropic Billing</p>
          <p className="text-[12px] mb-3" style={{ color: "var(--fg-tertiary)" }}>
            Anthropic bills you directly. Your LexAgent plan limits (matters, features) still apply.
          </p>
          <a
            href="https://console.anthropic.com/settings/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="lex-btn lex-btn--secondary"
          >
            <ExternalLink size={11} />
            View Anthropic Usage
          </a>
        </div>
      )}

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
          <button onClick={removeKey} className="lex-btn lex-btn--danger">Remove key and disable BYOK</button>
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

/* ── UI Preferences tab ─────────────────────────────────────────────────── */
function UiTab({ settings, set }: { settings: any; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHeading>INTERFACE PREFERENCES</SectionHeading>
      {[
        { key: "tooltipsEnabled",  label: "Tooltips",          desc: "Show contextual help on hover across the interface",      tooltip: "Disable if you prefer a cleaner workspace after learning the UI" },
        { key: "animationsEnabled", label: "Animations",        desc: "Enable motion transitions and entry animations",           tooltip: "Disable for reduced motion or performance-sensitive environments" },
        { key: "sidebarCollapsed",  label: "Collapsed Sidebar", desc: "Start with the sidebar in icon-only mode",                tooltip: "Saves horizontal space for wider content areas" },
      ].map(item => (
        <div
          key={item.key}
          className="flex items-center justify-between rounded px-4 py-3.5"
          style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
        >
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{item.label}</span>
              <LexTooltip content={item.tooltip} side="right">
                <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}>?</span>
              </LexTooltip>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{item.desc}</p>
          </div>
          <button
            onClick={() => set(item.key, !settings[item.key])}
            className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200"
            style={{ background: settings[item.key] ? "var(--verdict-neon)" : "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
              style={{ background: "var(--fg-primary)", left: settings[item.key] ? "calc(100% - 22px)" : "2px" }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Model & AI tab ─────────────────────────────────────────────────────── */
function ModelTab({ settings, set }: { settings: any; set: (k: string, v: unknown) => void }) {
  return (
    <div>
      <SectionHeading>MODEL CONFIGURATION</SectionHeading>
      <Field label="MODEL" tooltip="Select Claude model — claude-opus-4-7 is most capable, claude-haiku-4-5 is fastest">
        <select
          className="lex-select"
          style={{ cursor: "pointer" }}
          value={settings.model}
          onChange={e => set("model", e.target.value)}
        >
          <option value="auto">Auto (recommended)</option>
          <option value="claude-opus-4-7">claude-opus-4-7 — most capable</option>
          <option value="claude-sonnet-4-6">claude-sonnet-4-6 — balanced</option>
          <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 — fastest</option>
        </select>
      </Field>
      <Field label={`MAX TOKENS: ${settings.maxTokens}`} tooltip="Maximum length of AI responses — higher = more detailed but slower">
        <input
          type="range"
          min={500}
          max={8000}
          step={100}
          value={settings.maxTokens}
          onChange={e => set("maxTokens", Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: "var(--verdict-neon)" }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>500</span>
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>8000</span>
        </div>
      </Field>
      <Field label={`TEMPERATURE: ${settings.temperature?.toFixed(2) ?? "0.70"}`} tooltip="Lower = more precise/deterministic, higher = more creative">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.temperature ?? 0.7}
          onChange={e => set("temperature", Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: "var(--verdict-neon)" }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Precise</span>
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Creative</span>
        </div>
      </Field>
    </div>
  );
}

/* ── Hallucination Shield tab ───────────────────────────────────────────── */
function ShieldTab({ settings, set }: { settings: any; set: (k: string, v: unknown) => void }) {
  return (
    <div>
      <SectionHeading>HALLUCINATION SHIELD</SectionHeading>
      <div className="rounded px-4 py-3.5 mb-4 flex items-center justify-between" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div>
          <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>Auto-Verify Citations</span>
          <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
            Automatically verify all citations against CourtListener after each research query
          </p>
        </div>
        <button
          onClick={() => set("autoVerify", !settings.autoVerify)}
          className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200 ml-4"
          style={{ background: settings.autoVerify ? "var(--verdict-neon)" : "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
            style={{ background: "var(--fg-primary)", left: settings.autoVerify ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>
      <div className="rounded px-4 py-3 text-xs" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.28)", color: "var(--fg-secondary)", lineHeight: 1.7 }}>
        ARES verifies citations against 18M+ CourtListener records. Verified citations are marked with a shield; unverified citations are flagged with a warning. Requires a CourtListener API token (set in Administration).
      </div>
    </div>
  );
}

/* ── System Prompt tab ──────────────────────────────────────────────────── */
function PromptTab({ settings, set }: { settings: any; set: (k: string, v: unknown) => void }) {
  const charCount = (settings.systemPrompt ?? "").length;
  const tokEstimate = Math.round(charCount / 4);
  return (
    <div>
      <SectionHeading>SYSTEM PROMPT — ARES v3.0</SectionHeading>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
          {charCount.toLocaleString()} chars · ~{tokEstimate.toLocaleString()} tokens
        </span>
        <button
          onClick={() => set("systemPrompt", DEFAULT_SYSTEM)}
          className="lex-btn lex-btn--secondary"
          style={{ fontSize: "0.7rem", padding: "4px 10px" }}
        >
          Reset to ARES v3.0
        </button>
      </div>
      <Field label="ACTIVE SYSTEM PROMPT" tooltip="Read-only view of the ARES v3.0 system prompt. Use 'Reset to ARES v3.0' to restore defaults.">
        <textarea
          readOnly
          className="lex-textarea"
          style={{ minHeight: 320, fontFamily: "var(--font-mono)", fontSize: "0.75rem", lineHeight: 1.7, cursor: "default", opacity: 0.85 }}
          value={settings.systemPrompt}
        />
      </Field>
    </div>
  );
}

const ADMIN_ONLY_TABS: Tab[] = ["api-key", "prompt"];

/* ── Inner component ────────────────────────────────────────────────────── */
function SettingsInner() {
  const { user, isAdmin } = useAuth();
  const { settings, updateSettings } = useSettings();
  const searchParams = useSearchParams();
  const toast = useToast();

  const visibleTabs = TABS.filter(t => isAdmin || !ADMIN_ONLY_TABS.includes(t.id));
  const initialTabParam = (searchParams.get("tab") as Tab | null) ?? "profile";
  const initialTab: Tab = (!isAdmin && ADMIN_ONLY_TABS.includes(initialTabParam)) ? "profile" : initialTabParam;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [settingsSaved, setSettingsSaved] = useState(false);

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

  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  const saveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const settingsTabs: Tab[] = ["ui", "model", "shield"];
  const needsSave = settingsTabs.includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab user={user} role={role} plan={plan} monthly={monthly} events={events} loading={loading} />;
      case "billing":
        return <BillingTab role={role} plan={plan} loading={loading} />;
      case "api-key":
        return <ApiKeyTab user={user} loading={loading} />;
      case "ui":
        return <UiTab settings={settings} set={set} />;
      case "model":
        return <ModelTab settings={settings} set={set} />;
      case "shield":
        return <ShieldTab settings={settings} set={set} />;
      case "prompt":
        return <PromptTab settings={settings} set={set} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.28)" }}>
          <User size={15} style={{ color: "var(--verdict-neon)" }} />
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Settings</h1>
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>{user.email}</p>
        </div>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0 space-y-0.5">
          {visibleTabs.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="w-full flex items-center gap-2.5 rounded px-3 py-2 text-sm cursor-pointer transition-all duration-150 text-left"
                style={{
                  background: active ? "rgba(0,255,195,0.06)" : "transparent",
                  borderLeft: `2px solid ${active ? "var(--verdict-neon)" : "transparent"}`,
                  color: active ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                }}
              >
                <Icon size={14} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={12} />}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          <div className="rounded p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
            {renderContent()}

            {needsSave && (
              <div className="flex justify-end mt-6 pt-4" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                <button onClick={saveSettings} className={`lex-btn ${settingsSaved ? "lex-btn--secondary" : "lex-btn--primary"}`}>
                  {settingsSaved ? "Saved" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page export ─────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
