"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Key, Activity, ChevronRight, Users, CreditCard,
  UsersRound, Plus, Trash2, ClipboardList, Lock, BarChart3, Terminal,
} from "lucide-react";
import { useSettings } from "@/providers/settings-provider";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PRACTICE_AREAS } from "@/lib/settings";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { useQuota } from "@/hooks/useQuota";
import { readLog, clearLog, type LogEntry } from "@/lib/logger";
import { storagePercent, aiPercent, matterPercent } from "@/lib/quota";
import { useMyTokenUsage, useAdminTokenUsage } from "@/hooks/useTokenUsage";

type TabKey = "firm" | "apikeys" | "billing" | "users" | "teams" | "auditlog" | "telemetry" | "quota" | "debuglog";

const TABS: { id: TabKey; icon: React.ElementType; label: string }[] = [
  { id: "firm",      icon: Building2,     label: "Firm Profile"    },
  { id: "apikeys",   icon: Key,           label: "API Credentials" },
  { id: "billing",   icon: CreditCard,    label: "Billing & Plan"  },
  { id: "users",     icon: Users,         label: "User Management" },
  { id: "teams",     icon: UsersRound,    label: "Teams"           },
  { id: "auditlog",  icon: ClipboardList, label: "Audit Log"       },
  { id: "telemetry", icon: Activity,      label: "Telemetry"       },
  { id: "quota",     icon: BarChart3,     label: "Quota & Usage"   },
  { id: "debuglog",  icon: Terminal,      label: "Debug Log"       },
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


/* ── Types ──────────────────────────────────────────────────────────────── */
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
  starter:      { name: "Starter",      usd_budget: 8,   matter_limit: 10,   seat_limit: 1,    price_usd: 45,   features: ["Research","Draft","Citations"] },
  professional: { name: "Professional", usd_budget: 20,  matter_limit: 25,   seat_limit: 3,    price_usd: 95,   features: ["Research","Draft","Citations","Strategy","Judge Intel"] },
  firm:         { name: "Firm",         usd_budget: 35,  matter_limit: 60,   seat_limit: 10,   price_usd: 200,  features: ["Research","Draft","Citations","Strategy","Judge Intel","Conflict","Timeline"] },
  premium:      { name: "Premium",      usd_budget: 150, matter_limit: null, seat_limit: null, price_usd: 2000, features: ["All features","Custom development","Dedicated support","Personal onboarding"] },
};

