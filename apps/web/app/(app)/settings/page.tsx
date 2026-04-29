"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/providers/settings-provider";
import { supabase } from "@/lib/supabase";
import { getApiHeaders } from "@/lib/api";
import { DEFAULT_SYSTEM, ARES_PROMPT_VERSION } from "@/lib/settings";
import { useToast } from "@/hooks/useToast";
import { LexTooltip } from "@/components/shared/LexTooltip";
import {
  CreditCard, ExternalLink, User, Palette, Cpu, ShieldCheck, FileText, Key, Building2, UsersRound, Lock,
  Smartphone, QrCode, CheckCircle2, XCircle, Loader2, Scale, Eye, EyeOff, Trash2,
} from "lucide-react";
import { FirmProfileTab } from "@/components/settings/FirmProfileTab";
import { TeamsTab } from "@/components/settings/TeamsTab";

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

type Tab = "profile" | "billing" | "api-key" | "ui" | "model" | "shield" | "prompt" | "firm" | "teams" | "security" | "pacer";

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "profile",  icon: User,        label: "Profile & Usage"     },
  { id: "billing",  icon: CreditCard,  label: "Billing & Plan"      },
  { id: "firm",     icon: Building2,   label: "Firm Profile"        },
  { id: "teams",    icon: UsersRound,  label: "Teams"               },
  { id: "api-key",  icon: Key,         label: "API Key (BYOK)"      },
  { id: "security", icon: Lock,        label: "Security"            },
  { id: "pacer",    icon: Scale,       label: "PACER"               },
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
interface CreditStatus { used: number; limit: number; remaining: number; pct_used: number; plan_id: string; period_end: string; }

function ProfileTab({
  user, role, events, loading,
}: {
  user: { email?: string };
  role: UserRole | null;
  events: UsageEvent[];
  loading: boolean;
}) {
  const [credits, setCredits] = useState<CreditStatus | null>(null);
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (!authUser) return;
    supabase.rpc("get_credit_status", { p_user_id: authUser.id }).then(({ data }) => {
      if (data) setCredits(data as CreditStatus);
    });
  }, [authUser]);

  const pct = credits ? Math.min(credits.pct_used, 100) : 0;
  const barColor = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";
  const isFree = !credits || credits.limit === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>CREDIT USAGE</SectionHeading>
        {!loading && credits !== null ? (
          isFree ? (
            <p className="font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
              FREE PLAN — per-feature limits apply. Upgrade for a monthly credit pool.
            </p>
          ) : (
            <div>
              <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] mb-2" style={{ color: "var(--fg-quaternary)" }}>
                <span>THIS MONTH</span>
                <span style={{ color: "var(--fg-secondary)" }}>
                  {credits.used} <span style={{ color: "var(--fg-quaternary)" }}>/ {credits.limit} credits</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(224,224,224,0.06)" }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 8px ${barColor}` }} />
              </div>
              {pct >= 80 && (
                <p className="font-mono text-[10px] tracking-[0.1em] mt-2" style={{ color: barColor }}>
                  {pct >= 100 ? "CREDITS EXHAUSTED — upgrade to continue." : "APPROACHING MONTHLY LIMIT."}
                </p>
              )}
              <div className="mt-3 font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
                {credits.remaining} CREDITS REMAINING · RESETS {new Date(credits.period_end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            </div>
          )
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
      <ChangePasswordSection />
    </div>
  );
}

/* ── Change password (appended to ProfileTab) ──────────────────────────── */
function ChangePasswordSection() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleSave() {
    if (pw.length < 8) { setErrMsg("Minimum 8 characters."); setStatus("err"); return; }
    if (pw !== confirm) { setErrMsg("Passwords do not match."); setStatus("err"); return; }
    setStatus("saving");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setErrMsg(error.message); setStatus("err"); }
    else { setStatus("ok"); setPw(""); setConfirm(""); }
  }

  return (
    <div className="rounded-lg p-6 mt-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <SectionHeading>CHANGE PASSWORD</SectionHeading>
      <div className="space-y-3 max-w-sm">
        <Field label="New password">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min. 8 characters"
            className="lex-input w-full text-sm" />
        </Field>
        <Field label="Confirm password">
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password"
            className="lex-input w-full text-sm" onKeyDown={e => e.key === "Enter" && handleSave()} />
        </Field>
        {status === "err" && <p className="text-xs font-mono" style={{ color: "var(--verdict-crimson)" }}>{errMsg}</p>}
        {status === "ok" && <p className="text-xs font-mono" style={{ color: "var(--verdict-neon)" }}>Password updated.</p>}
        <button onClick={handleSave} disabled={status === "saving"} className="lex-btn lex-btn--primary text-xs">
          {status === "saving" ? "Saving…" : "Update Password"}
        </button>
      </div>
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
      <SectionHeading>SYSTEM PROMPT — ARES v{ARES_PROMPT_VERSION}</SectionHeading>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.1em] px-2 py-0.5 rounded" style={{ color: "var(--verdict-neon)", border: "1px solid var(--verdict-neon)", opacity: 0.85 }}>
            v{ARES_PROMPT_VERSION}
          </span>
          <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
            {charCount.toLocaleString()} chars · ~{tokEstimate.toLocaleString()} tokens
          </span>
        </div>
        <button
          onClick={() => set("systemPrompt", DEFAULT_SYSTEM)}
          className="lex-btn lex-btn--secondary"
          style={{ fontSize: "0.7rem", padding: "4px 10px" }}
        >
          Reset to ARES v{ARES_PROMPT_VERSION}
        </button>
      </div>
      <Field label="ACTIVE SYSTEM PROMPT" tooltip={`Read-only view of the ARES v${ARES_PROMPT_VERSION} system prompt. Use 'Reset to ARES v${ARES_PROMPT_VERSION}' to restore defaults.`}>
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

