"use client";

import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Supabase embeds the recovery token in the URL hash — getSession picks it up automatically
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setStatus("loading");
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setStatus("error"); }
    else {
      setStatus("done");
      setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--midnight-court)" }}
    >
      <div className="w-full max-w-[380px]">
        <div
          style={{
            background: "rgba(20,20,26,0.72)",
            backdropFilter: "blur(24px)",
            border: "0.5px solid rgba(224,224,224,0.10)",
            borderRadius: 10,
            padding: "2.5rem",
          }}
        >
          <div className="flex flex-col items-center mb-8">
            <Shield size={28} style={{ color: "var(--verdict-neon)", marginBottom: 16 }} />
            <div className="font-serif text-2xl font-semibold" style={{ color: "var(--fg-primary)" }}>
              Reset Password
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>
              LEX PROTOCOL · SECURE ACCESS
            </div>
          </div>

          {status === "done" ? (
            <div
              className="rounded px-4 py-3 text-sm text-center font-mono"
              style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.25)", color: "var(--verdict-neon)" }}
            >
              Password updated. Redirecting…
            </div>
          ) : !hasSession ? (
            <div
              className="rounded px-4 py-3 text-sm text-center font-mono"
              style={{ background: "rgba(255,51,85,0.06)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}
            >
              Invalid or expired reset link. Request a new one from the login page.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-[10px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "var(--fg-tertiary)" }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded px-3.5 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(224,224,224,0.10)", color: "var(--fg-primary)", outline: "none" }}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "var(--fg-tertiary)" }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded px-3.5 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(224,224,224,0.10)", color: "var(--fg-primary)", outline: "none" }}
                />
              </div>
              {error && (
                <div
                  className="rounded px-3.5 py-2.5 text-xs font-mono"
                  style={{ background: "rgba(255,51,85,0.06)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={status === "loading"}
                className="lex-btn lex-btn--primary w-full justify-center"
              >
                {status === "loading" ? "UPDATING…" : "SET NEW PASSWORD"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
