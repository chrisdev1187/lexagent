"use client";

import { useEffect, ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { SettingsProvider } from "./settings-provider";
import { TooltipSettingsProvider } from "./tooltip-provider";
import { RegionProvider } from "./region-provider";
import { TeamsProvider } from "./teams-provider";
import { warmRender } from "@/lib/health";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => { warmRender(); }, []);
  return (
    <AuthProvider>
      <RegionProvider>
        <SettingsProvider>
          <TeamsProvider>
            <TooltipSettingsProvider>
              {children}
            </TooltipSettingsProvider>
          </TeamsProvider>
        </SettingsProvider>
      </RegionProvider>
    </AuthProvider>
  );
}
