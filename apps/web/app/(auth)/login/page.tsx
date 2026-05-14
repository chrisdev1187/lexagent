"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, type AuthErrorCode } from "@/lib/auth";
import { supabase, supabaseReachable } from "@/lib/supabase";
import { WifiOff, Shield, Scale, Brain, Search, CheckCircle2, Smartphone, Loader2, XCircle } from "lucide-react";

const ERROR_COPY: Record<AuthErrorCode, string> = {
  invalid_credentials: "Email or password is incorrect. Double-check your details and try again.",
  email_not_confirmed: "You need to confirm your email before signing in. Check your inbox (and spam folder).",
  rate_limited: "Too many attempts. Please wait 60 seconds and try again.",
  network_unreachable: "Cannot reach the authentication service. Check your internet connection.",
  supabase_misconfigured: "Auth service is misconfigured. Contact support if this persists.",
  unknown: "Something went wrong. Please try again.",
};

const BRAND_FEATURES = [
  { icon: Search, text: "10+ live legal databases" },
  { icon: Shield, text: "Real-time citation verification" },
  { icon: Brain, text: "LexMemory across all sessions" },
  { icon: CheckCircle2, text: "16,000+ judge profiles" },
];

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}

function LoginPageInner() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, resendConfirmation, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [scanPhase, setScanPhase] = useState<"scanning" | "idle">("idle");
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [mfaChallenge, setMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaErr, setMfaErr] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

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

  if (user && !mfaChallenge) {
    if (typeof window !== "undefined") window.location.href = redirectTo;
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
    } else {
      // Check if MFA challenge is required (AAL2)
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal?.currentLevel === "aal1") {
        setMfaChallenge(true);
        setMfaCode("");
        setMfaErr(null);
      }
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) return;
    setMfaBusy(true);
    setMfaErr(null);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (!factor) { setMfaBusy(false); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: mfaCode });
    setMfaBusy(false);
    if (error) {
      setMfaErr("Invalid code — try again.");
    } else {
      setMfaChallenge(false);
      if (typeof window !== "undefined") window.location.href = redirectTo;
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    await resendConfirmation(email);
    setResending(false);
    setResendDone(true);
  };

  if (mfaChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--midnight-court)" }}>
        <div className="w-full max-w-sm rounded-xl p-8" style={{ background: "var(--bg-surface, #111)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <div className="flex items-center gap-2 mb-6">
            <Smartphone size={18} style={{ color: "var(--verdict-neon)" }} />
            <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--fg-tertiary)" }}>TWO-FACTOR AUTHENTICATION</span>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--fg-secondary)" }}>Enter the 6-digit code from your authenticator app.</p>
          <div className="flex gap-2 mb-3">
            <input
              className="rounded px-3 py-2 text-sm font-mono tracking-widest flex-1"
              style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)", color: "var(--fg-primary)", outline: "none" }}
              placeholder="000000"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleMfaVerify()}
              autoFocus
            />
            <button onClick={handleMfaVerify} disabled={mfaBusy || mfaCode.length !== 6} className="lex-btn lex-btn--primary">
              {mfaBusy ? <Loader2 size={14} className="animate-spin" /> : "Verify"}
            </button>
          </div>
          {mfaErr && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--verdict-crimson)" }}>
              <XCircle size={12} /> {mfaErr}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--midnight-court)" }}
    >
      {/* Ambient gradients */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 700px at 20% 10%, rgba(0,255,195,0.04) 0%, transparent 65%), " +
            "radial-gradient(ellipse 700px 600px at 80% 90%, rgba(106,0,255,0.05) 0%, transparent 60%)",
        }}
      />

      {/* Left brand panel — desktop only */}
      <div
        className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden"
        style={{
          width: 420,
          minWidth: 420,
          background: "linear-gradient(160deg, rgba(0,255,195,0.04) 0%, rgba(106,0,255,0.05) 100%)",
          borderRight: "0.5px solid rgba(224,224,224,0.07)",
        }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,255,195,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,255,195,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 400,
            height: 400,
            background: "radial-gradient(ellipse, rgba(106,0,255,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Top: Logo */}
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-16">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(0,255,195,0.14), rgba(106,0,255,0.14))",
                border: "0.5px solid rgba(0,255,195,0.28)",
                boxShadow: "0 0 16px rgba(0,255,195,0.15)",
              }}
            >
              <Scale size={15} style={{ color: "var(--verdict-neon)" }} />
            </div>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--fg-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              LexAgent
            </span>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--fg-primary)",
              marginBottom: 12,
            }}
          >
            Legal AI that works
            <br />
            <span style={{ color: "var(--verdict-neon)" }}>like a partner</span>
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--fg-tertiary)",
              marginBottom: 32,
            }}
          >
            The only AI platform built for the full legal workflow — from research to ruling.
          </p>

          <ul className="space-y-3">
            {BRAND_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(0,255,195,0.07)",
                    border: "0.5px solid rgba(0,255,195,0.18)",
                  }}
                >
                  <Icon size={13} style={{ color: "var(--verdict-neon)" }} />
                </div>
                <span className="text-[13px]" style={{ color: "var(--fg-secondary)" }}>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: badges */}
        <div className="relative flex items-center gap-3">
          <span className="lex-chip lex-chip--neon">TLS 1.3</span>
          <span className="lex-chip lex-chip--neutral">SOC 2</span>
          <span className="lex-chip lex-chip--neutral">Privilege-safe</span>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 relative">
        <div className="w-full max-w-[400px]">

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
              borderRadius: 12,
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
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: "0.5px solid rgba(0,255,195,0.22)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 8,
                    borderRadius: "50%",
                    border: "0.5px solid rgba(0,255,195,0.14)",
                    background: "rgba(0,255,195,0.04)",
                  }}
                />
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
                <Shield size={22} style={{ color: "var(--verdict-neon)", position: "relative", zIndex: 1 }} />
              </div>

              <div
                className="font-serif text-2xl font-semibold tracking-tight mb-1"
                style={{ color: "var(--fg-primary)", letterSpacing: "-0.01em" }}
              >
                {mode === "signin" ? "Welcome back" : "Create account"}
              </div>
              <div
                className="font-mono text-[10px] tracking-[0.22em] uppercase"
                style={{ color: "var(--fg-quaternary)" }}
              >
                SECURE ACCESS · ARES v5
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
                    minHeight: 36,
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
                    minHeight: 44,
                  }}
                  placeholder="you@lawfirm.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-tertiary)" }}>
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={async () => {
                        if (!email) { setErrorCode("invalid_credentials"); return; }
                        setForgotLoading(true);
                        await resetPassword(email);
                        setForgotLoading(false);
                        setForgotSent(true);
                      }}
                      className="text-[9px] font-mono tracking-wider uppercase underline opacity-60 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--fg-tertiary)", background: "none", border: "none", padding: 0 }}
                    >
                      {forgotSent ? "Email Sent ✓" : forgotLoading ? "Sending..." : "Forgot?"}
                    </button>
                  )}
                </div>
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
                    minHeight: 44,
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
                    <div className="mt-2 text-[10px] opacity-70">
                      If you just signed up, confirm your email first.
                    </div>
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
                className="lex-btn lex-btn--primary w-full justify-center"
                style={{ minHeight: 44 }}
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
                minHeight: 44,
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
                256-BIT ENCRYPTED · PRIVILEGE PROTECTED
              </span>
            </div>
          </div>

          <p className="text-center mt-4 font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            LAW FIRST · NEURAL SECOND
          </p>
        </div>
      </div>
    </div>
  );
}
