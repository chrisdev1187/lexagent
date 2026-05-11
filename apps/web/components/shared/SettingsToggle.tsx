"use client";

import React from "react";

export function SettingsToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative flex-shrink-0 cursor-pointer transition-all duration-200"
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: checked ? "var(--verdict-neon)" : "rgba(255,255,255,0.08)",
        border: `0.5px solid ${checked ? "rgba(0,255,195,0.5)" : "rgba(224,224,224,0.12)"}`,
        boxShadow: checked ? "0 0 10px rgba(0,255,195,0.3)" : "none",
      }}
    >
      <span
        className="absolute top-[3px] w-5 h-5 rounded-full transition-all duration-200"
        style={{
          background: checked ? "var(--midnight-court)" : "var(--fg-tertiary)",
          left: checked ? "calc(100% - 23px)" : 3,
        }}
      />
    </button>
  );
}
