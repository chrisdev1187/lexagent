"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";
import { SettingsToggle } from "@/components/shared/SettingsToggle";

export function ShieldTab() {
  const { settings, updateSettings, saveSettings } = useSettings();

  const toggle = async () => {
    updateSettings({ autoVerify: !settings.autoVerify });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6" style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <SectionHeading variant="settings">HALLUCINATION SHIELD</SectionHeading>
            <p className="text-[13px] mt-1" style={{ color: "var(--fg-tertiary)", lineHeight: 1.6 }}>
              Automatically verify all citations against CourtListener after each research query.
            </p>
          </div>
          <SettingsToggle checked={settings.autoVerify} onChange={toggle} />
        </div>
        <div className="rounded p-4 text-xs italic" style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.2)", color: "var(--fg-secondary)", lineHeight: 1.65 }}>
          ARES verifies citations against 18M+ records. Verified citations are marked with a neon shield; unverified ones are flagged.
        </div>
      </div>
    </div>
  );
}
