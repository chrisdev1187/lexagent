"use client";

import { useState, useEffect } from "react";
import { Search, KeyRound, Trash2, UserPlus, X } from "lucide-react";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import { getApiHeaders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

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

export function UserManagementTab() {
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

  // User detail drawer
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);

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
      usage_monthly: usageMap[u.user_id] || { total_usd_cost: 0, total_requests: 0 },
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function changePlan(userId: string, planId: string) {
    setUpdating(userId);
    const currentRole = users.find(u => u.user_id === userId)?.role || "member";
    const { error } = await supabase.rpc("admin_set_user_plan", { target_uid: userId, new_role: currentRole, new_plan_id: planId });
    if (error) alert(error.message);
    else await load();
    setUpdating(null);
  }

  async function changeRole(userId: string, role: string) {
    setUpdating(userId);
    const currentPlan = users.find(u => u.user_id === userId)?.plan_id || "starter";
    const { error } = await supabase.rpc("admin_set_user_plan", { target_uid: userId, new_role: role, new_plan_id: currentPlan });
    if (error) alert(error.message);
    else await load();
    setUpdating(null);
  }

  async function handleSetPassword() {
    if (!pwTarget || newPw.length < 6) return;
    setPwLoading(true);
    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getApiHeaders() },
      body: JSON.stringify({ userId: pwTarget.user_id, password: newPw }),
    });
    if (res.ok) { setPwTarget(null); setNewPw(""); }
    else { const e = await res.json(); setPwError(e.error || "Failed"); }
    setPwLoading(false);
  }

  async function handleCreateUser() {
    setCreateLoading(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getApiHeaders() },
      body: JSON.stringify(createForm),
    });
    if (res.ok) { setShowCreate(false); setCreateForm({ email: "", password: "", role: "member", plan_id: "starter" }); load(); }
    else { const e = await res.json(); setCreateError(e.error || "Failed"); }
    setCreateLoading(false);
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getApiHeaders() },
      body: JSON.stringify({ userId: deleteTarget.user_id }),
    });
    if (res.ok) { setDeleteTarget(null); load(); }
    setDeleteLoading(false);
  }

  const filtered = users.filter(u => (u.profiles?.email || "").toLowerCase().includes(search.toLowerCase()));

  const inputCls = "w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all";
  const inputStyle = {
    background: "var(--bg-raised)",
    border: "0.5px solid rgba(224,224,224,0.09)",
    color: "var(--fg-primary)",
    outline: "none",
  };

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
      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={detailUser}
        onClose={() => setDetailUser(null)}
        onRefreshList={load}
      />

      {/* Set Password Modal */}
      {pwTarget && (
        <div style={modalBase} onClick={() => setPwTarget(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>Set password</p>
            <p className="text-xs mb-4" style={{ color: "var(--fg-tertiary)" }}>User: {pwTarget.profiles?.email}</p>
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
                          title="User detail & sessions"
                          onClick={() => setDetailUser(u)}
                        >
                          <Search size={13} />
                        </button>
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
