"use client";

import { useSettings } from "@/providers/settings-provider";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

export function AdminShieldTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  return (
    <div>
      <SectionHeading>HALLUCINATION SHIELD</SectionHeading>
      <div
        className="rounded px-4 py-3.5 mb-4 flex items-center justify-between"
        style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
      >
        <div>
          <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>Auto-Verify Citations</span>
          <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
            Automatically verify all citations against CourtListener after each research query
          </p>
        </div>
        <button
          onClick={() => set("autoVerify", !settings.autoVerify)}
          className="relative flex-shrink-0 w-11 h-6 rounded-full cursor-pointer transition-all duration-200 ml-4"
          style={{
            background: settings.autoVerify ? "var(--verdict-neon)" : "var(--bg-raised)",
            border: "0.5px solid rgba(0,255,195,0.14)",
          }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
            style={{
              background: "var(--fg-primary)",
              left: settings.autoVerify ? "calc(100% - 22px)" : "2px",
            }}
          />
        </button>
      </div>
      <div
        className="rounded px-4 py-3 text-xs"
        style={{
          background: "rgba(0,255,195,0.06)",
          border: "0.5px solid rgba(0,255,195,0.28)",
          color: "var(--fg-secondary)",
          lineHeight: 1.7,
        }}
      >
        ARES verifies citations against 18M+ CourtListener records. Verified citations are marked with a shield; unverified citations are flagged with a warning. Requires a CourtListener API token.
      </div>
    </div>
  );
}
