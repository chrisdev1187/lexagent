"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { vaultStore } from "@/lib/storage";
import { loadMatters, upsertMatter, upsertMatters, deleteMatter } from "@/lib/db";
import { useAuth } from "@/lib/auth";

export interface Matter {
  id: string;
  title: string;
  client: string;
  caseType: string;
  jurisdiction: string;
  status: string;
  facts: string;
  judgeName: string;
  court: string;
  shared: boolean;
  createdAt: number;
  precedents: unknown[];
  notes: unknown[];
  allVerifications: unknown[];
  deadlines: unknown[];
  timeEntries: unknown[];
  totalMinsBilled: number;
  strategy?: unknown;
  _shared?: boolean;
  [key: string]: unknown;
}

interface MattersContextValue {
  matters: Matter[];
  loaded: boolean;
  createMatter: (form: Partial<Matter>) => Promise<Matter>;
  updateMatter: (updated: Matter | ((prev: Matter) => Matter)) => Promise<void>;
  deleteMatter: (id: string) => Promise<void>;
  getMatter: (id: string) => Matter | undefined;
}

const MattersContext = createContext<MattersContextValue | null>(null);

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const _ns = (k: string, shared?: boolean) => (shared ? "lexagent:vault:" : "lexagent:") + k;

export function MattersProvider({ children, onShowOnboarding }: { children: ReactNode; onShowOnboarding?: () => void }) {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const localCases: Matter[] = (await vaultStore.get("lex4-cases")) || [];

      if (user) {
        try {
          const cloudCases = await loadMatters(user.id) as Matter[];
          const cloudIds = new Set(cloudCases.map(x => x.id));
          const localOnly = localCases.filter(x => !cloudIds.has(x.id));
          if (localOnly.length) await upsertMatters(user.id, localOnly as Record<string, unknown>[]).catch(() => {});
          const merged = [...cloudCases, ...localOnly];
          setMatters(merged);
          vaultStore.set("lex4-cases", merged);
          setLoaded(true);
          return;
        } catch (e) {
          console.warn("[Matters] Supabase load failed, using localStorage:", (e as Error).message);
        }
      }

      if (localCases.length) setMatters(localCases);
      setLoaded(true);
      if (!localCases.length) onShowOnboarding?.();
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMatter = useCallback(async (form: Partial<Matter>): Promise<Matter> => {
    const nc: Matter = {
      ...form,
      id: genId(),
      createdAt: Date.now(),
      precedents: [],
      notes: [],
      allVerifications: [],
      deadlines: [],
      timeEntries: [],
      totalMinsBilled: 0,
      title: form.title || "Untitled Matter",
      client: form.client || "",
      caseType: form.caseType || "",
      jurisdiction: form.jurisdiction || "",
      status: form.status || "Active",
      facts: form.facts || "",
      judgeName: form.judgeName || "",
      court: form.court || "",
      shared: form.shared || false,
    };
    const next = [nc, ...matters];
    setMatters(next);
    await vaultStore.set("lex4-cases", next);
    if (user) upsertMatter(user.id, nc as Record<string, unknown>).catch(() => {});
    return nc;
  }, [matters, user]);

  const updateMatter = useCallback(async (updated: Matter | ((prev: Matter) => Matter)) => {
    if (typeof updated === "function") {
      setMatters(prev => {
        const newMatters = prev.map(m => {
          const result = (updated as (prev: Matter) => Matter)(m);
          return result.id === m.id ? result : m;
        });
        vaultStore.set("lex4-cases", newMatters);
        return newMatters;
      });
      return;
    }
    setMatters(prev => {
      const next = prev.map(c => c.id === updated.id ? updated : c);
      vaultStore.set("lex4-cases", next);
      return next;
    });
    if (user) upsertMatter(user.id, updated as Record<string, unknown>).catch(() => {});
  }, [user]);

  const removeMatter = useCallback(async (id: string) => {
    const next = matters.filter(c => c.id !== id);
    setMatters(next);
    await vaultStore.set("lex4-cases", next);
    if (user) deleteMatter(id).catch(() => {});
  }, [matters, user]);

  const getMatter = useCallback((id: string) => matters.find(m => m.id === id), [matters]);

  return (
    <MattersContext.Provider value={{ matters, loaded, createMatter, updateMatter, deleteMatter: removeMatter, getMatter }}>
      {children}
    </MattersContext.Provider>
  );
}

export function useMatters() {
  const ctx = useContext(MattersContext);
  if (!ctx) throw new Error("useMatters must be inside <MattersProvider>");
  return ctx;
}
