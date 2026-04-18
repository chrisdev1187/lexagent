"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSettings } from "./settings-provider";

interface TooltipSettingsValue {
  enabled: boolean;
}

const TooltipSettingsContext = createContext<TooltipSettingsValue>({ enabled: true });

export function TooltipSettingsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  return (
    <TooltipSettingsContext.Provider value={{ enabled: settings.tooltipsEnabled }}>
      {children}
    </TooltipSettingsContext.Provider>
  );
}

export function useTooltipSettings() {
  return useContext(TooltipSettingsContext);
}
