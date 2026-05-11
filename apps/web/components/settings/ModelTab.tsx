"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { Field } from "@/components/shared/AdminSettingsShared";

export function ModelTab() {
  const { settings, updateSettings, saveSettings } = useSettings();

  const set = async (k: string, v: unknown) => {
    updateSettings({ [k]: v });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <SectionHeading variant="settings">MODEL CONFIGURATION</SectionHeading>
        <Field variant="settings" label="MODEL" tooltip="Select Claude model">
          <select
            className="lex-input w-full text-sm cursor-pointer"
            value={settings.model}
            onChange={e => set("model", e.target.value)}
          >
            <option value="auto">Auto (recommended)</option>
            <option value="claude-opus-4-7">claude-opus-4-7 — most capable</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6 — balanced</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 — fastest</option>
          </select>
        </Field>

        <Field variant="settings" label={`MAX TOKENS: ${settings.maxTokens}`} tooltip="Maximum length of AI responses">
          <input
            type="range"
            min={500}
            max={8000}
            step={100}
            value={settings.maxTokens}
            onChange={e => set("maxTokens", Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: "var(--verdict-neon)" }}
          />
          <div className="flex justify-between mt-1 font-mono text-[9px]" style={{ color: "var(--fg-quaternary)" }}>
            <span>500</span>
            <span>8000</span>
          </div>
        </Field>

        <Field variant="settings" label={`TEMPERATURE: ${settings.temperature.toFixed(2)}`} tooltip="Lower = precise, higher = creative">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.temperature}
            onChange={e => set("temperature", Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: "var(--verdict-neon)" }}
          />
          <div className="flex justify-between mt-1 font-mono text-[9px]" style={{ color: "var(--fg-quaternary)" }}>
            <span>PRECISE</span>
            <span>CREATIVE</span>
          </div>
        </Field>
      </div>
    </div>
  );
}