/* ── PACER tab ──────────────────────────────────────────────────────────── */
function PacerTab({ userId }: { userId: string }) {
  const [connected, setConnected] = useState(false);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      const h = token ? { Authorization: `Bearer ${token}` } : {};
      Promise.all([
        fetch(`${API_URL}/api/pacer/credentials/status`, { headers: h }).then(r => r.ok ? r.json() : null),
        supabase.from("user_roles").select("alert_email_enabled").eq("user_id", userId).single(),
      ]).then(([status, roleRes]) => {
        if (status) { setConnected(status.connected); setSavedUsername(status.username); }
        if (roleRes.data) setEmailAlerts(!!roleRes.data.alert_email_enabled);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [userId]);

  async function save() {
    if (!username.trim() || !password.trim()) return;
    setSaving(true); setError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    const res = await fetch(`${API_URL}/api/pacer/credentials`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password: password.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setConnected(true); setSavedUsername(username.trim());
      setUsername(""); setPassword(""); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setError(d.error ?? "Failed to save credentials");
    }
  }

  async function remove() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    await fetch(`${API_URL}/api/pacer/credentials`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConnected(false); setSavedUsername(null);
  }

  if (loading) return <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>PACER CONNECTION</SectionHeading>
        <p className="text-[13px] mb-4" style={{ color: "var(--fg-secondary)" }}>
          Connect your PACER account to search federal court dockets and sync filings directly into matters.
          Credentials are stored server-side and only used to authenticate PACER API requests.
        </p>
        {connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: "var(--verdict-neon)" }} />
              <span className="text-[13px] font-mono" style={{ color: "var(--verdict-neon)" }}>
                Connected as <strong>{savedUsername}</strong>
              </span>
            </div>
            <button
              onClick={remove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-widest hover:bg-[rgba(255,60,60,0.12)] transition-colors"
              style={{ color: "var(--fg-tertiary)" }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-tertiary)" }}>
                  PACER Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_pacer_login"
                  className="w-full px-3 py-2 rounded text-sm font-mono bg-[var(--midnight-mid)] border border-[rgba(224,224,224,0.1)] text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] focus:outline-none focus:border-[var(--verdict-neon)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-tertiary)" }}>
                  PACER Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && save()}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 rounded text-sm font-mono bg-[var(--midnight-mid)] border border-[rgba(224,224,224,0.1)] text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] focus:outline-none focus:border-[var(--verdict-neon)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                  >
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <p className="text-xs font-mono" style={{ color: "var(--verdict-red, #ff4d4d)" }}>{error}</p>
            )}
            <button
              onClick={save}
              disabled={saving || !username.trim() || !password.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono uppercase tracking-widest transition-colors"
              style={{
                background: saved ? "rgba(0,255,195,0.15)" : "var(--verdict-neon)",
                color: saved ? "var(--verdict-neon)" : "var(--midnight-deep)",
                opacity: saving || !username.trim() || !password.trim() ? 0.5 : 1,
              }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saved ? "Saved!" : "Connect PACER"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg p-5" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>EMAIL ALERTS</SectionHeading>
        <div className="flex items-center justify-between">
          <p className="text-[13px]" style={{ color: "var(--fg-secondary)" }}>
            Receive an email when new filings appear on watched dockets
          </p>
          <button
            onClick={async () => {
              const next = !emailAlerts;
              setEmailAlerts(next);
              await supabase.from("user_roles").update({ alert_email_enabled: next }).eq("user_id", userId);
            }}
            className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ml-4"
            style={{ background: emailAlerts ? "var(--verdict-neon)" : "rgba(255,255,255,0.12)" }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: emailAlerts ? "calc(100% - 18px)" : "2px" }}
            />
          </button>
        </div>
        {emailAlerts && (
          <p className="text-[11px] font-mono mt-2" style={{ color: "var(--fg-tertiary)" }}>
            Emails sent to your account address. Requires <code>RESEND_API_KEY</code> on the server.
          </p>
        )}
      </div>

      <div className="rounded-lg p-5" style={{ background: "rgba(17,17,20,0.5)", border: "0.5px solid rgba(224,224,224,0.06)" }}>
        <SectionHeading>HOW IT WORKS</SectionHeading>
        <ul className="space-y-1.5 text-[12px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
          <li>• Credentials are verified against PACER before saving</li>
          <li>• A fresh auth token is fetched per request — your password is never sent to the browser</li>
          <li>• Used for case search and docket sync in the Docket Watch tab on any matter</li>
          <li>• PACER charges $0.10/page for documents — LexAgent does not purchase documents on your behalf</li>
        </ul>
      </div>
    </div>
  );
}

