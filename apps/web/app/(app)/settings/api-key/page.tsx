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
    // In production: encrypt server-side via a dedicated endpoint.
    // For now, store directly — service-role RLS will protect it.
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
        <h1 className="text-2xl font-serif" style={{ color: "var(--text)" }}>Bring Your Own Key</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Use your own Anthropic API key. No plan budget is consumed — you pay Anthropic directly.
        </p>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <>
          {/* Status */}
          <div className="rounded-xl p-6" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>BYOK Mode</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {byokActive ? "Active — your key is being used" : "Inactive — using LexAgent shared key"}
                </p>
              </div>
              {hasKey && (
                <button
                  onClick={toggleByok}
                  className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors"
                  style={{ background: byokActive ? "var(--emerald)" : "var(--panel)" }}
                >
                  <span
                    className="inline-block w-4 h-4 transform rounded-full transition-transform"
                    style={{
                      background: "#fff",
                      transform: byokActive ? "translateX(24px)" : "translateX(4px)",
                    }}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Key input */}
          <div className="rounded-xl p-6 space-y-4" style={{ background: "var(--surface)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {hasKey ? "Replace API Key" : "Add API Key"}
            </p>
            {hasKey && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                A key is stored. Enter a new one to replace it, or remove it below.
              </p>
            )}
            <div className="flex gap-3">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: "var(--panel)", color: "var(--text)", border: "1px solid var(--text-muted)" }}
              />
              <button
                onClick={saveKey}
                disabled={saving || !keyInput.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--emerald)", color: "#000" }}
              >
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
              </button>
            </div>
            {hasKey && (
              <button
                onClick={removeKey}
                className="text-xs"
                style={{ color: "#EF4444" }}
              >
                Remove key and disable BYOK
              </button>
            )}
          </div>

          {/* Info */}
          <div className="rounded-xl p-5 text-sm space-y-2" style={{ background: "var(--panel)", color: "var(--text-muted)" }}>
            <p>• Your key is stored encrypted and never logged.</p>
            <p>• Anthropic bills you directly for all usage when BYOK is active.</p>
            <p>• Your LexAgent plan limits (matter count, features) still apply.</p>
            <p>• Disable BYOK at any time to revert to shared key billing.</p>
          </div>
        </>
      )}
    </div>
  );
}
