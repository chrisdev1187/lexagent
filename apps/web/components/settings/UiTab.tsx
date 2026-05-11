"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { SettingsToggle } from "@/components/shared/SettingsToggle";

export function UiTab() {
  const { settings, updateSettings, saveSettings } = useSettings();

  const toggle = async (key: string) => {
    updateSettings({ [key]: !(settings as any)[key] });
  };

  const uiItems = [
    { key: "tooltipsEnabled", label: "Tooltips", desc: "Show contextual help on hover", tooltip: "Disable if you prefer a cleaner workspace" },
    { key: "animationsEnabled", label: "Animations", desc: "Enable motion transitions", tooltip: "Disable for reduced motion" },
    { key: "sidebarCollapsed", label: "Start Collapsed", desc: "Sidebar starts in icon-only mode", tooltip: "Saves horizontal space" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeading variant="settings">INTERFACE PREFERENCES</SectionHeading>
      {uiItems.map(item => (
        <div key={item.key} className="flex items-center justify-between rounded-lg p-5" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{item.label}</p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-tertiary)" }}>{item.desc}</p>
          </div>
          <SettingsToggle checked={!!(settings as any)[item.key]} onChange={() => toggle(item.key)} />
        </div>
      ))}
    </div>
  );
}