const ADMIN_ONLY_TABS: Tab[] = ["api-key", "prompt", "teams"];

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
      case "profile": return <ProfileTab user={user} role={role} events={events} loading={loading} />;
      case "billing": return <BillingTab role={role} plan={plan} loading={loading} />;
      case "firm":    return <FirmProfileTab isAdmin={isAdmin} />;
      case "teams":   return <TeamsTab />;
      case "api-key":  return <ApiKeyTab user={user} loading={loading} />;
      case "security": return user?.id ? <SecurityTab userId={user.id} /> : null;
      case "ui":       return <UiTab settings={settings} set={set} />;
      case "model":    return <ModelTab settings={settings} set={set} />;
      case "shield":   return <ShieldTab settings={settings} set={set} />;
      case "prompt":   return <PromptTab settings={settings} set={set} />;
      case "pacer":    return user?.id ? <PacerTab userId={user.id} /> : null;
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

/* ── Security tab ────────────────────────────────────────────────────────── */
interface SessionRow {
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_seen: string;
  created_at: string;
  is_revoked: boolean;
}

type MfaStep = "idle" | "enrolling" | "verifying" | "done";

function TwoFactorSection() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loadingFactor, setLoadingFactor] = useState(true);
  const [step, setStep] = useState<MfaStep>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [enrollId, setEnrollId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === "verified");
      setFactorId(verified?.id ?? null);
      setLoadingFactor(false);
    });
  }, []);

  async function startEnroll() {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "LexAgent" });
    if (error || !data) { setBusy(false); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrollId(data.id);
    setStep("verifying");
    setCode("");
    setVerifyErr(null);
    setBusy(false);
  }

  async function verifyEnroll() {
    if (!enrollId || code.length !== 6) return;
    setBusy(true);
    setVerifyErr(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollId, code });
    if (error) {
      setVerifyErr("Invalid code — try again.");
      setBusy(false);
      return;
    }
    setFactorId(enrollId);
    setStep("done");
    setBusy(false);
  }

  async function unenroll() {
    if (!factorId) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setFactorId(null);
    setStep("idle");
    setBusy(false);
  }

  if (loadingFactor) {
    return (
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>TWO-FACTOR AUTHENTICATION</SectionHeading>
        <Loader2 size={16} className="animate-spin" style={{ color: "var(--fg-tertiary)" }} />
      </div>
    );
  }

  return (
    <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <SectionHeading>TWO-FACTOR AUTHENTICATION</SectionHeading>

      {factorId && step !== "done" ? (
        /* Enabled state */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} style={{ color: "var(--verdict-neon)" }} />
            <span className="text-sm" style={{ color: "var(--fg-primary)" }}>Authenticator app enabled</span>
          </div>
          <button onClick={unenroll} disabled={busy} className="lex-btn text-xs" style={{ color: "var(--verdict-crimson)", borderColor: "rgba(239,68,68,0.3)" }}>
            {busy ? "…" : "Disable 2FA"}
          </button>
        </div>
      ) : step === "done" ? (
        /* Just enrolled */
        <div className="flex items-center gap-2">
          <CheckCircle2 size={15} style={{ color: "var(--verdict-neon)" }} />
          <span className="text-sm" style={{ color: "var(--fg-primary)" }}>2FA enabled — your account is now protected.</span>
        </div>
      ) : step === "idle" ? (
        /* Not enrolled */
        <>
          <p className="text-xs mb-4" style={{ color: "var(--fg-tertiary)" }}>
            Add a time-based one-time password (TOTP) app like Google Authenticator or Authy for an extra layer of security.
          </p>
          <button onClick={startEnroll} disabled={busy} className="lex-btn lex-btn--primary text-xs">
            {busy ? <><Loader2 size={12} className="animate-spin mr-1.5" />Setting up…</> : <><Smartphone size={12} className="mr-1.5" />Enable 2FA</>}
          </button>
        </>
      ) : (
        /* Verifying enrollment */
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>
            Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          {qrCode && (
            <div className="flex flex-col items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="TOTP QR code" width={160} height={160} className="rounded" style={{ background: "#fff", padding: 6 }} />
              {secret && (
                <div className="flex items-center gap-2">
                  <QrCode size={12} style={{ color: "var(--fg-tertiary)" }} />
                  <span className="font-mono text-[11px]" style={{ color: "var(--fg-tertiary)" }}>Manual key: {secret}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input
              className="rounded px-3 py-2 text-sm font-mono tracking-widest w-36"
              style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)", color: "var(--fg-primary)", outline: "none" }}
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verifyEnroll()}
              autoFocus
            />
            <button onClick={verifyEnroll} disabled={busy || code.length !== 6} className="lex-btn lex-btn--primary text-xs">
              {busy ? <Loader2 size={12} className="animate-spin" /> : "Verify"}
            </button>
            <button onClick={() => { setStep("idle"); setCode(""); setVerifyErr(null); }} className="lex-btn lex-btn--ghost text-xs">
              Cancel
            </button>
          </div>
          {verifyErr && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--verdict-crimson)" }}>
              <XCircle size={12} /> {verifyErr}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SecurityTab({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const currentSessionId = typeof window !== "undefined"
    ? localStorage.getItem("lex_session_id") ?? ""
    : "";

  useEffect(() => {
    supabase
      .from("user_sessions_ext")
      .select("session_id, ip_address, user_agent, last_seen, created_at, is_revoked")
      .eq("user_id", userId)
      .eq("is_revoked", false)
      .order("last_seen", { ascending: false })
      .limit(20)
      .then(({ data }) => { setSessions((data as SessionRow[]) ?? []); setLoading(false); });
  }, [userId]);

  async function revoke(sessionId: string) {
    setRevoking(sessionId);
    await supabase.rpc("revoke_user_sessions", { p_target_uid: userId });
    setSessions(s => s.filter(r => r.session_id !== sessionId));
    setRevoking(null);
  }

  const fmtDate = (d: string) => new Date(d).toLocaleString();
  const fmtUA = (ua: string | null) => {
    if (!ua) return "Unknown device";
    if (/mobile/i.test(ua)) return "Mobile browser";
    if (/chrome/i.test(ua)) return "Chrome";
    if (/firefox/i.test(ua)) return "Firefox";
    if (/safari/i.test(ua)) return "Safari";
    return "Browser";
  };

  return (
    <div className="space-y-6">
      <TwoFactorSection />
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading>ACTIVE SESSIONS</SectionHeading>
        <p className="text-xs mb-4" style={{ color: "var(--fg-tertiary)" }}>
          Sessions where you are currently signed in. LexAgent enforces single-session — signing in elsewhere revokes this session.
        </p>
        {loading ? (
          <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const isCurrent = s.session_id === currentSessionId;
              return (
                <div key={s.session_id} className="flex items-start justify-between gap-4 p-3 rounded"
                  style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--fg-secondary)" }}>
                        {fmtUA(s.user_agent)}
                      </span>
                      {isCurrent && (
                        <span className="font-mono text-[9px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(0,255,195,0.08)", border: "0.5px solid rgba(0,255,195,0.3)", color: "var(--verdict-neon)" }}>
                          THIS SESSION
                        </span>
                      )}
                    </div>
                    {s.ip_address && (
                      <p className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>IP: {s.ip_address}</p>
                    )}
                    <p className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>
                      Last seen: {fmtDate(s.last_seen)}
                    </p>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => revoke(s.session_id)}
                      disabled={revoking === s.session_id}
                      className="lex-btn text-xs flex-shrink-0"
                      style={{ color: "var(--verdict-crimson)", borderColor: "rgba(239,68,68,0.3)" }}
                    >
                      {revoking === s.session_id ? "Revoking…" : "Revoke"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
