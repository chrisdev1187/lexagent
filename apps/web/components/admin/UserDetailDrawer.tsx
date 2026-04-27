"use client";

import { useEffect, useState, useCallback } from "react";
import { X, AlertTriangle, Shield, RefreshCw, Ban, CheckCircle2, Clock, Cpu, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AdminUser {
  user_id: string;
  role: string;
  plan_id: string;
  profiles: { email: string | null; full_name: string | null } | null;
}

interface SessionRow {
  id: string;
  session_id: string;
  device_fingerprint: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen: string;
  is_revoked: boolean;
  revoked_at: string | null;
  revoke_reason: string | null;
}

interface ActionRow {
  id: string;
  action_type: string;
  credit_cost: number;
  model: string | null;
  created_at: string;
}

interface AbuseFlag {
  flag_type: string;
  details: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
}

interface Credits {
  credits_used: number;
  credits_limit: number;
  period_start: string;
  period_end: string;
}

interface Suspension {
  suspended_until: string | null;
  suspension_reason: string | null;
}

interface UserDetail {
  sessions: SessionRow[];
  actions: ActionRow[];
  credits: Credits | null;
  abuse_flags: AbuseFlag[];
  suspension: Suspension | null;
}

interface Props {
  user: AdminUser | null;
  onClose: () => void;
  onRefreshList: () => void;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function truncate(s: string | null | undefined, n: number) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function UserDetailDrawer({ user, onClose, onRefreshList }: Props) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("Policy violation");
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [tab, setTab] = useState<"overview" | "sessions" | "actions" | "abuse">("overview");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    const { data, error: rpcError } = await supabase.rpc("get_user_detail", { p_target_uid: user.user_id });
    setLoading(false);
    if (rpcError) { setError(rpcError.message); return; }
    setDetail(data as UserDetail);
  }, [user]);

  useEffect(() => { load(); setTab("overview"); setShowSuspendForm(false); }, [load]);

  async function revokeAllSessions() {
    if (!user) return;
    setActionLoading("revoke");
    await supabase.rpc("revoke_user_sessions", { p_target_uid: user.user_id });
    setActionLoading(null);
    await load();
  }

  async function handleSuspend() {
    if (!user) return;
    setActionLoading("suspend");
    await supabase.rpc("suspend_user", { p_target_uid: user.user_id, p_reason: suspendReason });
    setActionLoading(null);
    setShowSuspendForm(false);
    await load();
    onRefreshList();
  }

  async function handleUnsuspend() {
    if (!user) return;
    setActionLoading("unsuspend");
    await supabase.rpc("unsuspend_user", { p_target_uid: user.user_id });
    setActionLoading(null);
    await load();
    onRefreshList();
  }

  const isSuspended = detail?.suspension?.suspended_until != null &&
    new Date(detail.suspension.suspended_until) > new Date();

  const activeSessions = detail?.sessions.filter((s) => !s.is_revoked) ?? [];
  const abuseCount = detail?.abuse_flags.length ?? 0;

  const drawerStyle: React.CSSProperties = {
    position: "fixed", top: 0, right: 0, height: "100%", width: 480, maxWidth: "90vw",
    zIndex: 200, display: "flex", flexDirection: "column",
    background: "var(--bg-surface)",
    borderLeft: "0.5px solid rgba(224,224,224,0.12)",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
  };

  if (!user) return null;

  const tabBtn = (id: typeof tab, label: string, badge?: number) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className="px-3 py-1.5 text-xs font-mono rounded transition-all"
      style={{
        background: tab === id ? "rgba(0,255,195,0.08)" : "transparent",
        color: tab === id ? "var(--verdict-neon)" : "var(--fg-tertiary)",
        border: tab === id ? "0.5px solid rgba(0,255,195,0.2)" : "0.5px solid transparent",
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px]"
          style={{ background: "var(--verdict-crimson)", color: "#fff" }}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div style={drawerStyle}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 flex-shrink-0"
          style={{ borderBottom: "0.5px solid rgba(224,224,224,0.09)" }}>
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--fg-primary)" }}>
              {user.profiles?.email ?? "Unknown"}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.2)" }}>
                {user.plan_id}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{
                  background: user.role === "admin" ? "rgba(255,195,0,0.12)" : "var(--bg-raised)",
                  color: user.role === "admin" ? "var(--verdict-amber)" : "var(--fg-tertiary)",
                  border: "0.5px solid rgba(224,224,224,0.09)",
                }}>
                {user.role}
              </span>
              {isSuspended && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: "rgba(220,38,38,0.12)", color: "var(--verdict-crimson)", border: "0.5px solid rgba(220,38,38,0.3)" }}>
                  SUSPENDED
                </span>
              )}
              {abuseCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-0.5"
                  style={{ background: "rgba(251,146,60,0.12)", color: "var(--verdict-amber)", border: "0.5px solid rgba(251,146,60,0.3)" }}>
                  <AlertTriangle size={9} /> {abuseCount} flag{abuseCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <button className="lex-btn lex-btn--icon flex-shrink-0" onClick={onClose}><X size={14} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: "0.5px solid rgba(224,224,224,0.06)" }}>
          {tabBtn("overview", "Overview")}
          {tabBtn("sessions", "Sessions", activeSessions.length)}
          {tabBtn("actions", "Actions")}
          {tabBtn("abuse", "Abuse Flags", abuseCount)}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
          )}
          {error && (
            <p className="text-xs" style={{ color: "var(--verdict-crimson)" }}>{error}</p>
          )}

          {!loading && detail && (
            <>
              {/* ── Overview ── */}
              {tab === "overview" && (
                <div className="space-y-4">
                  {/* Credits */}
                  {detail.credits && (
                    <div className="rounded p-3" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                      <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--fg-tertiary)" }}>CREDITS THIS PERIOD</p>
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-xl font-mono font-semibold" style={{ color: "var(--fg-primary)" }}>
                          {detail.credits.credits_used}
                        </span>
                        <span className="text-sm mb-0.5" style={{ color: "var(--fg-tertiary)" }}>
                          / {detail.credits.credits_limit}
                        </span>
                      </div>
                      {detail.credits.credits_limit > 0 && (
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(17,17,20,0.7)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${Math.min(detail.credits.credits_used / detail.credits.credits_limit * 100, 100)}%`,
                            background: "var(--verdict-neon)",
                          }} />
                        </div>
                      )}
                      <p className="text-[10px] mt-1.5" style={{ color: "var(--fg-tertiary)" }}>
                        Resets {fmt(detail.credits.period_end)}
                      </p>
                    </div>
                  )}

                  {/* Session summary */}
                  <div className="rounded p-3" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                    <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--fg-tertiary)" }}>SESSIONS</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-lg font-mono font-semibold" style={{ color: activeSessions.length > 1 ? "var(--verdict-amber)" : "var(--verdict-neon)" }}>
                          {activeSessions.length}
                        </p>
                        <p style={{ color: "var(--fg-tertiary)" }}>active</p>
                      </div>
                      <div>
                        <p className="text-lg font-mono font-semibold" style={{ color: "var(--fg-primary)" }}>
                          {detail.sessions.length}
                        </p>
                        <p style={{ color: "var(--fg-tertiary)" }}>total (last 20)</p>
                      </div>
                    </div>
                    {activeSessions.length > 0 && (
                      <p className="text-[10px] mt-2" style={{ color: "var(--fg-tertiary)" }}>
                        Last active: {fmt(activeSessions[0].last_seen)}
                        {activeSessions[0].ip_address && ` · ${activeSessions[0].ip_address}`}
                      </p>
                    )}
                  </div>

                  {/* Suspension status */}
                  {isSuspended && detail.suspension && (
                    <div className="rounded p-3" style={{ background: "rgba(220,38,38,0.06)", border: "0.5px solid rgba(220,38,38,0.25)" }}>
                      <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "var(--verdict-crimson)" }}>SUSPENDED</p>
                      <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>{detail.suspension.suspension_reason}</p>
                      {detail.suspension.suspended_until && detail.suspension.suspended_until !== "infinity" && (
                        <p className="text-[10px] mt-1" style={{ color: "var(--fg-tertiary)" }}>
                          Until: {fmt(detail.suspension.suspended_until)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Sessions ── */}
              {tab === "sessions" && (
                <div className="space-y-2">
                  {detail.sessions.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>No sessions recorded.</p>
                  )}
                  {detail.sessions.map((s) => (
                    <div key={s.id} className="rounded p-2.5 text-xs"
                      style={{
                        background: "var(--bg-raised)",
                        border: `0.5px solid ${s.is_revoked ? "rgba(220,38,38,0.2)" : "rgba(0,255,195,0.15)"}`,
                      }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          {s.is_revoked
                            ? <Ban size={10} style={{ color: "var(--verdict-crimson)", flexShrink: 0 }} />
                            : <CheckCircle2 size={10} style={{ color: "var(--verdict-neon)", flexShrink: 0 }} />}
                          <span className="font-mono text-[9px]" style={{ color: s.is_revoked ? "var(--verdict-crimson)" : "var(--verdict-neon)" }}>
                            {s.is_revoked ? `REVOKED (${s.revoke_reason ?? "unknown"})` : "ACTIVE"}
                          </span>
                        </div>
                        <span className="font-mono text-[9px]" style={{ color: "var(--fg-tertiary)" }}>
                          {fmt(s.created_at)}
                        </span>
                      </div>
                      {s.ip_address && <p style={{ color: "var(--fg-tertiary)" }}>IP: {s.ip_address}</p>}
                      {s.device_fingerprint && (
                        <p style={{ color: "var(--fg-tertiary)" }}>FP: {s.device_fingerprint.slice(0, 12)}…</p>
                      )}
                      {s.user_agent && (
                        <p className="mt-0.5" style={{ color: "var(--fg-quaternary)" }}>{truncate(s.user_agent, 60)}</p>
                      )}
                      {!s.is_revoked && (
                        <p className="mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
                          <Clock size={9} className="inline mr-0.5" />Last seen {fmt(s.last_seen)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Actions ── */}
              {tab === "actions" && (
                <div className="space-y-1.5">
                  {detail.actions.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>No actions logged.</p>
                  )}
                  {detail.actions.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded px-2.5 py-1.5 text-xs"
                      style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.06)" }}>
                      <div>
                        <span style={{ color: "var(--fg-primary)" }}>{a.action_type}</span>
                        {a.model && (
                          <span className="ml-1.5 font-mono text-[9px]" style={{ color: "var(--fg-quaternary)" }}>
                            <Cpu size={8} className="inline mr-0.5" />{truncate(a.model, 20)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {a.credit_cost > 0 && (
                          <span className="font-mono text-[10px]" style={{ color: "var(--verdict-neon)" }}>
                            <Zap size={9} className="inline mr-0.5" />{a.credit_cost}
                          </span>
                        )}
                        <span className="font-mono text-[9px]" style={{ color: "var(--fg-tertiary)" }}>
                          {fmt(a.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Abuse Flags ── */}
              {tab === "abuse" && (
                <div className="space-y-2">
                  {abuseCount === 0 && (
                    <div className="rounded p-3 flex items-center gap-2"
                      style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.15)" }}>
                      <Shield size={14} style={{ color: "var(--verdict-neon)" }} />
                      <p className="text-xs" style={{ color: "var(--fg-secondary)" }}>No active abuse flags.</p>
                    </div>
                  )}
                  {detail.abuse_flags.map((f, i) => (
                    <div key={i} className="rounded p-3"
                      style={{ background: "rgba(251,146,60,0.06)", border: "0.5px solid rgba(251,146,60,0.25)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={11} style={{ color: "var(--verdict-amber)" }} />
                        <span className="font-mono text-[10px] tracking-wider" style={{ color: "var(--verdict-amber)" }}>
                          {f.flag_type.toUpperCase().replace("_", " ")}
                        </span>
                      </div>
                      <pre className="text-[10px] whitespace-pre-wrap break-all"
                        style={{ color: "var(--fg-tertiary)", fontFamily: "monospace" }}>
                        {JSON.stringify(f.details, null, 2)}
                      </pre>
                      <p className="text-[9px] mt-1" style={{ color: "var(--fg-quaternary)" }}>
                        Flagged {fmt(f.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action bar */}
        <div className="flex-shrink-0 p-4 space-y-2"
          style={{ borderTop: "0.5px solid rgba(224,224,224,0.09)" }}>
          {showSuspendForm ? (
            <div className="space-y-2">
              <input
                className="w-full rounded px-3 py-2 text-sm"
                style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)", color: "var(--fg-primary)" }}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Suspension reason…"
              />
              <div className="flex gap-2">
                <button
                  className="lex-btn lex-btn--danger flex-1"
                  onClick={handleSuspend}
                  disabled={actionLoading === "suspend"}
                >
                  {actionLoading === "suspend" ? "Suspending…" : "Confirm Suspend"}
                </button>
                <button className="lex-btn lex-btn--ghost" onClick={() => setShowSuspendForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button
                className="lex-btn lex-btn--ghost"
                onClick={revokeAllSessions}
                disabled={!!actionLoading || activeSessions.length === 0}
                title="Revoke all active sessions — forces the user to sign in again on all devices"
              >
                <Ban size={12} />
                {actionLoading === "revoke" ? "Revoking…" : "Revoke Sessions"}
              </button>
              {isSuspended ? (
                <button
                  className="lex-btn lex-btn--ghost"
                  onClick={handleUnsuspend}
                  disabled={!!actionLoading}
                >
                  <CheckCircle2 size={12} />
                  {actionLoading === "unsuspend" ? "Lifting…" : "Lift Suspension"}
                </button>
              ) : (
                <button
                  className="lex-btn lex-btn--danger"
                  onClick={() => setShowSuspendForm(true)}
                  disabled={!!actionLoading}
                >
                  <Ban size={12} />
                  Suspend User
                </button>
              )}
              <button className="lex-btn lex-btn--icon ml-auto" onClick={load} disabled={loading} title="Refresh">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
