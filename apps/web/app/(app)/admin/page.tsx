"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, Palette, Key, Cpu, ShieldCheck, FileText, Activity, ChevronRight, Users,
  CreditCard, UsersRound, Plus, Trash2, ClipboardList, Lock, BarChart3, KeyRound, UserPlus, X,
  RefreshCw, Brain, Radio, Zap, ExternalLink,
} from "lucide-react";
import { getApiHeaders } from "@/lib/api";
import { useSettings } from "@/providers/settings-provider";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PRACTICE_AREAS, DEFAULT_SYSTEM } from "@/lib/settings";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { useQuota } from "@/hooks/useQuota";
import { storagePercent, aiPercent, matterPercent } from "@/lib/quota";
import { useMyTokenUsage, useAdminTokenUsage } from "@/hooks/useTokenUsage";
import { useWaterfallStats, type WaterfallStat } from "@/hooks/useWaterfallStats";

type TabKey = "firm" | "ui" | "apikeys" | "model" | "shield" | "prompt" | "telemetry" | "users" | "billing" | "teams" | "auditlog" | "quota" | "ares" | "livefeed";

const ADMIN_TABS: { id: TabKey; icon: React.ElementType; label: string }[] = [
  { id: "firm",      icon: Building2,   label: "Firm Profile"    },
  { id: "billing",   icon: CreditCard,  label: "Billing & Plan"  },
  { id: "ui",        icon: Palette,     label: "UI Preferences"  },
  { id: "apikeys",   icon: Key,         label: "API Keys"        },
  { id: "model",     icon: Cpu,         label: "Model & AI"      },
  { id: "shield",    icon: ShieldCheck, label: "Hallucination Shield" },
  { id: "prompt",    icon: FileText,    label: "System Prompt"   },
  { id: "telemetry", icon: Activity,    label: "Telemetry"       },
  { id: "ares",      icon: Brain,        label: "ARES Inspector" },
  { id: "livefeed",  icon: Radio,       label: "Live Feed"       },
  { id: "teams",     icon: UsersRound,  label: "Teams"           },
  { id: "users",     icon: Users,       label: "User Management" },
  { id: "auditlog",  icon: ClipboardList, label: "Audit Log"     },
  { id: "quota",     icon: BarChart3,    label: "Quota & Usage"  },
];

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

