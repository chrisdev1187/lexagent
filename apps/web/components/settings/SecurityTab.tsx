"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Smartphone, QrCode, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

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
        <SectionHeading variant="settings">TWO-FACTOR AUTHENTICATION</SectionHeading>
        <Loader2 size={16} className="animate-spin" style={{ color: "var(--fg-tertiary)" }} />
      </div>
    );
  }

  return (
    <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <SectionHeading variant="settings">TWO-FACTOR AUTHENTICATION</SectionHeading>

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

export function SecurityTab({ userId }: { userId: string }) {
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
        <SectionHeading variant="settings">ACTIVE SESSIONS</SectionHeading>
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
