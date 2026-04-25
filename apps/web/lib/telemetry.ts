const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ServiceStatus = "green" | "amber" | "red" | "unknown";

export interface ServiceResult {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
}

export interface DeepHealthResult {
  overall: ServiceStatus;
  services: Record<string, ServiceResult>;
  ts: string;
}

export async function fetchDeepHealth(): Promise<DeepHealthResult> {
  if (!API_URL) {
    return {
      overall: "red",
      services: {},
      ts: new Date().toISOString(),
    };
  }
  const res = await fetch(`${API_URL}/api/health/deep`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health probe failed: ${res.status}`);
  return res.json() as Promise<DeepHealthResult>;
}
