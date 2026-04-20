"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ApiKeyPage() {
  const { user } = useAuth();
  const [byokActive, setByokActive] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("byok_active, byok_key")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setByokActive(!!data.byok_active);
          setHasKey(!!data.byok_key);
        }
        setLoading(false);
      });
  }, [user]);

  async function saveKey() {
    if (!user || !keyInput.trim()) return;
    setSaving(true);
    await supabase
      .from("user_roles")
      .update({ byok_key: keyInput.trim(), byok_active: true })
      .eq("user_id", user.id);
    setHasKey(true);
    setByokActive(true);
    setKeyInput("");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function toggleByok() {
    if (!user) return;
    const next = !byokActive;
    await supabase
      .from("user_roles")
      .update({ byok_active: next })
      .eq("user_id", user.id);
    setByokActive(next);
  }

  async function removeKey() {
    if (!user) return;
    await supabase
      .from("user_roles")
      .update({ byok_key: null, byok_active: false })
      .eq("user_id", user.id);
    setHasKey(false);
    setByokActive(false);
  }

  if (!user) return null;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--verdict-neon)" }}>▸</span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mt-1" style={{ color: "var(--fg-primary)" }}>
          Bring Your Own Key
        </h1>
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>
          Use your Anthropic key — no plan budget consumed
        </p>
      </div>

      {loading ? (
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
          Loading…
        </p>
      ) : (
        <>
          {/* Status card */}
          <div
            className="rounded p-5"
            style={{
              background: "rgba(17,17,20,0.7)",
              border: "0.5px solid rgba(224,224,224,0.09)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1"
                  style={{ color: "var(--fg-quaternary)" }}
                >
                  BYOK Status
                </p>
                <p className="text-[13px] font-medium" style={{ color: byokActive ? "var(--verdict-neon)" : "var(--fg-secondary)" }}>
                  {byokActive ? "Active — your key is being used" : "Inactive — using LexAgent shared key"}
                </p>
              </div>
              {hasKey && (
                <button
                  onClick={toggleByok}
                  className="relative inline-flex items-center h-5 rounded-full w-9 transition-colors cursor-pointer"
                  style={{
                    background: byokActive ? "var(--verdict-neon)" : "rgba(255,255,255,0.08)",
                    border: `0.5px solid ${byokActive ? "rgba(0,255,195,0.4)" : "rgba(224,224,224,0.12)"}`,
                  }}
                >
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full transition-transform"
                    style={{
                      background: byokActive ? "var(--midnight-court)" : "var(--fg-tertiary)",
                      transform: byokActive ? "translateX(18px)" : "translateX(2px)",
                    }}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Key input card */}
          <div
            className="rounded p-5 space-y-4"
            style={{
              background: "rgba(17,17,20,0.7)",
              border: "0.5px solid rgba(224,224,224,0.09)",
            }}
          >
            <div>
              <p
                className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1"
                style={{ color: "var(--fg-quaternary)" }}
              >
                {hasKey ? "Replace API Key" : "Add API Key"}
              </p>
              {hasKey && (
                <p className="text-[12px]" style={{ color: "var(--fg-tertiary)" }}>
                  A key is stored. Enter a new one to replace it.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded text-[13px] font-mono lex-focus"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--fg-primary)",
                  border: "0.5px solid rgba(224,224,224,0.10)",
                  outline: "none",
                }}
              />
              <button
                onClick={saveKey}
                disabled={saving || !keyInput.trim()}
                className="px-4 py-2 rounded font-mono text-[11px] tracking-[0.1em] font-semibold disabled:opacity-40 cursor-pointer"
                style={{
                  background: "var(--verdict-neon)",
                  color: "var(--midnight-court)",
                  boxShadow: keyInput.trim() ? "0 0 12px rgba(0,255,195,0.3)" : "none",
                  border: "none",
                }}
              >
                {saving ? "SAVING…" : saved ? "SAVED ✓" : "SAVE"}
              </button>
            </div>
            {hasKey && (
              <button
                onClick={removeKey}
                className="font-mono text-[10px] tracking-[0.1em] uppercase cursor-pointer"
                style={{ color: "var(--verdict-crimson)", background: "none", border: "none" }}
              >
                Remove key and disable BYOK
              </button>
            )}
          </div>

          {/* Info card */}
          <div
            className="rounded p-5 space-y-2"
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "0.5px solid rgba(224,224,224,0.07)",
            }}
          >
            {[
              "Your key is stored encrypted and never logged.",
              "Anthropic bills you directly for all usage when BYOK is active.",
              "Your LexAgent plan limits (matter count, features) still apply.",
              "Disable BYOK at any time to revert to shared key billing.",
            ].map((line, i) => (
              <p key={i} className="text-[12px] flex gap-2" style={{ color: "var(--fg-tertiary)" }}>
                <span style={{ color: "var(--verdict-neon)" }}>·</span>
                {line}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
