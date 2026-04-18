"use client";

import { useState, useEffect } from "react";
import {
  Building2, Palette, Key, Cpu, ShieldCheck, FileText, Activity, ChevronRight, Users,
} from "lucide-react";
import { useSettings } from "@/providers/settings-provider";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PRACTICE_AREAS, DEFAULT_SYSTEM } from "@/lib/settings";
import { LexTooltip } from "@/components/shared/LexTooltip";

type TabKey = "firm" | "ui" | "apikeys" | "model" | "shield" | "prompt" | "telemetry" | "users";

const ADMIN_TABS: { id: TabKey; icon: React.ElementType; label: string }[] = [
  { id: "firm",      icon: Building2,  label: "Firm Profile"    },
  { id: "ui",        icon: Palette,    label: "UI Preferences"  },
  { id: "apikeys",   icon: Key,        label: "API Keys"        },
  { id: "model",     icon: Cpu,        label: "Model & AI"      },
  { id: "shield",    icon: ShieldCheck,label: "Hallucination Shield" },
  { id: "prompt",    icon: FileText,   label: "System Prompt"   },
  { id: "telemetry", icon: Activity,   label: "Telemetry"       },
  { id: "users",     icon: Users,      label: "User Management" },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] tracking-widest mb-3 mt-6 first:mt-0" style={{ color: "var(--text-muted)" }}>
      {children}
    </h3>
  );
}

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="font-mono text-[11px] tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
        {tooltip && (
          <LexTooltip content={tooltip} side="right">
            <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help flex-shrink-0"
              style={{ background: "var(--panel2)", border: "1px solid var(--border-hi)", color: "var(--text-muted)" }}>
              ?
            </span>
          </LexTooltip>
        )}
      </div>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg px-3.5 py-2.5 text-sm lex-focus transition-all";
const inputStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  outline: "none",
};

interface AdminUser {
  user_id: string;
  role: string;
  plan_id: string;
  byok_active: boolean;
  profiles: { email: string | null; full_name: string | null } | null;
  usage_monthly: { total_usd_cost: number; total_requests: number } | null;
}

const PLANS = ["starter", "professional", "firm", "premium"];

function UserManagementTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const now = new Date();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("user_roles")
        .select(`
          user_id, role, plan_id, byok_active,
          profiles (email, full_name)
        `)
        .order("user_id");

      if (!data) { setLoading(false); return; }

      // Fetch this month's usage for each user
      const userIds = data.map((u: any) => u.user_id);
      const { data: usageData } = await supabase
        .from("usage_monthly")
        .select("user_id, total_usd_cost, total_requests")
        .in("user_id", userIds)
        .eq("year", now.getFullYear())
        .eq("month", now.getMonth() + 1);

      const usageMap: Record<string, { total_usd_cost: number; total_requests: number }> = {};
      (usageData ?? []).forEach((u: any) => { usageMap[u.user_id] = u; });

      setUsers((data as any[]).map((u) => ({
        ...u,
        profiles: Array.isArray(u.profiles) ? u.profiles[0] ?? null : u.profiles,
        usage_monthly: usageMap[u.user_id] ?? null,
      })));
      setLoading(false);
    }
    load();
  }, []);

  async function changePlan(userId: string, planId: string) {
    setUpdating(userId);
    await supabase.from("user_roles").update({ plan_id: planId }).eq("user_id", userId);
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, plan_id: planId } : u));
    setUpdating(null);
  }

  const filtered = users.filter((u) => {
    const email = u.profiles?.email ?? "";
    const name = u.profiles?.full_name ?? "";
    return email.includes(search) || name.includes(search) || u.plan_id.includes(search);
  });

  return (
    <div>
      <SectionHeading>ALL USERS</SectionHeading>
      <input
        className={inputCls}
        style={{ ...inputStyle, marginBottom: "1rem" }}
        placeholder="Search by email, name, or plan…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No users found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--panel)" }}>
                {["Email", "Name", "Role", "Plan", "Usage (mo)", "Requests", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const spent = Number(u.usage_monthly?.total_usd_cost ?? 0);
                return (
                  <tr key={u.user_id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-3 py-2.5" style={{ color: "var(--text)" }}>
                      {u.profiles?.email ?? "—"}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-muted)" }}>
                      {u.profiles?.full_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ background: u.role === "admin" ? "var(--gold)" : "var(--panel)", color: u.role === "admin" ? "#000" : "var(--text-muted)" }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={u.plan_id}
                        disabled={updating === u.user_id}
                        onChange={(e) => changePlan(u.user_id, e.target.value)}
                        className="rounded px-2 py-1 text-xs"
                        style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--border)" }}
                      >
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--text)" }}>
                      ${spent.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {u.usage_monthly?.total_requests ?? 0}
                    </td>
                    <td className="px-3 py-2.5">
                      <a
                        href={`/settings/profile?uid=${u.user_id}`}
                        className="text-xs"
                        style={{ color: "var(--emerald)" }}
                      >
                        View
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        {filtered.length} user{filtered.length !== 1 ? "s" : ""} · Usage data: {now.toLocaleString("default", { month: "long" })} {now.getFullYear()}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const { settings, updateSettings } = useSettings();
  const [tab, setTab] = useState<TabKey>("firm");
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderTab = () => {
    switch (tab) {
      case "firm":
        return (
          <div>
            <SectionHeading>FIRM INFORMATION</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field label="FIRM NAME">
                <input className={inputCls} style={inputStyle} value={settings.firmName} onChange={e => set("firmName", e.target.value)} placeholder="Acme Law Group" />
              </Field>
              <Field label="FIRM EMAIL">
                <input className={inputCls} style={inputStyle} value={settings.firmEmail} onChange={e => set("firmEmail", e.target.value)} placeholder="info@lawfirm.com" />
              </Field>
              <Field label="PHONE">
                <input className={inputCls} style={inputStyle} value={settings.firmPhone} onChange={e => set("firmPhone", e.target.value)} placeholder="(555) 000-0000" />
              </Field>
              <Field label="WEBSITE">
                <input className={inputCls} style={inputStyle} value={settings.firmWebsite} onChange={e => set("firmWebsite", e.target.value)} placeholder="https://lawfirm.com" />
              </Field>
            </div>
            <Field label="STREET ADDRESS">
              <input className={inputCls} style={inputStyle} value={settings.firmAddress} onChange={e => set("firmAddress", e.target.value)} placeholder="123 Main St, Suite 400" />
            </Field>
            <div className="grid grid-cols-3 gap-x-4">
              <Field label="CITY">
                <input className={inputCls} style={inputStyle} value={settings.firmCity} onChange={e => set("firmCity", e.target.value)} />
              </Field>
              <Field label="STATE">
                <input className={inputCls} style={inputStyle} value={settings.firmState} onChange={e => set("firmState", e.target.value)} placeholder="CA" />
              </Field>
              <Field label="ZIP">
                <input className={inputCls} style={inputStyle} value={settings.firmZip} onChange={e => set("firmZip", e.target.value)} />
              </Field>
            </div>

            <SectionHeading>BAR & CREDENTIALS</SectionHeading>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="BAR NUMBER" tooltip="Your state bar admission number">
                <input className={inputCls} style={inputStyle} value={settings.barNumber} onChange={e => set("barNumber", e.target.value)} />
              </Field>
              <Field label="BAR JURISDICTION">
                <input className={inputCls} style={inputStyle} value={settings.barJurisdiction} onChange={e => set("barJurisdiction", e.target.value)} placeholder="State Bar of California" />
              </Field>
            </div>

            <Field label="PRACTICE AREAS" tooltip="Select all areas your firm practices">
              <div className="flex flex-wrap gap-2 mt-1">
                {PRACTICE_AREAS.map(area => {
                  const selected = (settings.practiceAreas ?? []).includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => {
                        const next = selected
                          ? settings.practiceAreas.filter(a => a !== area)
                          : [...settings.practiceAreas, area];
                        set("practiceAreas", next);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide cursor-pointer transition-all duration-150"
                      style={{
                        background: selected ? "var(--emerald-faint)" : "var(--panel)",
                        border: `1px solid ${selected ? "var(--emerald-dim)" : "var(--border)"}`,
                        color: selected ? "var(--emerald)" : "var(--text-muted)",
                      }}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="LETTERHEAD TEXT" tooltip="Appears on generated documents">
              <textarea
                className={inputCls}
                style={{ ...inputStyle, resize: "none", minHeight: 80 }}
                value={settings.letterheadText}
                onChange={e => set("letterheadText", e.target.value)}
                placeholder="e.g., Attorneys at Law · Serving Since 1998"
              />
            </Field>

            <SectionHeading>BILLING</SectionHeading>
            <Field label="DEFAULT HOURLY RATE ($)" tooltip="Used to calculate invoice totals in the Billing tab">
              <input
                className={inputCls}
                style={inputStyle}
                type="number"
                min="0"
                step="5"
                value={settings.hourlyRate ?? 350}
                onChange={e => set("hourlyRate", parseFloat(e.target.value) || 0)}
                placeholder="350"
              />
            </Field>
          </div>
        );

      case "ui":
        return (
          <div className="space-y-4">
            <SectionHeading>INTERFACE PREFERENCES</SectionHeading>

            {[
              { key: "tooltipsEnabled", label: "Tooltips", desc: "Show contextual help on hover across the interface", tooltip: "Disable if you prefer a cleaner workspace after learning the UI" },
              { key: "animationsEnabled", label: "Animations", desc: "Enable motion transitions and entry animations", tooltip: "Disable for reduced motion or performance-sensitive environments" },
              { key: "sidebarCollapsed", label: "Collapsed Sidebar", desc: "Start with the sidebar in icon-only mode", tooltip: "Saves horizontal space for wider content areas" },
            ].map(item => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl px-4 py-3.5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{item.label}</span>
                    <LexTooltip content={item.tooltip} side="right">
                      <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help"
                        style={{ background: "var(--panel2)", border: "1px solid var(--border-hi)", color: "var(--text-muted)" }}>
                        ?
                      </span>
                    </LexTooltip>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => set(item.key, !(settings as unknown as Record<string, unknown>)[item.key])}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200"
                  style={{
                    background: (settings as unknown as Record<string, unknown>)[item.key] ? "var(--emerald)" : "var(--panel2)",
                    border: "1px solid var(--border-hi)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                    style={{
                      background: "var(--text)",
                      left: (settings as unknown as Record<string, unknown>)[item.key] ? "calc(100% - 22px)" : "2px",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        );

      case "apikeys":
        return (
          <div>
            <SectionHeading>API CREDENTIALS</SectionHeading>
            <Field label="ANTHROPIC API KEY" tooltip="Get your key at console.anthropic.com — powers all AI features">
              <input
                className={inputCls}
                style={inputStyle}
                type="password"
                value={settings.anthropicKey}
                onChange={e => set("anthropicKey", e.target.value)}
                placeholder="sk-ant-…"
              />
            </Field>
            <Field label="COURTLISTENER TOKEN" tooltip="Free at courtlistener.com/help/api — unlocks 9M+ case law records">
              <input
                className={inputCls}
                style={inputStyle}
                type="password"
                value={settings.courtListenerToken}
                onChange={e => set("courtListenerToken", e.target.value)}
                placeholder="Token from courtlistener.com"
              />
            </Field>
            <Field label="GOVINFO API KEY" tooltip="Free at api.govinfo.gov — Federal Register, CFR, bills, statutes">
              <input
                className={inputCls}
                style={inputStyle}
                type="password"
                value={settings.govInfoKey}
                onChange={e => set("govInfoKey", e.target.value)}
                placeholder="GovInfo key"
              />
            </Field>
            <Field label="OPENSTATES API KEY" tooltip="Free at openstates.org — state legislature bills and votes">
              <input
                className={inputCls}
                style={inputStyle}
                type="password"
                value={settings.openStatesKey}
                onChange={e => set("openStatesKey", e.target.value)}
                placeholder="OpenStates key"
              />
            </Field>
          </div>
        );

      case "model":
        return (
          <div>
            <SectionHeading>MODEL CONFIGURATION</SectionHeading>
            <Field label="MODEL" tooltip="Select Claude model — claude-opus-4-7 is most capable, claude-haiku-4-5 is fastest">
              <select
                className={inputCls}
                style={{ ...inputStyle, cursor: "pointer" }}
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
                style={{ accentColor: "var(--emerald)" }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>500</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>8000</span>
              </div>
            </Field>
            <Field label={`TEMPERATURE: ${settings.temperature.toFixed(2)}`} tooltip="Lower = more precise/deterministic, higher = more creative">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.temperature}
                onChange={e => set("temperature", Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: "var(--emerald)" }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Precise</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Creative</span>
              </div>
            </Field>
          </div>
        );

      case "shield":
        return (
          <div>
            <SectionHeading>HALLUCINATION SHIELD</SectionHeading>
            <div
              className="rounded-xl px-4 py-3.5 mb-4 flex items-center justify-between"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Auto-Verify Citations</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Automatically verify all citations against CourtListener after each research query
                </p>
              </div>
              <button
                onClick={() => set("autoVerify", !settings.autoVerify)}
                className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200 ml-4"
                style={{
                  background: settings.autoVerify ? "var(--emerald)" : "var(--panel2)",
                  border: "1px solid var(--border-hi)",
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                  style={{
                    background: "var(--text)",
                    left: settings.autoVerify ? "calc(100% - 22px)" : "2px",
                  }}
                />
              </button>
            </div>
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{
                background: "var(--emerald-faint)",
                border: "1px solid var(--emerald-dim)",
                color: "var(--text-sub)",
                lineHeight: 1.7,
              }}
            >
              ARES verifies citations against 18M+ CourtListener records. Verified citations are marked with a shield; unverified citations are flagged with a warning. Requires a CourtListener API token.
            </div>
          </div>
        );

      case "prompt":
        return (
          <div>
            <SectionHeading>SYSTEM PROMPT</SectionHeading>
            <Field label="ARES SYSTEM PROMPT" tooltip="This prompt defines ARES's behavior — modify with care">
              <textarea
                className={inputCls}
                style={{ ...inputStyle, resize: "vertical", minHeight: 320, fontFamily: "var(--font-mono)", fontSize: "0.75rem", lineHeight: 1.7 }}
                value={settings.systemPrompt}
                onChange={e => set("systemPrompt", e.target.value)}
              />
            </Field>
            <button
              onClick={() => set("systemPrompt", DEFAULT_SYSTEM)}
              className="text-xs underline cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              Reset to default
            </button>
          </div>
        );

      case "users":
        return <UserManagementTab />;

      case "telemetry":
        return (
          <div>
            <SectionHeading>API CONNECTIVITY</SectionHeading>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Test connectivity to all integrated APIs. Requires API keys to be set.
            </p>
            {[
              { name: "Anthropic Claude", desc: "AI inference — all research and drafting" },
              { name: "CourtListener", desc: "Case law database — 9M+ opinions" },
              { name: "GovInfo", desc: "Federal Register, CFR, statutes" },
              { name: "OpenStates", desc: "State legislature data" },
            ].map(api => (
              <div
                key={api.name}
                className="flex items-center justify-between rounded-xl px-4 py-3 mb-2"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{api.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{api.desc}</p>
                </div>
                <button
                  className="rounded-lg px-3 py-1.5 text-xs font-mono tracking-wide cursor-pointer transition-all duration-150"
                  style={{ background: "var(--panel2)", border: "1px solid var(--border-hi)", color: "var(--text-muted)" }}
                >
                  PING
                </button>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
        >
          <Building2 size={15} style={{ color: "var(--emerald)" }} />
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Administration</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Firm profile, API keys, and preferences</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-48 flex-shrink-0 space-y-0.5">
          {ADMIN_TABS.map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all duration-150 text-left"
                style={{
                  background: active ? "var(--emerald-faint)" : "transparent",
                  borderLeft: `2px solid ${active ? "var(--emerald)" : "transparent"}`,
                  color: active ? "var(--emerald)" : "var(--text-muted)",
                }}
              >
                <Icon size={14} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={12} />}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {renderTab()}

            <div className="flex justify-end mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={save}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-150"
                style={{
                  background: saved
                    ? "var(--emerald-faint)"
                    : "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
                  color: saved ? "var(--emerald)" : "#0A0F0D",
                  border: saved ? "1px solid var(--emerald-dim)" : "none",
                }}
              >
                {saved ? "Saved" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
