"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Scale, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface InviteInfo {
  email: string;
  role: string;
  teamName: string;
  expiresAt: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptErr, setAcceptErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setFetchErr(d.error);
        else setInfo(d);
      })
      .catch(() => setFetchErr("Failed to load invite. Please try again."));
  }, [token]);

  async function accept() {
    if (!user) return;
    setAccepting(true);
    setAcceptErr(null);
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    });
    const body = await res.json();
    if (body.ok) {
      setAccepted(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      setAcceptErr(body.error ?? "Something went wrong");
    }
    setAccepting(false);
  }

  function goLogin() {
    router.push(`/login?redirect=/invite/${token}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--bg-base, #0a0a0a)" }}>
      <div className="w-full max-w-md rounded-xl p-8" style={{ background: "var(--bg-surface, #111)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-center gap-2 mb-6">
          <Scale size={20} style={{ color: "var(--verdict-neon, #00e5a0)" }} />
          <span className="font-mono text-xs tracking-widest" style={{ color: "var(--fg-tertiary, #666)" }}>LEXAGENT · TEAM INVITE</span>
        </div>

        {fetchErr ? (
          <div className="text-center py-4">
            <XCircle size={32} className="mx-auto mb-3" style={{ color: "var(--verdict-crimson, #ff4466)" }} />
            <p className="text-sm" style={{ color: "var(--fg-primary, #eee)" }}>{fetchErr}</p>
          </div>
        ) : !info ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--fg-tertiary, #666)" }} />
          </div>
        ) : accepted ? (
          <div className="text-center py-4">
            <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "var(--verdict-neon, #00e5a0)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--fg-primary, #eee)" }}>You've joined {info.teamName}!</p>
            <p className="text-xs" style={{ color: "var(--fg-tertiary, #666)" }}>Redirecting to dashboard…</p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--fg-primary, #eee)" }}>
              Join {info.teamName}
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--fg-secondary, #aaa)" }}>
              You've been invited to join as <strong style={{ color: "var(--fg-primary, #eee)" }}>{info.role}</strong>.
            </p>

            {!authLoading && !user ? (
              <>
                <p className="text-xs mb-4" style={{ color: "var(--fg-tertiary, #666)" }}>
                  Sign in with <strong>{info.email}</strong> to accept this invite.
                </p>
                <button onClick={goLogin} className="lex-btn lex-btn--primary w-full">
                  Sign in to accept
                </button>
              </>
            ) : user && user.email?.toLowerCase() !== info.email.toLowerCase() ? (
              <div className="rounded p-3 text-sm" style={{ background: "rgba(255,68,102,0.08)", border: "0.5px solid rgba(255,68,102,0.3)", color: "var(--verdict-crimson, #ff4466)" }}>
                This invite was sent to <strong>{info.email}</strong> but you're signed in as <strong>{user.email}</strong>. Sign in with the correct account to accept.
              </div>
            ) : (
              <>
                {acceptErr && (
                  <p className="text-xs mb-3" style={{ color: "var(--verdict-crimson, #ff4466)" }}>{acceptErr}</p>
                )}
                <button onClick={accept} disabled={accepting} className="lex-btn lex-btn--primary w-full">
                  {accepting ? <><Loader2 size={14} className="animate-spin mr-2" />Joining…</> : `Accept & Join ${info.teamName}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
