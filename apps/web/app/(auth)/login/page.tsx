"use client";

import { useEffect, useState } from "react";
import { useAuth, type AuthErrorCode } from "@/lib/auth";
import { supabaseReachable } from "@/lib/supabase";
import { WifiOff, Shield } from "lucide-react";

const ERROR_COPY: Record<AuthErrorCode, string> = {
  invalid_credentials: "Email or password is incorrect. Double-check your details and try again.",
  email_not_confirmed: "You need to confirm your email before signing in. Check your inbox (and spam folder).",
  rate_limited: "Too many attempts. Please wait 60 seconds and try again.",
  network_unreachable: "Cannot reach the authentication service. Check your internet connection.",
  supabase_misconfigured: "Auth service is misconfigured. Contact support if this persists.",
  unknown: "Something went wrong. Please try again.",
};

export default function LoginPage() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, resendConfirmation } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [scanPhase, setScanPhase] = useState<"scanning" | "idle">("idle");

  useEffect(() => {
    supabaseReachable.then(setReachable);
  }, []);

  useEffect(() => {
    const cycle = () => {
      setScanPhase("scanning");
      setTimeout(() => setScanPhase("idle"), 1600);
    };
    cycle();
    const id = setInterval(cycle, 4000);
    return () => clearInterval(id);
  }, []);

  const recheckReachability = () => {
    setReachable(null);
    fetch("https://mgiqicasllvisiwvbiuu.supabase.co/auth/v1/health", {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    })
      .then(() => setReachable(true))
      .catch(() => setReachable(false));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--midnight-court)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-5 w-5 rounded-full border animate-spin"
            style={{ borderColor: "var(--midnight-line)", borderTopColor: "var(--verdict-neon)" }}
          />
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            AUTHENTICATING
          </span>
        </div>
      </div>
    );
  }

  if (user) {
    if (typeof window !== "undefined") window.location.href = "/dashboard";
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode(null);
    setMessage(null);
    setResendDone(false);
    setSubmitting(true);
    const fn = mode === "signin" ? signInWithEmail : signUpWithEmail;
    const { error } = await fn(email, password);
    setSubmitting(false);
    if (error) {
      setErrorCode(error.code);
    } else if (mode === "signup") {
      setMessage("Account created. Check your email to confirm before signing in.");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    await resendConfirmation(email);
    setResending(false);
    setResendDone(true);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-blueprint"
      style={{ background: "var(--midnight-court)" }}
    >
      {/* Ambient radial gradients */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 700px at 20% 10%, rgba(0,255,195,0.04) 0%, transparent 65%), " +
            "radial-gradient(ellipse 700px 600px at 80% 90%, rgba(106,0,255,0.05) 0%, transparent 60%)",
        }}
      />

      <div className="w-full max-w-[400px] relative" style={{ animation: "trace-in 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Offline banner */}
        {reachable === false && (
          <div
            className="flex items-start gap-2.5 px-3.5 py-3 mb-4 text-xs rounded"
            style={{
              background: "rgba(255,184,0,0.06)",
              border: "0.5px solid rgba(255,184,0,0.35)",
              color: "var(--verdict-amber)",
            }}
          >
            <WifiOff size={13} className="mt-0.5 shrink-0" />
            <div className="flex-1 font-mono tracking-wide">
              AUTH SERVICE UNREACHABLE — check connection.{" "}
              <button
                onClick={recheckReachability}
                className="underline cursor-pointer"
                style={{ background: "none", border: "none", color: "inherit", padding: 0 }}
              >
                RETRY
              </button>
            </div>
          </div>
        )}

        {/* Glass card */}
        <div
          style={{
            background: "rgba(20,20,26,0.72)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "0.5px solid rgba(224,224,224,0.10)",
            borderRadius: 10,
            padding: "2.5rem",
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(0,255,195,0.08), 0 0 60px rgba(0,255,195,0.04)",
          }}
        >
          {/* Biometric scan orb */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="relative flex items-center justify-center mb-5"
              style={{ width: 72, height: 72 }}
            >
              {/* Outer ring */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "0.5px solid rgba(0,255,195,0.22)",
                }}
              />
              {/* Inner ring */}
              <div
                style={{
                  position: "absolute",
                  inset: 8,
                  borderRadius: "50%",
                  border: "0.5px solid rgba(0,255,195,0.14)",
                  background: "rgba(0,255,195,0.04)",
                }}
              />
              {/* Scanline */}
              <div
                style={{
                  position: "absolute",
                  inset: 8,
                  borderRadius: "50%",
                  overflow: "hidden",
                  opacity: scanPhase === "scanning" ? 1 : 0,
                  transition: "opacity 0.3s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "linear-gradient(90deg, transparent, rgba(0,255,195,0.6), transparent)",
                    animation: scanPhase === "scanning" ? "biometricScan 1.6s linear forwards" : "none",
                  }}
                />
              </div>
              {/* Shield icon */}
              <Shield size={22} style={{ color: "var(--verdict-neon)", position: "relative", zIndex: 1 }} />
            </div>

            {/* Wordmark */}
            <div
              className="font-serif text-3xl font-semibold tracking-tight mb-1"
              style={{ color: "var(--fg-primary)", letterSpacing: "-0.01em" }}
            >
              LEX PROTOCOL
            </div>
            <div
              className="font-mono text-[10px] tracking-[0.22em] uppercase"
              style={{ color: "var(--fg-quaternary)" }}
            >
              SECURE ACCESS · ARES v5
            </div>

            {/* TLS badge */}
            <div className="flex items-center gap-3 mt-3">
              <span
                className="font-mono text-[9px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
                style={{
                  border: "0.5px solid rgba(0,255,195,0.3)",
                  color: "var(--verdict-neon)",
                  background: "rgba(0,255,195,0.05)",
                }}
              >
                TLS 1.3
              </span>
              <span
                className="font-mono text-[9px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
                style={{
                  border: "0.5px solid rgba(224,224,224,0.12)",
                  color: "var(--fg-tertiary)",
                  background: "rgba(224,224,224,0.03)",
                }}
              >
                SOC 2
              </span>
            </div>
          </div>

          {/* Mode toggle */}
          <div
            className="grid grid-cols-2 gap-0.5 p-0.5 rounded mb-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(224,224,224,0.08)" }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrorCode(null); setMessage(null); }}
                className="py-2 rounded text-[10px] font-mono tracking-[0.14em] uppercase cursor-pointer transition-all duration-150"
                style={{
                  background: mode === m ? "rgba(0,255,195,0.08)" : "transparent",
                  border: mode === m ? "0.5px solid rgba(0,255,195,0.25)" : "0.5px solid transparent",
                  color: mode === m ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                }}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "var(--fg-tertiary)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "0.5px solid rgba(224,224,224,0.10)",
                  color: "var(--fg-primary)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
                placeholder="you@lawfirm.com"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "var(--fg-tertiary)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "0.5px solid rgba(224,224,224,0.10)",
                  color: "var(--fg-primary)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {errorCode && (
              <div
                className="rounded px-3.5 py-2.5 text-xs font-mono tracking-wide"
                style={{
                  background: "rgba(255,51,85,0.06)",
                  border: "0.5px solid rgba(255,51,85,0.3)",
                  color: "var(--verdict-crimson)",
                }}
              >
                <p>{ERROR_COPY[errorCode]}</p>
                {errorCode === "email_not_confirmed" && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || resendDone}
                    className="mt-2 underline cursor-pointer text-xs"
                    style={{ background: "none", border: "none", color: "inherit", padding: 0 }}
                  >
                    {resendDone ? "Confirmation sent ✓" : resending ? "Sending…" : "Resend confirmation"}
                  </button>
                )}
                {errorCode === "invalid_credentials" && (
                  <p className="mt-1.5 opacity-60">If you just signed up, confirm your email first.</p>
                )}
              </div>
            )}

            {/* Success */}
            {message && (
              <div
                className="rounded px-3.5 py-2.5 text-xs font-mono tracking-wide"
                style={{
                  background: "rgba(0,255,195,0.06)",
                  border: "0.5px solid rgba(0,255,195,0.25)",
                  color: "var(--verdict-neon)",
                }}
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || reachable === false}
              className="w-full rounded py-3 text-sm font-semibold transition-all duration-150 cursor-pointer"
              style={{
                background: submitting || reachable === false
                  ? "rgba(0,255,195,0.18)"
                  : "var(--verdict-neon)",
                border: "0.5px solid transparent",
                color: "var(--midnight-court)",
                opacity: submitting || reachable === false ? 0.6 : 1,
                cursor: reachable === false ? "not-allowed" : "pointer",
                boxShadow: submitting || reachable === false ? "none" : "0 0 24px rgba(0,255,195,0.4)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              {submitting ? "VERIFYING…" : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1" style={{ height: "0.5px", background: "rgba(224,224,224,0.08)" }} />
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--fg-quaternary)" }}>OR</span>
            <div className="flex-1" style={{ height: "0.5px", background: "rgba(224,224,224,0.08)" }} />
          </div>

          {/* Google */}
          <button
            onClick={async () => {
              setErrorCode(null);
              const { error } = await signInWithGoogle();
              if (error) setErrorCode(error.code);
            }}
            className="w-full flex items-center justify-center gap-2.5 rounded py-2.5 text-sm cursor-pointer transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(224,224,224,0.10)",
              color: "var(--fg-secondary)",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(224,224,224,0.20)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(224,224,224,0.10)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Footer */}
          <div className="mt-5 pt-4 text-center" style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)" }}>
            <span className="font-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              256-BIT ENCRYPTED · PRIVILEGE PROTECTED · ATTORNEY-CLIENT SECURED
            </span>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center mt-4 font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
          LAW FIRST · NEURAL SECOND
        </p>
      </div>
    </div>
  );
}
