"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface RegionInfo {
  region: string;
  currency: string;
  symbol: string;
  locale: string;
}

const DEFAULT: RegionInfo = { region: "US", currency: "USD", symbol: "$", locale: "en-US" };

const RegionContext = createContext<RegionInfo>(DEFAULT);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<RegionInfo>(DEFAULT);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
    if (!API_URL) return;
    fetch(`${API_URL}/api/region`)
      .then((r) => r.json())
      .then((data: RegionInfo) => setInfo(data))
      .catch(() => {/* keep default */});
  }, []);

  return <RegionContext.Provider value={info}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionInfo {
  return useContext(RegionContext);
}

export function formatPrice(amount: number, info: RegionInfo): string {
  return new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
