"use client";

import { useSettings } from "@/providers/settings-provider";
import { CommandBar } from "@/components/layout/command-bar/CommandBar";

export function ThemeBody({ children }: { children: React.ReactNode }) {
  const { settings, loaded } = useSettings();
  const themeClass = loaded && settings.theme === "professional" ? "theme-professional" : "";

  return (
    <body className={`font-sans antialiased ${themeClass}`} style={{ background: "var(--bg)", color: "var(--text)" }}>
      <CommandBar />
      {children}
    </body>
  );
}
