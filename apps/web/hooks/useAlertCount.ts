"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const POLL_MS = 60_000;

function token(): string {
  try {
    const raw = localStorage.getItem("sb-mgiqicasllvisiwvbiuu-auth-token");
    return (JSON.parse(raw ?? "null") as { access_token?: string } | null)?.access_token ?? "";
  } catch { return ""; }
}

export function useAlertCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const t = token();
      if (!t) return;
      const res = await fetch(`${API_URL}/api/dockets/alert-count`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const d = await res.json() as { count: number };
        setCount(d.count);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { count, refresh };
}