/* ── Billing tab (admin view) ───────────────────────────────────────────── */
function DebugLogTab() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => { setEntries(readLog().slice().reverse()); }, []);

  const levelColor: Record<string, string> = {
    info:  "var(--fg-secondary)",
    warn:  "var(--verdict-amber)",
    error: "var(--verdict-crimson)",
    debug: "var(--fg-quaternary)",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>CLIENT DEBUG LOG</SectionHeading>
        <button
          className="lex-btn lex-btn--ghost text-xs"
          onClick={() => { clearLog(); setEntries([]); }}
        >
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="font-mono text-xs" style={{ color: "var(--fg-quaternary)" }}>No log entries yet. Perform some actions to populate.</p>
      ) : (
        <div className="overflow-y-auto max-h-[520px] rounded" style={{ background: "rgba(0,0,0,0.35)", border: "0.5px solid rgba(224,224,224,0.08)" }}>
          {entries.map((e, i) => (
            <div key={i} className="flex gap-2 px-3 py-1.5 font-mono text-[11px] border-b" style={{ borderColor: "rgba(224,224,224,0.05)" }}>
              <span className="flex-shrink-0 opacity-50" style={{ color: "var(--fg-quaternary)" }}>{e.ts.slice(11, 23)}</span>
              <span className="flex-shrink-0 w-10 uppercase" style={{ color: levelColor[e.level] ?? "var(--fg-secondary)" }}>{e.level}</span>
              <span className="flex-shrink-0 w-20 truncate opacity-70" style={{ color: "var(--verdict-neon)" }}>{e.tag}</span>
              <span className="flex-1 truncate" style={{ color: "var(--fg-secondary)" }} title={e.msg}>{e.msg}</span>
              {e.data !== undefined && (
                <span className="flex-shrink-0 max-w-[200px] truncate opacity-60" style={{ color: "var(--fg-tertiary)" }} title={JSON.stringify(e.data)}>
                  {JSON.stringify(e.data)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        className="lex-btn lex-btn--secondary text-xs mt-3"
        onClick={() => setEntries(readLog().slice().reverse())}
      >
        Refresh
      </button>
    </div>
  );
}

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
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>

      {data.plan_id !== "premium" && (
        <div className="rounded p-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.28)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--verdict-neon)" }}>Upgrade your plan</p>
          <p className="text-xs mb-3" style={{ color: "var(--fg-secondary)" }}>
            Get more matters, seats, and AI quota with a higher plan.
          </p>
          <a href="mailto:sales@lexagent.ai?subject=Upgrade%20Request" className="lex-btn lex-btn--primary">
            Contact Sales
          </a>
        </div>
      )}
    </div>
  );
}

/* ── Teams tab ──────────────────────────────────────────────────────────── */
function TeamsTab() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    supabase.rpc("get_admin_teams").then(({ data }) => {
      setTeams(data ?? []);
      setLoading(false);
    });
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
        <button onClick={() => setCreating(true)} className="lex-btn lex-btn--primary">
          <Plus size={12} /> New Team
        </button>
      </div>

      {creating && (
        <div className="rounded p-4 mb-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <p className="text-xs font-mono mb-2" style={{ color: "var(--fg-tertiary)" }}>TEAM NAME</p>
          <div className="flex gap-2">
            <input
              className="lex-input"
              style={{ flex: 1 }}
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Acme Legal Team"
              onKeyDown={(e) => e.key === "Enter" && createTeam()}
              autoFocus
            />
            <button onClick={createTeam} disabled={saving || !newTeamName.trim()} className="lex-btn lex-btn--primary">
              {saving ? "…" : "Create"}
            </button>
            <button onClick={() => { setCreating(false); setNewTeamName(""); }} className="lex-btn lex-btn--ghost">
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
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>{h}</th>
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
                  <td className="px-3 py-2.5 text-xs" style={{ color: "var(--fg-tertiary)" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => deleteTeam(t.team_id)}
                      className="p-1 rounded cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--verdict-crimson)" }}
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

/* ── User management tab ────────────────────────────────────────────────── */
function UserManagementTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const now = new Date();

  useEffect(() => {
    async function load() {
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
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const filtered = users.filter((u) => {
    const email = u.profiles?.email ?? "";
    const name = u.profiles?.full_name ?? "";
    return email.includes(search) || name.includes(search) || u.plan_id.includes(search);
  });

  return (
    <div>
      <SectionHeading>ALL USERS</SectionHeading>
      <input
        className="lex-input"
        style={{ marginBottom: "1rem" }}
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
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const spent = Number(u.usage_monthly?.total_usd_cost ?? 0);
                return (
                  <tr key={u.user_id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                    <td className="px-3 py-2.5" style={{ color: "var(--fg-primary)" }}>{u.profiles?.email ?? "—"}</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--fg-tertiary)" }}>{u.profiles?.full_name ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={u.role}
                        disabled={updating === u.user_id}
                        onChange={(e) => changeRole(u.user_id, e.target.value)}
                        className="rounded px-2 py-1 text-xs"
                        style={{ background: u.role === "admin" ? "var(--verdict-amber)" : "var(--bg-raised)", color: u.role === "admin" ? "#000" : "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={u.plan_id}
                        disabled={updating === u.user_id}
                        onChange={(e) => changePlan(u.user_id, e.target.value)}
                        className="rounded px-2 py-1 text-xs"
                        style={{ background: "var(--bg-raised)", color: "var(--fg-primary)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                      >
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--fg-primary)" }}>${spent.toFixed(4)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--fg-tertiary)" }}>{u.usage_monthly?.total_requests ?? 0}</td>
                    <td className="px-3 py-2.5">
                      <a href={`/settings?tab=profile&uid=${u.user_id}`} className="text-xs" style={{ color: "var(--verdict-neon)" }}>View</a>
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

/* ── Audit log tab ──────────────────────────────────────────────────────── */
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
        <button onClick={sealCheckpoint} disabled={sealing} className="lex-btn lex-btn--secondary">
          <Lock size={11} />
          {sealing ? "Sealing…" : "Seal This Month"}
        </button>
      </div>

      {sealMsg && (
        <div className="rounded px-3 py-2 mb-4 text-xs font-mono break-all" style={{ background: "var(--bg-raised)", color: "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
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
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                    <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: "var(--fg-tertiary)" }}>{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: "var(--fg-primary)" }}>{r.user_email ?? "—"}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: "var(--verdict-neon)" }}>{r.action}</td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                      {r.entity_type ?? ""}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "var(--fg-tertiary)" }}>{r.matter_title ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="lex-btn lex-btn--ghost">Previous</button>
            <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={rows.length < PAGE} className="lex-btn lex-btn--ghost">Next</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Quota tab ──────────────────────────────────────────────────────────── */
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
      <span className="text-xs font-mono w-16 text-right" style={{ color: "var(--fg-secondary)" }}>{value.toLocaleString()}</span>
    </div>
  );
}

function QuotaTab() {
  const { quota, loading: quotaLoading } = useQuota();
  const { data: myUsage, loading: usageLoading, total, memTotal, efficiency } = useMyTokenUsage();
  const { users: adminUsers, trend, loading: adminLoading, grandTotal, avgEfficiency } = useAdminTokenUsage();

  if (quotaLoading) return <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>;
  if (!quota) return <p style={{ color: "var(--fg-tertiary)" }}>Unable to load quota data.</p>;

  const storageMB = (quota.storage_bytes / (1024 * 1024)).toFixed(1);
  const storageLimitMB = quota.storage_limit_mb ? `${quota.storage_limit_mb} MB` : "Unlimited";
  const tabMax = myUsage.length > 0 ? Math.max(...myUsage.map(r => r.input_tok + r.output_tok)) : 1;

  return (
    <div className="space-y-6">
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
                  <TokenBarSimple key={r.tab} label={r.tab} value={r.input_tok + r.output_tok} max={tabMax} color="var(--verdict-neon)" />
                ))}
              </div>
            )}
            {myUsage.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: "var(--fg-quaternary)" }}>No AI calls logged this month yet</p>
            )}
          </div>
        )}
      </div>

      <div>
        <SectionHeading>ALL USERS — THIS MONTH</SectionHeading>
        {adminLoading ? (
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
        ) : (
          <div className="space-y-3">
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
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function AdministrationPage() {
  const { settings, updateSettings } = useSettings();
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("firm");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/settings");
  }, [authLoading, isAdmin, router]);

  if (authLoading || !isAdmin) return null;

  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const needsSave = ["firm", "apikeys"].includes(tab);

  const renderTab = () => {
    switch (tab) {
      case "firm":
        return (
          <div>
            <SectionHeading>FIRM LOGO</SectionHeading>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid var(--border-hair)" }}>
                {settings.firmLogo
                  ? <img src={settings.firmLogo} alt="Firm logo" className="w-full h-full object-contain" />
                  : <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--fg-quaternary)" }}>Logo</span>
                }
              </div>
              <div className="flex flex-col gap-2">
                <label className="lex-btn lex-btn--secondary cursor-pointer text-xs" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
                  <button className="lex-btn lex-btn--ghost text-xs" onClick={() => set("firmLogo", null)}>Remove</button>
                )}
              </div>
            </div>

            <SectionHeading>FIRM INFORMATION</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field label="FIRM NAME">
                <input className="lex-input" value={settings.firmName} onChange={e => set("firmName", e.target.value)} placeholder="Acme Law Group" />
              </Field>
              <Field label="FIRM EMAIL">
                <input className="lex-input" value={settings.firmEmail} onChange={e => set("firmEmail", e.target.value)} placeholder="info@lawfirm.com" />
              </Field>
              <Field label="PHONE">
                <input className="lex-input" value={settings.firmPhone} onChange={e => set("firmPhone", e.target.value)} placeholder="(555) 000-0000" />
              </Field>
              <Field label="WEBSITE">
                <input className="lex-input" value={settings.firmWebsite} onChange={e => set("firmWebsite", e.target.value)} placeholder="https://lawfirm.com" />
              </Field>
            </div>
            <Field label="STREET ADDRESS">
              <input className="lex-input" value={settings.firmAddress} onChange={e => set("firmAddress", e.target.value)} placeholder="123 Main St, Suite 400" />
            </Field>
            <div className="grid grid-cols-3 gap-x-4">
              <Field label="CITY">
                <input className="lex-input" value={settings.firmCity} onChange={e => set("firmCity", e.target.value)} />
              </Field>
              <Field label="STATE">
                <input className="lex-input" value={settings.firmState} onChange={e => set("firmState", e.target.value)} placeholder="CA" />
              </Field>
              <Field label="ZIP">
                <input className="lex-input" value={settings.firmZip} onChange={e => set("firmZip", e.target.value)} />
              </Field>
            </div>

            <SectionHeading>BAR & CREDENTIALS</SectionHeading>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="BAR NUMBER" tooltip="Your state bar admission number">
                <input className="lex-input" value={settings.barNumber} onChange={e => set("barNumber", e.target.value)} />
              </Field>
              <Field label="BAR JURISDICTION">
                <input className="lex-input" value={settings.barJurisdiction} onChange={e => set("barJurisdiction", e.target.value)} placeholder="State Bar of California" />
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
                className="lex-textarea"
                style={{ resize: "none", minHeight: 80 }}
                value={settings.letterheadText}
                onChange={e => set("letterheadText", e.target.value)}
                placeholder="e.g., Attorneys at Law · Serving Since 1998"
              />
            </Field>

            <SectionHeading>BILLING</SectionHeading>
            <Field label="DEFAULT HOURLY RATE ($)" tooltip="Used to calculate invoice totals in the Billing tab">
              <input
                className="lex-input"
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

      case "apikeys":
        return (
          <div>
            <SectionHeading>API CREDENTIALS</SectionHeading>
            <Field label="ANTHROPIC API KEY" tooltip="Get your key at console.anthropic.com — powers all AI features for the firm">
              <input
                className="lex-input"
                type="password"
                value={settings.anthropicKey}
                onChange={e => set("anthropicKey", e.target.value)}
                placeholder="sk-ant-…"
              />
            </Field>
            <Field label="COURTLISTENER TOKEN" tooltip="Free at courtlistener.com/help/api — unlocks 9M+ case law records">
              <input
                className="lex-input"
                type="password"
                value={settings.courtListenerToken}
                onChange={e => set("courtListenerToken", e.target.value)}
                placeholder="Token from courtlistener.com"
              />
            </Field>
            <Field label="GOVINFO API KEY" tooltip="Free at api.govinfo.gov — Federal Register, CFR, bills, statutes">
              <input
                className="lex-input"
                type="password"
                value={settings.govInfoKey}
                onChange={e => set("govInfoKey", e.target.value)}
                placeholder="GovInfo key"
              />
            </Field>
            <Field label="OPENSTATES API KEY" tooltip="Free at openstates.org — state legislature bills and votes">
              <input
                className="lex-input"
                type="password"
                value={settings.openStatesKey}
                onChange={e => set("openStatesKey", e.target.value)}
                placeholder="OpenStates key"
              />
            </Field>
          </div>
        );

      case "billing":
        return <BillingTab />;

      case "users":
        return <UserManagementTab />;

      case "teams":
        return <TeamsTab />;

      case "auditlog":
        return <AuditLogTab />;

      case "quota":
        return <QuotaTab />;

      case "telemetry":
        return (
          <div>
            <SectionHeading>API CONNECTIVITY</SectionHeading>
            <p className="text-xs mb-4" style={{ color: "var(--fg-tertiary)" }}>
              Test connectivity to all integrated APIs. Requires API keys to be set in API Credentials.
            </p>
            {[
              { name: "Anthropic Claude", desc: "AI inference — all research and drafting" },
              { name: "CourtListener", desc: "Case law database — 9M+ opinions" },
              { name: "GovInfo", desc: "Federal Register, CFR, statutes" },
              { name: "OpenStates", desc: "State legislature data" },
            ].map(api => (
              <div key={api.name} className="flex items-center justify-between rounded px-4 py-3 mb-2" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{api.name}</p>
                  <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{api.desc}</p>
                </div>
                <button className="rounded px-3 py-1.5 text-xs font-mono tracking-wide cursor-pointer transition-all duration-150" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}>
                  PING
                </button>
              </div>
            ))}
          </div>
        );

      case "debuglog":
        return <DebugLogTab />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.28)" }}>
          <Building2 size={15} style={{ color: "var(--verdict-neon)" }} />
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Administration</h1>
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Firm-wide settings, users, and compliance</p>
        </div>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0 space-y-0.5">
          {TABS.map(({ id, icon: Icon, label }) => {
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

        <div className="flex-1 min-w-0">
          <div className="rounded p-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
            {renderTab()}

            {needsSave && (
              <div className="flex justify-end mt-6 pt-4" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                <button onClick={save} className={`lex-btn ${saved ? "lex-btn--secondary" : "lex-btn--primary"}`}>
                  {saved ? "Saved" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
