"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { Field } from "@/components/shared/AdminSettingsShared";
import { DEFAULT_SYSTEM, ARES_PROMPT_VERSION } from "@/lib/settings";

export function PromptTab() {
  const { settings, updateSettings, saveSettings } = useSettings();

  const set = async (v: string) => {
    updateSettings({ systemPrompt: v });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading variant="settings">SYSTEM PROMPT — ARES v{ARES_PROMPT_VERSION}</SectionHeading>
        <Field variant="settings" label="ARES SYSTEM PROMPT" tooltip="This prompt defines ARES's behavior — modify with care">
          <textarea
            className="lex-input w-full font-mono text-[11px]"
            style={{ minHeight: 400, lineHeight: 1.7, resize: "vertical" }}
            value={settings.systemPrompt}
            onChange={e => updateSettings({ systemPrompt: e.target.value })}
            onBlur={e => saveSettings(settings)}
          />
        </Field>
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={() => set(DEFAULT_SYSTEM)}
            className="text-[10px] font-mono tracking-wider uppercase underline"
            style={{ color: "var(--fg-quaternary)" }}
          >
            Reset to ARES v{ARES_PROMPT_VERSION}
          </button>
          <span className="text-[10px] font-mono" style={{ color: "var(--fg-quaternary)" }}>
            {settings.systemPrompt.length} characters
          </span>
        </div>
      </div>
    </div>
  );
}
