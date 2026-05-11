"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { Field } from "@/components/shared/AdminSettingsShared";

interface UserRole { plan_id: string; byok_active: boolean; byok_key?: string | null; }
interface UsageEvent { tool_name: string; model: string; usd_cost: number; created_at: string; }
interface CreditStatus { used: number; limit: number; remaining: number; pct_used: number; plan_id: string; period_end: string; }

export function ProfileTab({
  role, events, loading,
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
        <SectionHeading variant="settings">CREDIT USAGE</SectionHeading>
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
          <SectionHeading variant="settings">RECENT AI CALLS</SectionHeading>
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
      <SectionHeading variant="settings">CHANGE PASSWORD</SectionHeading>
      <div className="space-y-3 max-w-sm">
        <Field variant="settings" label="New password">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min. 8 characters"
            className="lex-input w-full text-sm" />
        </Field>
        <Field variant="settings" label="Confirm password">
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
