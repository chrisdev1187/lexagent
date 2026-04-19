"use client";

import { useEffect, useState, useCallback } from "react";
import { getQuotaStatus, type QuotaStatus } from "@/lib/quota";
import { useAuth } from "@/lib/auth";

export function useQuota() {
  const { user } = useAuth();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const q = await getQuotaStatus();
    setQuota(q);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { quota, loading, refresh };
}
