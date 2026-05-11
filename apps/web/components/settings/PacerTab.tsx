"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Trash2, EyeOff, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function PacerTab({ userId }: { userId: string }) {
  const [connected, setConnected] = useState(false);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      const h: Record<string, string> = {};
      if (token) h["Authorization"] = `Bearer ${token}`;
      Promise.all([
        fetch(`${API_URL}/api/pacer/credentials/status`, { headers: h }).then(r => r.ok ? r.json() : null),
        supabase.from("user_roles").select("alert_email_enabled").eq("user_id", userId).single(),
      ]).then(([status, roleRes]) => {
        if (status) { setConnected(status.connected); setSavedUsername(status.username); }
        if (roleRes.data) setEmailAlerts(!!roleRes.data.alert_email_enabled);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [userId]);

  async function save() {
    if (!username.trim() || !password.trim()) return;
    setSaving(true); setError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    const res = await fetch(`${API_URL}/api/pacer/credentials`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password: password.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setConnected(true); setSavedUsername(username.trim());
      setUsername(""); setPassword(""); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setError(d.error ?? "Failed to save credentials");
    }
  }

  async function remove() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    await fetch(`${API_URL}/api/pacer/credentials`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConnected(false); setSavedUsername(null);
  }

  if (loading) return <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading variant="settings">PACER CONNECTION</SectionHeading>
        <p className="text-[13px] mb-4" style={{ color: "var(--fg-secondary)" }}>
          Connect your PACER account to search federal court dockets and sync filings directly into matters.
          Credentials are stored server-side and only used to authenticate PACER API requests.
        </p>
        {connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: "var(--verdict-neon)" }} />
              <span className="text-[13px] font-mono" style={{ color: "var(--verdict-neon)" }}>
                Connected as <strong>{savedUsername}</strong>
              </span>
            </div>
            <button
              onClick={remove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-widest hover:bg-[rgba(255,60,60,0.12)] transition-colors"
              style={{ color: "var(--fg-tertiary)" }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-tertiary)" }}>
                  PACER Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_pacer_login"
                  className="w-full px-3 py-2 rounded text-sm font-mono bg-[var(--midnight-mid)] border border-[rgba(224,224,224,0.1)] text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] focus:outline-none focus:border-[var(--verdict-neon)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-tertiary)" }}>
                  PACER Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && save()}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 rounded text-sm font-mono bg-[var(--midnight-mid)] border border-[rgba(224,224,224,0.1)] text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] focus:outline-none focus:border-[var(--verdict-neon)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                  >
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <p className="text-xs font-mono" style={{ color: "var(--verdict-red, #ff4d4d)" }}>{error}</p>
            )}
            <button
              onClick={save}
              disabled={saving || !username.trim() || !password.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-mono uppercase tracking-widest transition-colors"
              style={{
                background: saved ? "rgba(0,255,195,0.15)" : "var(--verdict-neon)",
                color: saved ? "var(--verdict-neon)" : "var(--midnight-deep)",
                opacity: saving || !username.trim() || !password.trim() ? 0.5 : 1,
              }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saved ? "Saved!" : "Connect PACER"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg p-5" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading variant="settings">EMAIL ALERTS</SectionHeading>
        <div className="flex items-center justify-between">
          <p className="text-[13px]" style={{ color: "var(--fg-secondary)" }}>
            Receive an email when new filings appear on watched dockets
          </p>
          <button
            onClick={async () => {
              const next = !emailAlerts;
              setEmailAlerts(next);
              await supabase.from("user_roles").update({ alert_email_enabled: next }).eq("user_id", userId);
            }}
            className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ml-4"
            style={{ background: emailAlerts ? "var(--verdict-neon)" : "rgba(255,255,255,0.12)" }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: emailAlerts ? "calc(100% - 18px)" : "2px" }}
            />
          </button>
        </div>
        {emailAlerts && (
          <p className="text-[11px] font-mono mt-2" style={{ color: "var(--fg-tertiary)" }}>
            Emails sent to your account address. Requires <code>RESEND_API_KEY</code> on the server.
          </p>
        )}
      </div>

      <div className="rounded-lg p-5" style={{ background: "rgba(17,17,20,0.5)", border: "0.5px solid rgba(224,224,224,0.06)" }}>
        <SectionHeading variant="settings">HOW IT WORKS</SectionHeading>
        <ul className="space-y-1.5 text-[12px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
          <li>• Credentials are verified against PACER before saving</li>
          <li>• A fresh auth token is fetched per request — your password is never sent to the browser</li>
          <li>• Used for case search and docket sync in the Docket Watch tab on any matter</li>
          <li>• PACER charges $0.10/page for documents — LexAgent does not purchase documents on your behalf</li>
        </ul>
      </div>
    </div>
  );
}
