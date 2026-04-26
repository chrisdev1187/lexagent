"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
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

export function TeamsTab() {
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
