"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { AppSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { store, vaultStore } from "@/lib/storage";
import { setAnthropicKey } from "@/lib/api";

const VAULT_KEY = "lex4-api-vault-v1";

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  saveSettings: (next: AppSettings) => Promise<void>;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, vault] = await Promise.all([
        store.get("lex4-settings"),
        vaultStore.get(VAULT_KEY),
      ]);
      const merged: AppSettings = { ...DEFAULT_SETTINGS, ...(s || {}) };
      if (vault?.courtListenerToken) merged.courtListenerToken = vault.courtListenerToken;
      if (vault?.govInfoKey) merged.govInfoKey = vault.govInfoKey;
      if (vault?.anthropicKey) merged.anthropicKey = vault.anthropicKey;
      setSettings(merged);
      if (merged.anthropicKey) setAnthropicKey(merged.anthropicKey);
      setLoaded(true);
    })();
  }, []);

  const saveSettings = useCallback(async (next: AppSettings) => {
    setSettings(next);
    // Persist non-sensitive settings
    const { anthropicKey, courtListenerToken, govInfoKey, openStatesKey, ...nonSensitive } = next;
    await store.set("lex4-settings", nonSensitive);
    // Persist sensitive keys to vault
    await vaultStore.set(VAULT_KEY, { anthropicKey, courtListenerToken, govInfoKey, openStatesKey });
    if (next.anthropicKey) setAnthropicKey(next.anthropicKey);
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside <SettingsProvider>");
  return ctx;
}
