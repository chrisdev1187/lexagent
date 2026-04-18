"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { SettingsProvider } from "./settings-provider";
import { TooltipSettingsProvider } from "./tooltip-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <TooltipSettingsProvider>
          {children}
        </TooltipSettingsProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
