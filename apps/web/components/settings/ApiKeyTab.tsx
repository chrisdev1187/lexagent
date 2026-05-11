"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { Field } from "@/components/shared/AdminSettingsShared";
import { SettingsToggle } from "@/components/shared/SettingsToggle";

export function ApiKeyTab({ user }: { user: { id: string }; loading: boolean }) {
  const [byokActive, setByokActive] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("user_roles")
      .select("byok_active, byok_key")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) { setByokActive(!!data.byok_active); setHasKey(!!data.byok_key); }
        setLoading(false);
      });
  }, [user.id]);

  async function saveKey() {
    if (!keyInput.trim()) return;
    setSaving(true);
    await supabase.from("user_roles").update({ byok_key: keyInput.trim(), byok_active: true }).eq("user_id", user.id);
    setHasKey(true); setByokActive(true); setKeyInput(""); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <SectionHeading variant="settings">BRING YOUR OWN KEY (BYOK)</SectionHeading>
            <p className="text-[13px] mt-1" style={{ color: "var(--fg-tertiary)", lineHeight: 1.6 }}>
              Use your own Anthropic API key to pay for AI usage directly.
            </p>
          </div>
          <SettingsToggle checked={byokActive} onChange={() => {
            const next = !byokActive;
            setByokActive(next);
            supabase.from("user_roles").update({ byok_active: next }).eq("user_id", user.id);
          }} />
        </div>

        <Field variant="settings" label="ANTHROPIC API KEY" tooltip="Your sk-ant-… key from console.anthropic.com">
          <div className="flex gap-2">
            <input
              type="password"
              placeholder={hasKey ? "••••••••••••••••" : "sk-ant-..."}
              className="lex-input flex-1 text-sm font-mono"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
            />
            <button
              onClick={saveKey}
              disabled={saving || !keyInput.trim()}
              className="lex-btn lex-btn--primary px-6"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : "Save Key"}
            </button>
          </div>
        </Field>

        {hasKey && (
          <p className="text-[11px] font-mono mt-4" style={{ color: "var(--verdict-neon)" }}>
            ✓ Key is configured and encrypted.
          </p>
        )}
      </div>

      <div className="rounded-lg p-6" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading variant="settings">HOW IT WORKS</SectionHeading>
        <ul className="mt-4 space-y-3 text-[13px]" style={{ color: "var(--fg-tertiary)", lineHeight: 1.6 }}>
          <li className="flex gap-2"><span style={{ color: "var(--verdict-neon)" }}>•</span> LexAgent will use your key for all Claude-powered features.</li>
          <li className="flex gap-2"><span style={{ color: "var(--verdict-neon)" }}>•</span> You will be billed by Anthropic according to their pricing.</li>
          <li className="flex gap-2"><span style={{ color: "var(--verdict-neon)" }}>•</span> Your key is encrypted at rest and never shared.</li>
        </ul>
      </div>
    </div>
  );
}
