"use client";

import { useEffect, useState } from "react";
import { useAuth, type AuthErrorCode } from "@/lib/auth";
import { supabaseReachable } from "@/lib/supabase";
import { Scale, WifiOff } from "lucide-react";

const ERROR_COPY: Record<AuthErrorCode, string> = {
  invalid_credentials:
    "Email or password is incorrect. Double-check your details and try again.",
  email_not_confirmed:
    "You need to confirm your email before signing in. Check your inbox (and spam folder).",
  rate_limited:
    "Too many attempts. Please wait 60 seconds and try again.",
  network_unreachable:
    "Cannot reach the authentication service. Check your internet connection.",
  supabase_misconfigured:
    "Auth service is misconfigured. Contact support if this persists.",
  unknown:
    "Something went wrong. Please try again.",
};

export default function LoginPage() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, resendConfirmation } =
    useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    supabaseReachable.then(setReachable);
  }, []);

  const recheckReachability = () => {
    setReachable(null);
    fetch("https://mgiqicasllvisiwvbiuu.supabase.co/auth/v1/health", {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    })
      .then((r) => setReachable(r.ok))
      .catch(() => setReachable(false));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-6 w-6 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--border)", borderTopColor: "var(--emerald)" }}
          />
          <span className="font-mono text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
            LOADING…
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
      setMessage("Account created! Check your email to confirm before signing in.");
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
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 50% 0%, rgba(16,185,129,0.04) 0%, transparent 70%)",
        }}
      />

      <div
        className="w-full max-w-sm relative fade-in"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          padding: "2.5rem",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.04)",
        }}
      >
        {/* Unreachable banner */}
        {reachable === false && (
          <div
            className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 mb-6 text-xs"
            style={{
              background: "rgba(234,179,8,0.08)",
              border: "1px solid rgba(234,179,8,0.25)",
              color: "#ca8a04",
            }}
          >
            <WifiOff size={14} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Auth service unreachable.</span> Check your connection.{" "}
              <button
                onClick={recheckReachability}
                className="underline cursor-pointer"
                style={{ background: "none", border: "none", color: "inherit", padding: 0 }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
          >
            <Scale size={22} style={{ color: "var(--emerald)" }} />
          </div>
          <div className="font-serif text-2xl italic mb-1" style={{ color: "var(--emerald)" }}>
            LexAgent
          </div>
          <div className="font-mono text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
            ARES · LEGAL AI PLATFORM
          </div>
        </div>

        {/* Mode toggle */}
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-lg mb-6"
          style={{ background: "var(--bg)" }}
        >
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErrorCode(null);
                setMessage(null);
              }}
              className="py-2 rounded-md text-xs font-mono tracking-wider cursor-pointer transition-all duration-150"
              style={{
                background: mode === m ? "var(--panel)" : "transparent",
                border: mode === m ? "1px solid var(--border-hi)" : "1px solid transparent",
                color: mode === m ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {m === "signin" ? "SIGN IN" : "SIGN UP"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              className="block text-xs font-mono tracking-wider mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-3.5 py-2.5 text-sm lex-focus transition-all"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                outline: "none",
              }}
              placeholder="you@lawfirm.com"
            />
          </div>

          <div>
            <label
              className="block text-xs font-mono tracking-wider mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3.5 py-2.5 text-sm lex-focus transition-all"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                outline: "none",
              }}
              placeholder="••••••••"
            />
          </div>

          {/* Error block */}
          {errorCode && (
            <div
              className="rounded-lg px-3.5 py-2.5 text-xs"
              style={{
                background: "var(--crimson-faint)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "var(--crimson)",
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
                  {resendDone
                    ? "Confirmation email sent!"
                    : resending
                    ? "Sending…"
                    : "Resend confirmation email"}
                </button>
              )}

              {errorCode === "invalid_credentials" && (
                <p className="mt-1.5 opacity-70">
                  If you just signed up, confirm your email first then try again.
                </p>
              )}
            </div>
          )}

          {/* Success block */}
          {message && (
            <div
              className="rounded-lg px-3.5 py-2.5 text-xs"
              style={{
                background: "var(--emerald-faint)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "var(--emerald-bright)",
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || reachable === false}
            className="w-full rounded-lg py-3 text-sm font-semibold transition-all duration-150"
            style={{
              background:
                submitting || reachable === false
                  ? "var(--emerald-dim)"
                  : "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
              border: "none",
              color: "#0A0F0D",
              opacity: submitting || reachable === false ? 0.6 : 1,
              cursor: reachable === false ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            OR
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* Google */}
        <button
          onClick={async () => {
            setErrorCode(null);
            const { error } = await signInWithGoogle();
            if (error) setErrorCode(error.code);
          }}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg py-2.5 text-sm cursor-pointer transition-all duration-150 hover:border-[var(--border-hi)]"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
