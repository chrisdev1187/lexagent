const _ns = (k: string, shared?: boolean) => (shared ? "lexagent:vault:" : "lexagent:") + k;

export const store = {
  get: async (k: string) => {
    try {
      const r = localStorage.getItem(_ns(k));
      return r !== null ? JSON.parse(r) : null;
    } catch { return null; }
  },
  set: async (k: string, v: unknown) => {
    try { localStorage.setItem(_ns(k), JSON.stringify(v)); } catch {}
  },
};

export const vaultStore = {
  get: async (k: string) => {
    try {
      const r = localStorage.getItem(_ns(k, true));
      return r !== null ? JSON.parse(r) : null;
    } catch { return null; }
  },
  set: async (k: string, v: unknown) => {
    try { localStorage.setItem(_ns(k, true), JSON.stringify(v)); } catch {}
  },
  del: async (k: string) => {
    try { localStorage.removeItem(_ns(k, true)); } catch {}
  },
};