const inputCls = "w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all";
const inputStyle = {
  background: "var(--bg-raised)",
  border: "0.5px solid rgba(224,224,224,0.09)",
  color: "var(--fg-primary)",
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
const ROLES = ["member", "admin"] as const;

const PLAN_DETAILS: Record<string, { name: string; usd_budget: number; matter_limit: number | null; seat_limit: number | null; price_usd: number | null; features: string[] }> = {
  starter:      { name: "Starter",      usd_budget: 8,   matter_limit: 10, seat_limit: 1,    price_usd: 45,   features: ["Research","Draft","Citations"] },
  professional: { name: "Professional", usd_budget: 20,  matter_limit: 25, seat_limit: 3,    price_usd: 95,   features: ["Research","Draft","Citations","Strategy","Judge Intel"] },
  firm:         { name: "Firm",         usd_budget: 35,  matter_limit: 60, seat_limit: 10,   price_usd: 200,  features: ["Research","Draft","Citations","Strategy","Judge Intel","Conflict","Timeline"] },
  premium:      { name: "Premium",      usd_budget: 150, matter_limit: null, seat_limit: null, price_usd: 2000, features: ["All features","Custom development","Dedicated support","Personal onboarding"] },
};

function BillingTab() {
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

function TeamsTab() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("get_admin_teams");
      setTeams(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function createTeam() {
    if (!newTeamName.trim() || !user) return;
    setSaving(true);
    const slug = newTeamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await supabase.from("teams").insert({
      name: newTeamName.trim(),
      slug: `${slug}-${Date.now()}`,
      owner_id: user.id,
    }).select().single();
    if (!error && data) {
      await supabase.from("team_members").insert({ team_id: data.id, user_id: user.id, role: "owner" });
      setTeams((prev) => [{ ...data, owner_email: "", member_count: 1 }, ...prev]);
      setNewTeamName("");
      setCreating(false);
    }
    setSaving(false);
  }

  async function deleteTeam(teamId: string) {
    await supabase.from("teams").delete().eq("id", teamId);
    setTeams((prev) => prev.filter((t) => t.team_id !== teamId));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionHeading>ALL TEAMS</SectionHeading>
        <button
          onClick={() => setCreating(true)}
          className="lex-btn lex-btn--primary"
        >
          <Plus size={12} /> New Team
        </button>
      </div>

      {creating && (
        <div className="rounded p-4 mb-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <p className="text-xs font-mono mb-2" style={{ color: "var(--fg-tertiary)" }}>TEAM NAME</p>
          <div className="flex gap-2">
            <input
              className={inputCls}
              style={{ ...inputStyle, flex: 1 }}
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Acme Legal Team"
              onKeyDown={(e) => e.key === "Enter" && createTeam()}
              autoFocus
            />
            <button
              onClick={createTeam}
              disabled={saving || !newTeamName.trim()}
              className="lex-btn lex-btn--primary"
            >
              {saving ? "…" : "Create"}
            </button>
            <button
              onClick={() => { setCreating(false); setNewTeamName(""); }}
              className="lex-btn lex-btn--ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>No teams yet. Create one to start collaborating.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-raised)" }}>
                {["Name", "Owner", "Plan", "Members", "Created", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.team_id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                  <td className="px-3 py-2.5 font-medium" style={{ color: "var(--fg-primary)" }}>{t.team_name}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: "var(--fg-tertiary)" }}>{t.owner_email || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--bg-raised)", color: "var(--fg-tertiary)" }}>{t.plan_id}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--fg-primary)" }}>{t.member_count}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: "var(--fg-tertiary)" }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => deleteTeam(t.team_id)}
                      className="p-1 rounded cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--verdict-crimson)" }}
                      title="Delete team"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserManagementTab() {
  const { user: selfUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Set-password modal
  const [pwTarget, setPwTarget] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Create-user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", role: "member", plan_id: "starter" });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const now = new Date();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_admin_users");
    if (error || !data) { setLoading(false); return; }

    const userIds = (data as any[]).map((u: any) => u.user_id);
    const { data: usageData } = await supabase
      .from("usage_monthly")
      .select("user_id, total_usd_cost, total_requests")
      .in("user_id", userIds)
      .eq("year", now.getFullYear())
      .eq("month", now.getMonth() + 1);

    const usageMap: Record<string, { total_usd_cost: number; total_requests: number }> = {};
    (usageData ?? []).forEach((u: any) => { usageMap[u.user_id] = u; });

    setUsers((data as any[]).map((u: any) => ({
      user_id: u.user_id,
      role: u.role,
      plan_id: u.plan_id,
      byok_active: u.byok_active,
      profiles: { email: u.email, full_name: u.full_name },
      usage_monthly: usageMap[u.user_id] ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changePlan(userId: string, planId: string) {
    setUpdating(userId);
    await supabase.from("user_roles").update({ plan_id: planId }).eq("user_id", userId);
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, plan_id: planId } : u));
    setUpdating(null);
  }

  async function changeRole(userId: string, role: string) {
    setUpdating(userId);
    await supabase.from("user_roles").update({ role }).eq("user_id", userId);
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role } : u));
    setUpdating(null);
  }

  async function handleSetPassword() {
    if (!pwTarget || newPw.length < 6) { setPwError("Minimum 6 characters"); return; }
    setPwLoading(true); setPwError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ userId: pwTarget.user_id, password: newPw }),
    });
    const json = await res.json();
    setPwLoading(false);
    if (!res.ok) { setPwError(json.error ?? "Failed"); return; }
    setPwTarget(null); setNewPw(""); setPwError("");
  }

  async function handleCreateUser() {
    if (!createForm.email || createForm.password.length < 6) { setCreateError("Email and password (min 6) required"); return; }
    setCreateLoading(true); setCreateError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(createForm),
    });
    const json = await res.json();
    setCreateLoading(false);
    if (!res.ok) { setCreateError(json.error ?? "Failed"); return; }
    setShowCreate(false);
    setCreateForm({ email: "", password: "", role: "member", plan_id: "starter" });
    await load();
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ userId: deleteTarget.user_id }),
    });
    setDeleteLoading(false);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.user_id !== deleteTarget.user_id));
      setDeleteTarget(null);
    }
  }

  const filtered = users.filter((u) => {
    const email = u.profiles?.email ?? "";
    const name = u.profiles?.full_name ?? "";
    return email.includes(search) || name.includes(search) || u.plan_id.includes(search);
  });

  const modalBase: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
  };
  const modalCard: React.CSSProperties = {
    background: "var(--bg-surface)", border: "0.5px solid rgba(224,224,224,0.12)",
    borderRadius: 8, padding: "1.5rem", width: 360, maxWidth: "90vw",
  };

  return (
    <div>
      {/* Set Password Modal */}
      {pwTarget && (
        <div style={modalBase} onClick={() => setPwTarget(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>
                Set Password — {pwTarget.profiles?.email}
              </span>
              <button onClick={() => setPwTarget(null)} className="lex-btn lex-btn--icon"><X size={14} /></button>
            </div>
            <input
              type="password"
              className={inputCls}
              style={inputStyle}
              placeholder="New password (min 6 chars)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
              autoFocus
            />
            {pwError && <p className="text-xs mt-2" style={{ color: "var(--verdict-crimson)" }}>{pwError}</p>}
            <div className="flex gap-2 mt-4">
              <button className="lex-btn lex-btn--primary" onClick={handleSetPassword} disabled={pwLoading}>
                <KeyRound size={12} /> {pwLoading ? "Saving…" : "Set Password"}
              </button>
              <button className="lex-btn lex-btn--ghost" onClick={() => { setPwTarget(null); setNewPw(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div style={modalBase} onClick={() => setShowCreate(false)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Create New User</span>
              <button onClick={() => setShowCreate(false)} className="lex-btn lex-btn--icon"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <input className={inputCls} style={inputStyle} placeholder="Email" value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
              <input type="password" className={inputCls} style={inputStyle} placeholder="Password (min 6 chars)"
                value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
              <div className="flex gap-2">
                <select className="rounded px-2 py-1.5 text-xs flex-1"
                  style={{ background: "var(--bg-raised)", color: "var(--fg-primary)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                  value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className="rounded px-2 py-1.5 text-xs flex-1"
                  style={{ background: "var(--bg-raised)", color: "var(--fg-primary)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                  value={createForm.plan_id} onChange={(e) => setCreateForm((f) => ({ ...f, plan_id: e.target.value }))}>
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            {createError && <p className="text-xs mt-2" style={{ color: "var(--verdict-crimson)" }}>{createError}</p>}
            <div className="flex gap-2 mt-4">
              <button className="lex-btn lex-btn--primary" onClick={handleCreateUser} disabled={createLoading}>
                <UserPlus size={12} /> {createLoading ? "Creating…" : "Create User"}
              </button>
              <button className="lex-btn lex-btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={modalBase} onClick={() => setDeleteTarget(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>Delete user?</p>
            <p className="text-xs mb-4" style={{ color: "var(--fg-tertiary)" }}>
              <strong style={{ color: "var(--verdict-crimson)" }}>{deleteTarget.profiles?.email}</strong> will be permanently removed including all their data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button className="lex-btn lex-btn--danger" onClick={handleDeleteUser} disabled={deleteLoading}>
                <Trash2 size={12} /> {deleteLoading ? "Deleting…" : "Delete permanently"}
              </button>
              <button className="lex-btn lex-btn--ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <SectionHeading>ALL USERS</SectionHeading>
        <button className="lex-btn lex-btn--primary" onClick={() => { setCreateError(""); setShowCreate(true); }}>
          <UserPlus size={12} /> Invite User
        </button>
      </div>

      <input
        className={inputCls}
        style={{ ...inputStyle, marginBottom: "1rem" }}
        placeholder="Search by email, name, or plan…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--fg-tertiary)" }}>No users found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-raised)" }}>
                {["Email", "Name", "Role", "Plan", "Usage (mo)", "Requests", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const spent = Number(u.usage_monthly?.total_usd_cost ?? 0);
                const isSelf = u.user_id === selfUser?.id;
                return (
                  <tr key={u.user_id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--fg-primary)" }}>
                      {u.profiles?.email ?? "—"}
                      {isSelf && <span className="ml-1.5 font-mono text-[9px]" style={{ color: "var(--verdict-neon)" }}>YOU</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--fg-tertiary)" }}>
                      {u.profiles?.full_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <select value={u.role} disabled={updating === u.user_id}
                        onChange={(e) => changeRole(u.user_id, e.target.value)}
                        className="rounded px-2 py-1 text-xs"
                        style={{
                          background: u.role === "admin" ? "var(--verdict-amber)" : "var(--bg-raised)",
                          color: u.role === "admin" ? "#000" : "var(--fg-tertiary)",
                          border: "0.5px solid rgba(224,224,224,0.09)",
                        }}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <select value={u.plan_id} disabled={updating === u.user_id}
                        onChange={(e) => changePlan(u.user_id, e.target.value)}
                        className="rounded px-2 py-1 text-xs"
                        style={{ background: "var(--bg-raised)", color: "var(--fg-primary)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--fg-primary)" }}>
                      ${spent.toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--fg-tertiary)" }}>
                      {u.usage_monthly?.total_requests ?? 0}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="lex-btn lex-btn--icon"
                          title="Set password"
                          onClick={() => { setNewPw(""); setPwError(""); setPwTarget(u); }}
                        >
                          <KeyRound size={13} />
                        </button>
                        {!isSelf && (
                          <button
                            className="lex-btn lex-btn--icon"
                            title="Delete user"
                            style={{ color: "var(--verdict-crimson)" }}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: "var(--fg-tertiary)" }}>
        {filtered.length} user{filtered.length !== 1 ? "s" : ""} · Usage data: {now.toLocaleString("default", { month: "long" })} {now.getFullYear()}
      </p>
    </div>
  );
}

interface AuditRow {
  id: number;
  user_email: string | null;
  matter_title: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

function AuditLogTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sealing, setSealing] = useState(false);
  const [sealMsg, setSealMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE = 50;

  async function load(p: number) {
    setLoading(true);
    const { data } = await supabase.rpc("get_audit_log", { p_limit: PAGE, p_offset: p * PAGE });
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sealCheckpoint() {
    setSealing(true);
    setSealMsg(null);
    const now = new Date();
    const { data, error } = await supabase.rpc("generate_audit_checkpoint", {
      p_year: now.getFullYear(),
      p_month: now.getMonth() + 1,
    });
    setSealMsg(error ? `Error: ${error.message}` : `Sealed. SHA-256: ${data}`);
    setSealing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionHeading>AUDIT LOG</SectionHeading>
        <button
          onClick={sealCheckpoint}
          disabled={sealing}
          className="lex-btn lex-btn--secondary"
        >
          <Lock size={11} />
          {sealing ? "Sealing…" : "Seal This Month"}
        </button>
      </div>

      {sealMsg && (
        <div
          className="rounded px-3 py-2 mb-4 text-xs font-mono break-all"
          style={{ background: "var(--bg-raised)", color: "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}
        >
          {sealMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>No audit events yet.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-raised)" }}>
                  {["Time", "User", "Action", "Entity", "Matter"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                    <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: "var(--fg-tertiary)" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: "var(--fg-primary)" }}>
                      {r.user_email ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: "var(--verdict-neon)" }}>
                      {r.action}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                      {r.entity_type ?? ""}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "var(--fg-tertiary)" }}>
                      {r.matter_title ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="lex-btn lex-btn--ghost"
            >
              Previous
            </button>
            <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={rows.length < PAGE}
              className="lex-btn lex-btn--ghost"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function QuotaBar({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  const color = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--fg-primary)" }}>{label}</span>
        <span className="text-xs font-mono" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--fg-tertiary)" }}>{detail}</p>
    </div>
  );
}

function TokenBarSimple({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs w-24 flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-16 text-right" style={{ color: "var(--fg-secondary)" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function QuotaTab() {
  const { quota, loading: quotaLoading } = useQuota();
  const { data: myUsage, loading: usageLoading, total, memTotal, efficiency } = useMyTokenUsage();
  const { isAdmin } = useAuth();
  const { users: adminUsers, trend, loading: adminLoading, grandTotal, avgEfficiency } = useAdminTokenUsage();

  if (quotaLoading) return <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>;
  if (!quota) return <p style={{ color: "var(--fg-tertiary)" }}>Unable to load quota data.</p>;

  const storageMB = (quota.storage_bytes / (1024 * 1024)).toFixed(1);
  const storageLimitMB = quota.storage_limit_mb ? `${quota.storage_limit_mb} MB` : "Unlimited";
  const tabMax = myUsage.length > 0 ? Math.max(...myUsage.map(r => r.input_tok + r.output_tok)) : 1;

  return (
    <div className="space-y-6">
      {/* Plan quota */}
      <div>
        <SectionHeading>PLAN QUOTA</SectionHeading>
        <div className="rounded p-5" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <QuotaBar label="Matters" pct={matterPercent(quota)} detail={`${quota.matter_count} / ${quota.matter_limit ?? "Unlimited"} matters`} />
          <QuotaBar label="AI Budget" pct={aiPercent(quota)} detail={`$${quota.ai_spent.toFixed(4)} spent of $${quota.ai_budget} · ${quota.ai_requests} requests this month`} />
          <QuotaBar label="Storage" pct={storagePercent(quota)} detail={`${storageMB} MB used of ${storageLimitMB}`} />
        </div>
        <div className="rounded p-3 mt-2 text-xs font-mono" style={{ background: "var(--bg-raised)", color: "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          Plan: <span style={{ color: "var(--verdict-neon)" }}>{quota.plan_id}</span>
        </div>
      </div>

      {/* My token usage this month */}
      <div>
        <SectionHeading>MY TOKEN USAGE (THIS MONTH)</SectionHeading>
        {usageLoading ? (
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
        ) : (
          <div className="rounded p-5" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-lg font-mono font-semibold" style={{ color: "var(--verdict-neon)" }}>{total.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>Total tokens</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold" style={{ color: "var(--verdict-amber)" }}>{memTotal.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>LexMemory injected</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold" style={{ color: efficiency > 15 ? "var(--verdict-neon)" : "var(--fg-secondary)" }}>{efficiency}%</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>Memory efficiency</p>
              </div>
            </div>
            {myUsage.length > 0 && (
              <div className="pt-3" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                <p className="text-xs mb-2 font-mono tracking-wide" style={{ color: "var(--fg-tertiary)" }}>TOKENS BY TAB</p>
                {myUsage.map(r => (
                  <TokenBarSimple
                    key={r.tab}
                    label={r.tab}
                    value={r.input_tok + r.output_tok}
                    max={tabMax}
                    color="var(--verdict-neon)"
                  />
                ))}
              </div>
            )}
            {myUsage.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: "var(--fg-quaternary)" }}>No AI calls logged this month yet</p>
            )}
          </div>
        )}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div>
          <SectionHeading>ADMIN — ALL USERS (THIS MONTH)</SectionHeading>
          {adminLoading ? (
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
          ) : (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="rounded p-4 grid grid-cols-2 gap-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <div>
                  <p className="text-sm font-mono font-semibold" style={{ color: "var(--verdict-neon)" }}>{grandTotal.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Platform total tokens</p>
                </div>
                <div>
                  <p className="text-sm font-mono font-semibold" style={{ color: "var(--verdict-amber)" }}>{avgEfficiency}%</p>
                  <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Avg LexMemory efficiency</p>
                </div>
              </div>

              {/* Top users table */}
              {adminUsers.length > 0 && (
                <div className="rounded overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--bg-raised)" }}>
                        {["User", "Input", "Output", "Mem%", "Calls"].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-mono tracking-wide" style={{ color: "var(--fg-tertiary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.user_id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)" }}>
                          <td className="px-3 py-2 truncate max-w-[140px]" style={{ color: "var(--fg-secondary)" }}>{u.email}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--fg-primary)" }}>{u.input_tok.toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--fg-primary)" }}>{u.output_tok.toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: u.efficiency > 15 ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>{u.efficiency}%</td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--fg-tertiary)" }}>{u.calls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily trend */}
              {trend.length > 0 && (
                <div className="rounded p-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                  <p className="text-xs mb-3 font-mono tracking-wide" style={{ color: "var(--fg-tertiary)" }}>DAILY TREND (7 DAYS)</p>
                  <div className="flex items-end gap-1 h-12">
                    {(() => {
                      const maxVal = Math.max(...trend.map(d => d.input_tok + d.output_tok), 1);
                      return trend.map(d => {
                        const total = d.input_tok + d.output_tok;
                        const pct = Math.max(4, Math.round((total / maxVal) * 100));
                        return (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${total.toLocaleString()} tokens`}>
                            <div className="w-full rounded-t" style={{ height: `${pct}%`, background: "var(--verdict-neon)", opacity: 0.7 }} />
                            <span className="text-[9px] font-mono" style={{ color: "var(--fg-quaternary)" }}>{d.day.slice(5)}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {adminUsers.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "var(--fg-quaternary)" }}>No AI usage logged this month yet</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ARES Inspector Tab ────────────────────────────────────────────────────────

interface AiUsageRow {
  id: string;
  user_id: string;
  matter_id: string | null;
  tab: string;
  input_tok: number;
  output_tok: number;
  mem_injected: number;
  model: string | null;
  created_at: string;
  user_email?: string;
  matter_title?: string;
}

function AresTab() {
  const { settings } = useSettings();
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lexStats, setLexStats] = useState<{ mattersWithMemory: number; avgNodes: number; totalInputTok: number; totalOutputTok: number; memRatio: number } | null>(null);

  useEffect(() => {
    async function load() {
      const [usageRes, statsRes] = await Promise.all([
        supabase
          .from("ai_usage")
          .select("id, user_id, matter_id, tab, input_tok, output_tok, mem_injected, model, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.rpc("get_admin_token_summary"),
      ]);

      setRows(usageRes.data ?? []);

      if (statsRes.data) {
        const d = statsRes.data as { total_input_tok: number; total_output_tok: number; total_mem_injected: number } | null;
        if (d) {
          const totalIn = Number(d.total_input_tok ?? 0);
          const totalOut = Number(d.total_output_tok ?? 0);
          const memIn = Number(d.total_mem_injected ?? 0);
          setLexStats({ mattersWithMemory: 0, avgNodes: 0, totalInputTok: totalIn, totalOutputTok: totalOut, memRatio: totalIn > 0 ? Math.round((memIn / totalIn) * 100) : 0 });
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const promptTok = Math.round(settings.systemPrompt.length / 4);
  const promptChars = settings.systemPrompt.length;

  return (
    <div>
      <SectionHeading>ACTIVE SYSTEM PROMPT (ARES v3.0)</SectionHeading>
      <div className="rounded p-4 mb-6" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(0,255,195,0.14)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Brain size={14} style={{ color: "var(--verdict-neon)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--verdict-neon)" }}>ARES v3.0</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: "var(--fg-tertiary)" }}>
            <span>{promptChars.toLocaleString()} chars</span>
            <span>~{promptTok.toLocaleString()} tokens</span>
          </div>
        </div>
        <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed" style={{ color: "var(--fg-secondary)", fontFamily: "var(--font-mono)" }}>
          {settings.systemPrompt.slice(0, 800)}{settings.systemPrompt.length > 800 ? "\n…(truncated)" : ""}
        </pre>
      </div>

      {lexStats && (
        <>
          <SectionHeading>LEXMEMORY EFFICIENCY</SectionHeading>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Input Tokens", value: lexStats.totalInputTok.toLocaleString(), color: "var(--verdict-neon)" },
              { label: "Output Tokens", value: lexStats.totalOutputTok.toLocaleString(), color: "var(--verdict-violet)" },
              { label: "Memory Inject %", value: `${lexStats.memRatio}%`, color: "var(--verdict-amber)" },
            ].map(stat => (
              <div key={stat.label} className="rounded p-3 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <p className="text-lg font-mono font-semibold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeading>LAST 20 AI CALLS</SectionHeading>
      {loading ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--fg-quaternary)" }}>No AI usage logged yet</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(row => (
            <div key={row.id} className="flex items-center justify-between rounded px-4 py-2.5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.2)" }}>
                  {row.tab}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-mono truncate" style={{ color: "var(--fg-secondary)" }}>
                    {row.model ?? "waterfall"} · in:{row.input_tok} out:{row.output_tok}
                    {row.mem_injected > 0 && <span style={{ color: "var(--verdict-amber)" }}> mem:{row.mem_injected}</span>}
                  </p>
                </div>
              </div>
              <span className="text-xs flex-shrink-0 ml-4 font-mono" style={{ color: "var(--fg-quaternary)" }}>
                {new Date(row.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live Feed Tab (B5) ────────────────────────────────────────────────────────

function LiveFeedTab() {
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Load recent 50 rows
    supabase
      .from("ai_usage")
      .select("id, user_id, matter_id, tab, input_tok, output_tok, mem_injected, model, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows(data ?? []));

    // Subscribe to new inserts
    const channel = supabase
      .channel("ai_usage_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_usage" }, payload => {
        if (!paused) {
          setRows(prev => [payload.new as AiUsageRow, ...prev].slice(0, 100));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update paused state effect for subscription
  useEffect(() => {
    if (!paused) return;
    // when paused changes, we just gate the push in the handler above
  }, [paused]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio size={14} style={{ color: paused ? "var(--fg-tertiary)" : "var(--verdict-neon)" }} />
          <span className="text-xs font-mono" style={{ color: paused ? "var(--fg-tertiary)" : "var(--verdict-neon)" }}>
            {paused ? "PAUSED" : "LIVE"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{rows.length} events</span>
          <button
            onClick={() => setPaused(p => !p)}
            className="lex-btn lex-btn--ghost text-xs"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => setRows([])}
            className="lex-btn lex-btn--ghost text-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded px-4 py-10 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <Radio size={24} className="mx-auto mb-2" style={{ color: "var(--fg-tertiary)" }} />
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Waiting for AI requests… Make a request in any matter tab to see it appear here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded px-3 py-2"
              style={{
                background: i === 0 && !paused ? "rgba(0,255,195,0.04)" : "rgba(17,17,20,0.6)",
                border: `0.5px solid ${i === 0 && !paused ? "rgba(0,255,195,0.18)" : "rgba(224,224,224,0.07)"}`,
              }}
            >
              <div className="flex items-center gap-3 min-w-0 text-xs">
                <span className="font-mono flex-shrink-0" style={{ color: "var(--fg-quaternary)" }}>
                  {new Date(row.created_at).toLocaleTimeString()}
                </span>
                <span className="px-1.5 py-0.5 rounded font-mono text-[10px] flex-shrink-0" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.18)" }}>
                  {row.tab}
                </span>
                <span className="truncate" style={{ color: "var(--fg-secondary)" }}>{row.model ?? "waterfall"}</span>
              </div>
              <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-4 font-mono" style={{ color: "var(--fg-tertiary)" }}>
                <span style={{ color: "var(--verdict-neon)" }}>↑{row.input_tok}</span>
                <span style={{ color: "var(--verdict-violet)" }}>↓{row.output_tok}</span>
                {row.mem_injected > 0 && <span style={{ color: "var(--verdict-amber)" }}>M:{row.mem_injected}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Telemetry Tab ─────────────────────────────────────────────────────────────

type SvcStatus = "green" | "amber" | "red";
interface SvcResult { status: SvcStatus; latencyMs: number; error?: string; }
interface HealthDeepPayload {
  overall: SvcStatus;
  services: Record<string, SvcResult>;
  ts: string;
}

const SERVICE_CATEGORIES: { label: string; keys: string[] }[] = [
  { label: "AI PROVIDERS", keys: ["anthropic", "groq", "gemini", "cerebras", "xai", "mistral", "sambanova", "nvidia"] },
  { label: "DATABASE", keys: ["supabase"] },
  { label: "LEGAL APIs", keys: ["courtlistener", "govinfo", "openstates", "congress", "ecfr"] },
  { label: "INFRASTRUCTURE", keys: ["render"] },
];

const SERVICE_META: Record<string, { label: string; desc: string }> = {
  supabase:      { label: "Supabase",        desc: "Auth + database + realtime" },
  anthropic:     { label: "Anthropic Claude", desc: "Primary AI — BYOK / paid tier" },
  groq:          { label: "Groq",             desc: "Waterfall #1 — Llama ultra-fast" },
  gemini:        { label: "Gemini",           desc: "Waterfall #2 — Google" },
  cerebras:      { label: "Cerebras",         desc: "Waterfall #3 — wafer-scale" },
  xai:           { label: "xAI Grok",         desc: "Waterfall #4" },
  mistral:       { label: "Mistral",          desc: "Waterfall #5" },
  sambanova:     { label: "SambaNova",        desc: "Waterfall #6 — RDU inference" },
  nvidia:        { label: "NVIDIA NIM",       desc: "Waterfall #7 — accelerated" },
  courtlistener: { label: "CourtListener",    desc: "9M+ opinions, judge profiles" },
  govinfo:       { label: "GovInfo",          desc: "Federal Register, CFR, USCIS" },
  openstates:    { label: "OpenStates",       desc: "State legislature & bills" },
  congress:      { label: "Congress.gov",     desc: "Federal bills, resolutions" },
  ecfr:          { label: "eCFR",             desc: "Electronic Code of Federal Regs" },
  render:        { label: "Render (self)",    desc: "API cold-start / uptime" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function StatusDot({ status }: { status: SvcStatus }) {
  const colors: Record<SvcStatus, string> = { green: "#00FFC3", amber: "#FFB800", red: "#FF3355" };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[status], boxShadow: `0 0 6px ${colors[status]}80` }}
    />
  );
}

const PROVIDER_COLOR: Record<string, string> = {
  anthropic:  "var(--verdict-neon)",
  groq:       "#f55",
  cerebras:   "#a78bfa",
  sambanova:  "var(--verdict-amber)",
  openrouter: "#38bdf8",
  nvidia:     "#76c93a",
  xai:        "#e5e5e5",
  mistral:    "#ff8c69",
  gemini:     "#4285f4",
  "gemini-2": "#4285f4",
};

function WaterfallStatsPanel() {
  const { data, loading, error, reload } = useWaterfallStats(30);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--fg-tertiary)" }}>LLM PROVIDER ROUTING — LAST 30 DAYS</p>
        <button onClick={reload} disabled={loading} className="lex-btn lex-btn--secondary" style={{ fontSize: "0.7rem", padding: "3px 10px" }}>
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--verdict-crimson)" }}>{error}</p>
      )}

      {!loading && data.length === 0 && (
        <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>No AI calls recorded yet — apply migration 016 if needed.</p>
      )}

      {data.length > 0 && (
        <div className="rounded overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Provider", "Calls", "Avg Tok", "Total Tok", "Share", "Last Used"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: WaterfallStat) => {
                const color = PROVIDER_COLOR[row.provider] ?? "var(--fg-secondary)";
                return (
                  <tr key={row.provider} style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)" }}>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${color}14`, color, border: `0.5px solid ${color}40` }}>
                        {row.provider}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--fg-primary)" }}>{row.call_count.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--fg-tertiary)" }}>{Number(row.avg_tok).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--fg-tertiary)" }}>
                      {(Number(row.total_input_tok) + Number(row.total_output_tok)).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(224,224,224,0.07)", minWidth: 48 }}>
                          <div className="h-1 rounded-full" style={{ width: `${row.pct_of_total}%`, background: color }} />
                        </div>
                        <span className="font-mono text-[10px] flex-shrink-0" style={{ color: "var(--fg-quaternary)" }}>{row.pct_of_total}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>
                      {new Date(row.last_seen).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const SERVICE_LINKS: Record<string, string> = {
  supabase:      "https://supabase.com/dashboard",
  anthropic:     "https://console.anthropic.com",
  groq:          "https://console.groq.com",
  gemini:        "https://aistudio.google.com",
  cerebras:      "https://cloud.cerebras.ai",
  xai:           "https://console.x.ai",
  mistral:       "https://console.mistral.ai",
  sambanova:     "https://cloud.sambanova.ai",
  nvidia:        "https://build.nvidia.com",
  courtlistener: "https://www.courtlistener.com",
  govinfo:       "https://api.govinfo.gov",
  congress:      "https://api.congress.gov",
  ecfr:          "https://www.ecfr.gov",
  render:        "https://dashboard.render.com",
};

const STATUS_COLOR: Record<SvcStatus, string> = {
  green: "rgba(0,255,195,0.28)",
  amber: "rgba(255,184,0,0.28)",
  red:   "rgba(255,51,85,0.3)",
};

function TelemetryTab() {
  const [health, setHealth] = useState<HealthDeepPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [selectedSvc, setSelectedSvc] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = API_URL || "https://lexagent-0o5u.onrender.com";
      const res = await fetch(`${base}/api/health/deep`, { headers: getApiHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as HealthDeepPayload;
      setHealth(data);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <SectionHeading>API CONNECTIVITY</SectionHeading>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
          Live probe of all integrated services. Results shown in milliseconds.
          {lastRun && <span className="ml-2">Last run: {lastRun}</span>}
        </p>
        <button
          onClick={runCheck}
          disabled={loading}
          className="lex-btn lex-btn--primary"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Probing…" : health ? "Re-run" : "Run Health Check"}
        </button>
      </div>

      {error && (
        <div className="rounded px-4 py-3 mb-4 text-xs" style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}>
          {error}
        </div>
      )}

      {health && (
        <div className="mb-4 rounded px-4 py-2.5 flex items-center gap-2 text-xs" style={{
          background: health.overall === "green" ? "rgba(0,255,195,0.05)" : health.overall === "amber" ? "rgba(255,184,0,0.06)" : "rgba(255,51,85,0.08)",
          border: `0.5px solid ${health.overall === "green" ? "rgba(0,255,195,0.28)" : health.overall === "amber" ? "rgba(255,184,0,0.28)" : "rgba(255,51,85,0.3)"}`,
          color: health.overall === "green" ? "var(--verdict-neon)" : health.overall === "amber" ? "var(--verdict-amber)" : "var(--verdict-crimson)",
        }}>
          <StatusDot status={health.overall} />
          Overall: {health.overall.toUpperCase()} — {Object.values(health.services).filter(s => s.status === "green").length}/{Object.values(health.services).length} services healthy
        </div>
      )}

      <div className="space-y-5">
        {SERVICE_CATEGORIES.map(cat => (
          <div key={cat.label}>
            <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--fg-tertiary)" }}>{cat.label}</p>
            <div className="space-y-1.5">
              {cat.keys.map(key => {
                const meta = SERVICE_META[key];
                if (!meta) return null;
                const svc = health?.services[key];
                const isSelected = selectedSvc === key;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded px-4 py-3 cursor-pointer transition-all"
                    onClick={() => setSelectedSvc(isSelected ? null : key)}
                    style={{
                      background: isSelected ? "rgba(0,255,195,0.04)" : "rgba(17,17,20,0.7)",
                      border: `0.5px solid ${isSelected ? "rgba(0,255,195,0.28)" : "rgba(224,224,224,0.09)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {svc ? <StatusDot status={svc.status} /> : <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "rgba(224,224,224,0.18)" }} />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{meta.label}</p>
                        <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{meta.desc}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4 flex items-center gap-3">
                      {svc ? (
                        <>
                          <p className="text-xs font-mono" style={{ color: svc.status === "green" ? "var(--verdict-neon)" : svc.status === "amber" ? "var(--verdict-amber)" : "var(--verdict-crimson)" }}>
                            {svc.latencyMs}ms
                          </p>
                          {svc.error && <p className="text-xs truncate max-w-[160px]" style={{ color: "var(--fg-quaternary)" }}>{svc.error}</p>}
                        </>
                      ) : (
                        <p className="text-xs font-mono" style={{ color: "var(--fg-quaternary)" }}>—</p>
                      )}
                      <ChevronRight size={12} style={{ color: isSelected ? "var(--verdict-neon)" : "rgba(224,224,224,0.2)", transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* B6 — Service detail panel */}
      {selectedSvc && (() => {
        const meta = SERVICE_META[selectedSvc];
        const svc = health?.services[selectedSvc];
        const link = SERVICE_LINKS[selectedSvc];
        const borderColor = svc ? STATUS_COLOR[svc.status] : "rgba(224,224,224,0.09)";
        const textColor = svc
          ? svc.status === "green" ? "var(--verdict-neon)" : svc.status === "amber" ? "var(--verdict-amber)" : "var(--verdict-crimson)"
          : "var(--fg-tertiary)";
        return (
          <div className="mt-4 rounded p-4" style={{ background: "rgba(8,8,12,0.9)", border: `0.5px solid ${borderColor}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {svc ? <StatusDot status={svc.status} /> : <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: "rgba(224,224,224,0.18)" }} />}
                <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{meta?.label}</span>
                <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{meta?.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="lex-btn lex-btn--ghost text-xs">
                    <ExternalLink size={10} /> Dashboard
                  </a>
                )}
                <button onClick={runCheck} disabled={loading} className="lex-btn lex-btn--secondary text-xs">
                  <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Force re-probe
                </button>
                <button onClick={() => setSelectedSvc(null)} className="lex-btn lex-btn--ghost text-xs">✕</button>
              </div>
            </div>
            {svc ? (
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="rounded p-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                  <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">STATUS</p>
                  <p className="font-semibold" style={{ color: textColor }}>{svc.status.toUpperCase()}</p>
                </div>
                <div className="rounded p-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                  <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">LATENCY</p>
                  <p className="font-semibold" style={{ color: "var(--fg-primary)" }}>{svc.latencyMs}ms</p>
                </div>
                {svc.error && (
                  <div className="col-span-2 rounded p-3" style={{ background: "rgba(255,51,85,0.06)", border: "0.5px solid rgba(255,51,85,0.2)" }}>
                    <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">ERROR</p>
                    <p style={{ color: "var(--verdict-crimson)" }}>{svc.error}</p>
                  </div>
                )}
                <div className="col-span-2 rounded p-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.07)" }}>
                  <p style={{ color: "var(--fg-tertiary)" }} className="mb-1">LAST PROBED</p>
                  <p style={{ color: "var(--fg-secondary)" }}>{health?.ts ? new Date(health.ts).toLocaleString() : "—"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs py-2" style={{ color: "var(--fg-tertiary)" }}>Run a health check first to see probe details.</p>
            )}
          </div>
        );
      })()}

      <WaterfallStatsPanel />
    </div>
  );
}

const ADMIN_ONLY_TABS: TabKey[] = ["apikeys", "prompt", "telemetry", "ares", "livefeed", "users", "teams", "auditlog"];

export default function AdminPage() {
  const { settings, updateSettings } = useSettings();
  const { isAdmin } = useAuth();
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
            <SectionHeading>FIRM LOGO</SectionHeading>
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid var(--border-hair)" }}
              >
                {settings.firmLogo
                  ? <img src={settings.firmLogo} alt="Firm logo" className="w-full h-full object-contain" />
                  : <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--fg-quaternary)" }}>Logo</span>
                }
              </div>
              <div className="flex flex-col gap-2">
                <label
                  className="lex-btn lex-btn--secondary cursor-pointer text-xs"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => set("firmLogo", reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  Upload logo
                </label>
                {settings.firmLogo && (
                  <button className="lex-btn lex-btn--ghost text-xs" onClick={() => set("firmLogo", null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>

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
                      className="px-3 py-1.5 rounded text-xs font-mono tracking-wide cursor-pointer transition-all duration-150"
                      style={{
                        background: selected ? "rgba(0,255,195,0.06)" : "var(--bg-raised)",
                        border: `0.5px solid ${selected ? "rgba(0,255,195,0.28)" : "var(--border-hair)"}`,
                        color: selected ? "var(--verdict-neon)" : "var(--fg-tertiary)",
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
                className="flex items-center justify-between rounded px-4 py-3.5"
                style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{item.label}</span>
                    <LexTooltip content={item.tooltip} side="right">
                      <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help"
                        style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}>
                        ?
                      </span>
                    </LexTooltip>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => set(item.key, !(settings as unknown as Record<string, unknown>)[item.key])}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200"
                  style={{
                    background: (settings as unknown as Record<string, unknown>)[item.key] ? "var(--verdict-neon)" : "var(--bg-raised)",
                    border: "0.5px solid rgba(0,255,195,0.14)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                    style={{
                      background: "var(--fg-primary)",
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
                style={{ accentColor: "var(--verdict-neon)" }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>500</span>
                <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>8000</span>
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
                style={{ accentColor: "var(--verdict-neon)" }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Precise</span>
                <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Creative</span>
              </div>
            </Field>
          </div>
        );

      case "shield":
        return (
          <div>
            <SectionHeading>HALLUCINATION SHIELD</SectionHeading>
            <div
              className="rounded px-4 py-3.5 mb-4 flex items-center justify-between"
              style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
            >
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>Auto-Verify Citations</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
                  Automatically verify all citations against CourtListener after each research query
                </p>
              </div>
              <button
                onClick={() => set("autoVerify", !settings.autoVerify)}
                className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200 ml-4"
                style={{
                  background: settings.autoVerify ? "var(--verdict-neon)" : "var(--bg-raised)",
                  border: "0.5px solid rgba(0,255,195,0.14)",
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                  style={{
                    background: "var(--fg-primary)",
                    left: settings.autoVerify ? "calc(100% - 22px)" : "2px",
                  }}
                />
              </button>
            </div>
            <div
              className="rounded px-4 py-3 text-xs"
              style={{
                background: "rgba(0,255,195,0.06)",
                border: "0.5px solid rgba(0,255,195,0.28)",
                color: "var(--fg-secondary)",
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
              style={{ color: "var(--fg-tertiary)" }}
            >
              Reset to default
            </button>
          </div>
        );

      case "billing":
        return <BillingTab />;

      case "teams":
        return <TeamsTab />;

      case "users":
        return <UserManagementTab />;

      case "auditlog":
        return <AuditLogTab />;

      case "quota":
        return <QuotaTab />;

      case "telemetry":
        return <TelemetryTab />;

      case "ares":
        return <AresTab />;

      case "livefeed":
        return <LiveFeedTab />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <div
          className="w-8 h-8 rounded flex items-center justify-center"
          style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.28)" }}
        >
          <Building2 size={15} style={{ color: "var(--verdict-neon)" }} />
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Administration</h1>
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Firm profile, API keys, and preferences</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-48 flex-shrink-0 space-y-0.5">
          {ADMIN_TABS.filter(t => isAdmin || !ADMIN_ONLY_TABS.includes(t.id)).map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded p-5"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
          >
            {renderTab()}

            <div className="flex justify-end mt-6 pt-4" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
              <button
                onClick={save}
                className={`lex-btn ${saved ? "lex-btn--secondary" : "lex-btn--primary"}`}
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
