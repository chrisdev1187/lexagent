import { supabase } from "@/lib/supabase";

export interface QuotaStatus {
  plan_id: string;
  matter_count: number;
  matter_limit: number | null;
  storage_bytes: number;
  storage_limit_mb: number | null;
  ai_spent: number;
  ai_budget: number;
  ai_requests: number;
}

export async function getQuotaStatus(): Promise<QuotaStatus | null> {
  const { data, error } = await supabase.rpc("get_quota_status");
  if (error || !data) return null;
  return data as QuotaStatus;
}

export async function adjustStorageUsage(deltaBytes: number) {
  await supabase.rpc("adjust_storage_usage", { p_delta: deltaBytes });
}

export async function checkMatterQuota(): Promise<boolean> {
  const { data } = await supabase.rpc("check_matter_quota");
  return data !== false;
}

export function storagePercent(q: QuotaStatus): number {
  if (!q.storage_limit_mb) return 0;
  return Math.min((q.storage_bytes / (q.storage_limit_mb * 1024 * 1024)) * 100, 100);
}

export function aiPercent(q: QuotaStatus): number {
  if (!q.ai_budget) return 0;
  return Math.min((q.ai_spent / q.ai_budget) * 100, 100);
}

export function matterPercent(q: QuotaStatus): number {
  if (!q.matter_limit) return 0;
  return Math.min((q.matter_count / q.matter_limit) * 100, 100);
}
