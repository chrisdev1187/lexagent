"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { Field } from "@/components/shared/AdminSettingsShared";

const inputCls = "w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all";
const inputStyle = {
  background: "var(--bg-raised)",
  border: "0.5px solid rgba(224,224,224,0.09)",
  color: "var(--fg-primary)",
  outline: "none",
};

export function AdminModelTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  return (
    <div>
      <SectionHeading>MODEL CONFIGURATION</SectionHeading>
      <Field label="MODEL" tooltip="Select Claude model — claude-opus-4-7 is most capable, claude-haiku-4-5 is fastest">
        <select
          className={inputCls}
          style={{ ...inputStyle, cursor: "pointer" }}
          value={settings.model}
          onChange={e => set("model", e.target.value)}
        >
          <option value="auto">Auto (recommended)</option>
          <option value="claude-opus-4-7">claude-opus-4-7 — most capable</option>
          <option value="claude-sonnet-4-6">claude-sonnet-4-6 — balanced</option>
          <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 — fastest</option>
        </select>
      </Field>
      <Field label={`MAX TOKENS: ${settings.maxTokens}`} tooltip="Maximum length of AI responses — higher = more detailed but slower">
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
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>500</span>
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>8000</span>
        </div>
      </Field>
      <Field label={`TEMPERATURE: ${settings.temperature.toFixed(2)}`} tooltip="Lower = more precise/deterministic, higher = more creative">
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
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Precise</span>
          <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Creative</span>
        </div>
      </Field>
    </div>
  );
}
