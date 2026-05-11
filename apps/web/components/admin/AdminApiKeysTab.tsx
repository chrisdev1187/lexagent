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

export function AdminApiKeysTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  return (
    <div>
      <SectionHeading>API CREDENTIALS</SectionHeading>
      <Field label="ANTHROPIC API KEY" tooltip="Get your key at console.anthropic.com — powers all AI features">
        <input
          className={inputCls}
          style={inputStyle}
          type="password"
          value={settings.anthropicKey}
          onChange={e => set("anthropicKey", e.target.value)}
          placeholder="sk-ant-…"
        />
      </Field>
      <Field label="COURTLISTENER TOKEN" tooltip="Free at courtlistener.com/help/api — unlocks 9M+ case law records">
        <input
          className={inputCls}
          style={inputStyle}
          type="password"
          value={settings.courtListenerToken}
          onChange={e => set("courtListenerToken", e.target.value)}
          placeholder="Token from courtlistener.com"
        />
      </Field>
      <Field label="GOVINFO API KEY" tooltip="Free at api.govinfo.gov — Federal Register, CFR, bills, statutes">
        <input
          className={inputCls}
          style={inputStyle}
          type="password"
          value={settings.govInfoKey}
          onChange={e => set("govInfoKey", e.target.value)}
          placeholder="GovInfo key"
        />
      </Field>
      <Field label="OPENSTATES API KEY" tooltip="Free at openstates.org — state legislature bills and votes">
        <input
          className={inputCls}
          style={inputStyle}
          type="password"
          value={settings.openStatesKey}
          onChange={e => set("openStatesKey", e.target.value)}
          placeholder="OpenStates key"
        />
      </Field>
    </div>
  );
}
