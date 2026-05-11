"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { LexTooltip } from "@/components/shared/LexTooltip";

export function AdminUiTab() {
  const { settings, updateSettings } = useSettings();

  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  const uiItems = [
    { key: "tooltipsEnabled", label: "Tooltips", desc: "Show contextual help on hover across the interface", tooltip: "Disable if you prefer a cleaner workspace after learning the UI" },
    { key: "animationsEnabled", label: "Animations", desc: "Enable motion transitions and entry animations", tooltip: "Disable for reduced motion or performance-sensitive environments" },
    { key: "sidebarCollapsed", label: "Collapsed Sidebar", desc: "Start with the sidebar in icon-only mode", tooltip: "Saves horizontal space for wider content areas" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeading>INTERFACE PREFERENCES</SectionHeading>

      {uiItems.map(item => (
        <div
          key={item.key}
          className="flex items-center justify-between rounded px-4 py-3.5"
          style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
        >
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{item.label}</span>
              <LexTooltip content={item.tooltip} side="right">
                <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help"
                  style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}>
                  ?
                </span>
              </LexTooltip>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{item.desc}</p>
          </div>
          <button
            onClick={() => set(item.key, !(settings as any)[item.key])}
            className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200"
            style={{
              background: (settings as any)[item.key] ? "var(--verdict-neon)" : "var(--bg-raised)",
              border: "0.5px solid rgba(0,255,195,0.14)",
            }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
              style={{
                background: "var(--fg-primary)",
                left: (settings as any)[item.key] ? "calc(100% - 22px)" : "2px",
              }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
