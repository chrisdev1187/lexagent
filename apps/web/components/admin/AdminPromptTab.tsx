"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { Field } from "@/components/shared/AdminSettingsShared";
import { DEFAULT_SYSTEM, ARES_PROMPT_VERSION } from "@/lib/settings";

const inputCls = "w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all";
const inputStyle = {
  background: "var(--bg-raised)",
  border: "0.5px solid rgba(224,224,224,0.09)",
  color: "var(--fg-primary)",
  outline: "none",
};

export function AdminPromptTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  return (
    <div>
      <SectionHeading>SYSTEM PROMPT — ARES v{ARES_PROMPT_VERSION}</SectionHeading>
      <Field label={`ARES SYSTEM PROMPT (v${ARES_PROMPT_VERSION})`} tooltip="This prompt defines ARES's behavior — modify with care">
        <textarea
          className={inputCls}
          style={{ ...inputStyle, resize: "vertical", minHeight: 320, fontFamily: "var(--font-mono)", fontSize: "0.75rem", lineHeight: 1.7 }}
          value={settings.systemPrompt}
          onChange={e => set("systemPrompt", e.target.value)}
        />
      </Field>
      <button
        onClick={() => set("systemPrompt", DEFAULT_SYSTEM)}
        className="text-xs underline cursor-pointer"
        style={{ color: "var(--fg-tertiary)" }}
      >
        Reset to ARES v{ARES_PROMPT_VERSION}
      </button>
    </div>
  );
}
