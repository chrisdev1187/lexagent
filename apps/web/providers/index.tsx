"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { SettingsProvider } from "./settings-provider";
import { TooltipSettingsProvider } from "./tooltip-provider";
import { RegionProvider } from "./region-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RegionProvider>
        <SettingsProvider>
          <TooltipSettingsProvider>
            {children}
          </TooltipSettingsProvider>
        </SettingsProvider>
      </RegionProvider>
    </AuthProvider>
  );
}
