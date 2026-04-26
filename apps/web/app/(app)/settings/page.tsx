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
  CreditCard, ExternalLink, User, Palette, Cpu, ShieldCheck, FileText, Key,
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
    <h3 className="lex-page-eyebrow mt-6 first:mt-0" style={{ marginBottom: 12 }}>
      {children}
    </h3>
  );
}

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: "var(--fg-tertiary)" }}>{label}</label>
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

/* ── Toggle switch ──────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative flex-shrink-0 cursor-pointer transition-all duration-200"
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: checked ? "var(--verdict-neon)" : "rgba(255,255,255,0.08)",
        border: `0.5px solid ${checked ? "rgba(0,255,195,0.5)" : "rgba(224,224,224,0.12)"}`,
        boxShadow: checked ? "0 0 10px rgba(0,255,195,0.3)" : "none",
      }}
    >
      <span
        className="absolute top-[3px] w-5 h-5 rounded-full transition-all duration-200"
        style={{
          background: checked ? "var(--midnight-court)" : "var(--fg-tertiary)",
          left: checked ? "calc(100% - 23px)" : 3,
        }}
      />
    </button>
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
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>AI USAGE</SectionHeading>
        {!loading ? (
          <div>
            <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] mb-2" style={{ color: "var(--fg-quaternary)" }}>
              <span>THIS MONTH</span>
              <span style={{ color: "var(--fg-secondary)" }}>${usdSpent.toFixed(4)} <span style={{ color: "var(--fg-quaternary)" }}>/ ${usdBudget}</span></span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(224,224,224,0.06)" }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 8px ${barColor}` }} />
            </div>
            {pct >= 80 && (
              <p className="font-mono text-[10px] tracking-[0.1em] mt-2" style={{ color: barColor }}>
                {pct >= 100 ? "BUDGET EXHAUSTED — upgrade to continue." : "APPROACHING MONTHLY LIMIT."}
              </p>
            )}
            <div className="mt-3 font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
              {(monthly?.total_requests ?? 0).toLocaleString()} AI REQUESTS THIS MONTH
            </div>
          </div>
        ) : (
          <div className="h-6 rounded" style={{ background: "rgba(255,255,255,0.04)", animation: "glowPulse 1.5s ease infinite" }} />
        )}
      </div>

      {!loading && (
        <div>
          <SectionHeading>RECENT AI CALLS</SectionHeading>
          {events.length === 0 ? (
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>No usage recorded yet.</p>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Tool", "Model", "Cost (USD)", "Time"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: "var(--fg-quaternary)" }}>{h}</th>
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
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                        transition: "background 0.1s",
                      }}
                    >
                      <td className="px-4 py-2.5 capitalize text-[13px]">{e.tool_name}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>{e.model}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--verdict-neon)" }}>${Number(e.usd_cost).toFixed(6)}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>{new Date(e.created_at).toLocaleString()}</td>
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
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>CURRENT PLAN</SectionHeading>
        <div className="flex items-end justify-between">
          <p className="font-serif text-3xl font-normal" style={{ color: PLAN_COLOR[role?.plan_id ?? "starter"] ?? "var(--fg-primary)", letterSpacing: "-0.02em" }}>
            {plan?.name ?? role?.plan_id ?? "Starter"}
          </p>
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.14em] uppercase mb-0.5" style={{ color: "var(--fg-quaternary)" }}>Monthly AI budget</p>
            <p className="font-serif text-2xl" style={{ color: "var(--fg-primary)", letterSpacing: "-0.02em" }}>${plan?.usd_budget ?? 8}</p>
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
          <SectionHeading>PAYMENT & INVOICES</SectionHeading>
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
          <SectionHeading>UPGRADE YOUR PLAN</SectionHeading>
          <p className="text-[13px] mb-4" style={{ color: "var(--fg-tertiary)", lineHeight: 1.65 }}>Get more AI budget, additional matters, and premium features.</p>
          <a href="/pricing" className="lex-btn lex-btn--primary">View Plans</a>
        </div>
      )}

      {role?.byok_active && (
        <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <SectionHeading>AI CREDITS TOP-UP</SectionHeading>
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
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>BYOK STATUS</SectionHeading>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium" style={{ color: byokActive ? "var(--verdict-neon)" : "var(--fg-secondary)" }}>
            {byokActive ? "Active — your key is being used" : "Inactive — using LexAgent shared key"}
          </p>
          {hasKey && <Toggle checked={byokActive} onChange={toggleByok} />}
        </div>
      </div>

      {byokActive && (
        <div className="rounded-lg p-5" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.18)" }}>
          <SectionHeading>ANTHROPIC BILLING</SectionHeading>
          <p className="text-[13px] mb-4" style={{ color: "var(--fg-tertiary)", lineHeight: 1.65 }}>
            Anthropic bills you directly. Your LexAgent plan limits (matters, features) still apply.
          </p>
          <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer" className="lex-btn lex-btn--secondary">
            <ExternalLink size={11} />
            View Anthropic Usage
          </a>
        </div>
      )}

      <div className="rounded-lg p-6 space-y-4" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>{hasKey ? "REPLACE API KEY" : "ADD API KEY"}</SectionHeading>
        {hasKey && <p className="text-[12px] mb-2" style={{ color: "var(--fg-tertiary)" }}>A key is stored. Enter a new one to replace it.</p>}
        <div className="flex gap-3">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-md text-[13px] font-mono lex-focus"
            style={{ background: "rgba(255,255,255,0.03)", color: "var(--fg-primary)", border: "0.5px solid rgba(224,224,224,0.10)", outline: "none", minHeight: 44 }}
          />
          <button onClick={saveKey} disabled={saving || !keyInput.trim()} className="lex-btn lex-btn--primary">
            {saving ? "SAVING…" : saved ? "SAVED ✓" : "SAVE"}
          </button>
        </div>
        {hasKey && (
          <button onClick={removeKey} className="lex-btn lex-btn--danger">Remove key and disable BYOK</button>
        )}
      </div>

      <div className="rounded-lg p-5 space-y-2.5" style={{ background: "rgba(255,255,255,0.015)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
        {[
          "Your key is stored encrypted and never logged.",
          "Anthropic bills you directly for all usage when BYOK is active.",
          "Your LexAgent plan limits (matter count, features) still apply.",
          "Disable BYOK at any time to revert to shared key billing.",
        ].map((line, i) => (
          <p key={i} className="text-[12px] flex gap-2" style={{ color: "var(--fg-tertiary)", lineHeight: 1.6 }}>
            <span style={{ color: "var(--verdict-neon)", flexShrink: 0 }}>·</span>
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
    <div className="space-y-3">
      <SectionHeading>INTERFACE PREFERENCES</SectionHeading>
      {[
        { key: "tooltipsEnabled",   label: "Tooltips",          desc: "Show contextual help on hover across the interface",         tooltip: "Disable if you prefer a cleaner workspace after learning the UI" },
        { key: "animationsEnabled", label: "Animations",         desc: "Enable motion transitions and entry animations",             tooltip: "Disable for reduced motion or performance-sensitive environments" },
        { key: "sidebarCollapsed",  label: "Collapsed Sidebar",  desc: "Start with the sidebar in icon-only mode",                   tooltip: "Saves horizontal space for wider content areas" },
      ].map(item => (
        <div
          key={item.key}
          className="flex items-center justify-between rounded-lg px-5 py-4"
          style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)", transition: "border-color 0.15s" }}
        >
          <div className="flex-1 min-w-0 mr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-medium" style={{ color: "var(--fg-primary)" }}>{item.label}</span>
              <LexTooltip content={item.tooltip} side="right">
                <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}>?</span>
              </LexTooltip>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--fg-tertiary)", lineHeight: 1.5 }}>{item.desc}</p>
          </div>
          <Toggle checked={!!settings[item.key]} onChange={() => set(item.key, !settings[item.key])} />
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
          style={{ cursor: "pointer", minHeight: 44 }}
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
          type="range" min={500} max={8000} step={100}
          value={settings.maxTokens}
          onChange={e => set("maxTokens", Number(e.target.value))}
          className="w-full cursor-pointer mt-2"
          style={{ accentColor: "var(--verdict-neon)" }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>500</span>
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>8000</span>
        </div>
      </Field>
      <Field label={`TEMPERATURE: ${settings.temperature?.toFixed(2) ?? "0.70"}`} tooltip="Lower = more precise/deterministic, higher = more creative">
        <input
          type="range" min={0} max={1} step={0.05}
          value={settings.temperature ?? 0.7}
          onChange={e => set("temperature", Number(e.target.value))}
          className="w-full cursor-pointer mt-2"
          style={{ accentColor: "var(--verdict-neon)" }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>Precise</span>
          <span className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>Creative</span>
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
      <div className="rounded-lg px-5 py-4 mb-4 flex items-center justify-between" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex-1 mr-6">
          <span className="text-[14px] font-medium" style={{ color: "var(--fg-primary)" }}>Auto-Verify Citations</span>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--fg-tertiary)", lineHeight: 1.5 }}>
            Automatically verify all citations against CourtListener after each research query
          </p>
        </div>
        <Toggle checked={!!settings.autoVerify} onChange={() => set("autoVerify", !settings.autoVerify)} />
      </div>
      <div className="rounded-lg px-5 py-4 text-[12px]" style={{ background: "rgba(0,255,195,0.05)", border: "0.5px solid rgba(0,255,195,0.22)", color: "var(--fg-secondary)", lineHeight: 1.75 }}>
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
      <div className="flex items-center justify-between mb-3">
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
          style={{ minHeight: 340, fontFamily: "var(--font-mono)", fontSize: "0.75rem", lineHeight: 1.75, cursor: "default", opacity: 0.85 }}
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

  const userInitials = (user.email ?? "U").slice(0, 1).toUpperCase();

  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  const saveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const settingsTabs: Tab[] = ["ui", "model", "shield"];
  const needsSave = settingsTabs.includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "profile": return <ProfileTab user={user} role={role} plan={plan} monthly={monthly} events={events} loading={loading} />;
      case "billing": return <BillingTab role={role} plan={plan} loading={loading} />;
      case "api-key": return <ApiKeyTab user={user} loading={loading} />;
      case "ui":      return <UiTab settings={settings} set={set} />;
      case "model":   return <ModelTab settings={settings} set={set} />;
      case "shield":  return <ShieldTab settings={settings} set={set} />;
      case "prompt":  return <PromptTab settings={settings} set={set} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: "32px 32px 48px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Page header */}
        <div className="fade-in flex items-start gap-5 mb-10">
          {/* User avatar */}
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(0,255,195,0.18), rgba(106,0,255,0.18))",
              border: "0.5px solid rgba(0,255,195,0.3)",
              boxShadow: "0 0 20px rgba(0,255,195,0.1)",
              fontFamily: "var(--font-serif)",
              fontSize: 22, fontWeight: 400,
              color: "var(--verdict-neon)",
            }}
          >
            {userInitials}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <p className="lex-page-eyebrow">Configuration</p>
            <h1 className="lex-page-title">Settings</h1>
            <p className="lex-page-subtitle" style={{ marginTop: 6 }}>
              {user.email}
              {role?.byok_active && (
                <span className="inline-flex items-center ml-3 font-mono text-[9px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,255,195,0.08)", border: "0.5px solid rgba(0,255,195,0.3)", color: "var(--verdict-neon)", verticalAlign: "middle" }}>
                  BYOK
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-8">

          {/* Sidebar nav */}
          <nav className="flex-shrink-0 fade-in-d1" style={{ width: 200 }}>
            <div className="space-y-0.5">
              {visibleTabs.map(({ id, icon: Icon, label }, i) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`lex-nav-item${activeTab === id ? " is-active" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <Icon size={14} className="lex-nav-item__icon" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content panel */}
          <div className="flex-1 min-w-0 fade-in-d2">
            <div className="rounded-xl" style={{ background: "rgba(14,14,18,0.85)", border: "0.5px solid rgba(224,224,224,0.09)", padding: "28px 28px 24px" }}>
              {renderContent()}

              {needsSave && (
                <div className="flex justify-end mt-8 pt-5" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                  <button onClick={saveSettings} className={`lex-btn ${settingsSaved ? "lex-btn--secondary" : "lex-btn--primary"}`}>
                    {settingsSaved ? "Saved ✓" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
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
