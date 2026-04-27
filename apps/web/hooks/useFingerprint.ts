"use client";

import { useEffect, useState } from "react";

const CACHE_KEY = "lex_fp";
const CACHE_TTL = 3_600_000; // 1 hour

export function useFingerprint(): string | null {
  const [fp, setFp] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { id, ts } = JSON.parse(raw) as { id: string; ts: number };
        if (Date.now() - ts < CACHE_TTL) { setFp(id); return; }
      }
    } catch {}

    import("@fingerprintjs/fingerprintjs").then((FingerprintJS) =>
      FingerprintJS.load().then((agent) =>
        agent.get().then((result) => {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ id: result.visitorId, ts: Date.now() }));
          } catch {}
          setFp(result.visitorId);
        })
      )
    ).catch(() => {});
  }, []);

  return fp;
}

export function getCachedFingerprint(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { id, ts } = JSON.parse(raw) as { id: string; ts: number };
    return Date.now() - ts < CACHE_TTL ? id : null;
  } catch {
    return null;
  }
}
