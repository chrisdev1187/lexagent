"use client";

import { useEffect, ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { SettingsProvider } from "./settings-provider";
import { TooltipSettingsProvider } from "./tooltip-provider";
import { RegionProvider } from "./region-provider";
import { TeamsProvider } from "./teams-provider";
import { MattersProvider } from "./matters-provider";
import { ToastProvider } from "./toast-provider";
import { warmRender } from "@/lib/health";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => { warmRender(); }, []);
  return (
    <AuthProvider>
      <RegionProvider>
        <SettingsProvider>
          <TeamsProvider>
            <MattersProvider>
              <TooltipSettingsProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </TooltipSettingsProvider>
            </MattersProvider>
          </TeamsProvider>
        </SettingsProvider>
      </RegionProvider>
    </AuthProvider>
  );
}
