"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, UserPlus, Copy, Check, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] tracking-widest mb-3 mt-6 first:mt-0" style={{ color: "var(--fg-tertiary)" }}>
      {children}
    </h3>
  );
}

const inputCls = "w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all";
const inputStyle = {
  background: "var(--bg-raised)",
  border: "0.5px solid rgba(224,224,224,0.09)",
  color: "var(--fg-primary)",
  outline: "none",
};

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
}

const SITE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || "https://lexagent-ochre.vercel.app";

export function TeamsTab() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  // Invite state
  const [invitingTeamId, setInvitingTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<Record<string, PendingInvite[]>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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

  async function loadPendingInvites(teamId: string) {
    const { data } = await supabase
      .from("team_invites")
      .select("id, email, role, token, expires_at, created_at")
      .eq("team_id", teamId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setPendingInvites((prev) => ({ ...prev, [teamId]: data ?? [] }));
  }

  async function openInvite(teamId: string) {
    setInvitingTeamId(teamId);
    setInviteEmail("");
    setInviteRole("member");
    setInviteError(null);
    await loadPendingInvites(teamId);
  }

  async function sendInvite(teamId: string) {
    if (!inviteEmail.trim() || !user) return;
    setSendingInvite(true);
    setInviteError(null);
    const { error } = await supabase.from("team_invites").insert({
      team_id: teamId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user.id,
    });
    if (error) {
      setInviteError(error.message);
    } else {
      setInviteEmail("");
      await loadPendingInvites(teamId);
    }
    setSendingInvite(false);
  }

  async function revokeInvite(inviteId: string, teamId: string) {
    await supabase.from("team_invites").delete().eq("id", inviteId);
    await loadPendingInvites(teamId);
  }

  function copyInviteLink(token: string) {
    const link = `${SITE_URL}/invite/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
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
              className={inputCls}
              style={{ ...inputStyle, flex: 1 }}
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
                  <th key={h} className="px-3 py-2 text-left font-mono text-[10px] tracking-wider" style={{ color: "var(--fg-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <><tr key={t.team_id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => invitingTeamId === t.team_id ? setInvitingTeamId(null) : openInvite(t.team_id)}
                        className="p-1 rounded cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: "var(--verdict-neon)" }}
                        title="Invite member"
                      >
                        <UserPlus size={13} />
                      </button>
                      <button
                        onClick={() => deleteTeam(t.team_id)}
                        className="p-1 rounded cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: "var(--verdict-crimson)" }}
                        title="Delete team"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
                {invitingTeamId === t.team_id && (
                  <tr key={`${t.team_id}-invite`}>
                    <td colSpan={6} className="px-3 pb-3 pt-0">
                      <div className="rounded p-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                        <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: "var(--fg-tertiary)" }}>INVITE TO {t.team_name.toUpperCase()}</p>
                        <div className="flex gap-2 mb-3">
                          <input
                            className={inputCls}
                            style={{ ...inputStyle, flex: 1 }}
                            placeholder="colleague@lawfirm.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendInvite(t.team_id)}
                            autoFocus
                          />
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                            className="rounded px-2 py-2 text-sm"
                            style={{ ...inputStyle, minWidth: 90 }}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => sendInvite(t.team_id)} disabled={sendingInvite || !inviteEmail.trim()} className="lex-btn lex-btn--primary">
                            {sendingInvite ? "…" : "Generate"}
                          </button>
                        </div>
                        {inviteError && <p className="text-xs mb-2" style={{ color: "var(--verdict-crimson)" }}>{inviteError}</p>}

                        {(pendingInvites[t.team_id] ?? []).length > 0 && (
                          <>
                            <p className="font-mono text-[10px] tracking-widest mt-4 mb-2" style={{ color: "var(--fg-tertiary)" }}>PENDING INVITES</p>
                            <div className="flex flex-col gap-1.5">
                              {(pendingInvites[t.team_id] ?? []).map((inv) => (
                                <div key={inv.id} className="flex items-center gap-2 text-xs rounded px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                                  <Clock size={11} style={{ color: "var(--fg-tertiary)", flexShrink: 0 }} />
                                  <span style={{ color: "var(--fg-secondary)", flex: 1 }}>{inv.email}</span>
                                  <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg-raised)", color: "var(--fg-tertiary)", fontSize: 10 }}>{inv.role}</span>
                                  <span style={{ color: "var(--fg-tertiary)" }}>
                                    exp {new Date(inv.expires_at).toLocaleDateString()}
                                  </span>
                                  <button
                                    onClick={() => copyInviteLink(inv.token)}
                                    className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ color: "var(--verdict-neon)" }}
                                    title="Copy invite link"
                                  >
                                    {copiedToken === inv.token ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                  <button
                                    onClick={() => revokeInvite(inv.id, t.team_id)}
                                    className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ color: "var(--verdict-crimson)" }}
                                    title="Revoke invite"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}</>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
