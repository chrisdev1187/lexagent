/**
 * localStorage shim — drop-in replacement for the Claude artifact window.storage API.
 *
 * window.storage semantics (Claude artifact):
 *   get(key, shared?)  → { value: string } | null   (async)
 *   set(key, value, shared?)                          (async)
 *   delete(key, shared?)                              (async)
 *
 * "shared" (cross-device) in Claude becomes a namespaced key here.
 * All values are stored as-is (callers in LexAgent wrap in JSON.stringify themselves).
 */

const NS = "lexagent:";
const NS_VAULT = "lexagent:vault:";

function ns(key: string, shared?: boolean): string {
  return (shared ? NS_VAULT : NS) + key;
}

export const storage = {
  async get(key: string, shared?: boolean): Promise<{ value: string } | null> {
    try {
      const raw = localStorage.getItem(ns(key, shared));
      if (raw === null) return null;
      return { value: raw };
    } catch {
      return null;
    }
  },

  async set(key: string, value: string, shared?: boolean): Promise<void> {
    try {
      localStorage.setItem(ns(key, shared), value);
    } catch {}
  },

  async delete(key: string, shared?: boolean): Promise<void> {
    try {
      localStorage.removeItem(ns(key, shared));
    } catch {}
  },
};

// Convenience: list all keys under a namespace (useful for future migrations)
export function listStorageKeys(shared?: boolean): string[] {
  const prefix = shared ? NS_VAULT : NS;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k.slice(prefix.length));
  }
  return keys;
}
