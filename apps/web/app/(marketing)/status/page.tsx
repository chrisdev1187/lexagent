"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Scale, CheckCircle, XCircle, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://lexagent-0o5u.onrender.com";

interface ServiceStatus {
  name: string;
  url: string;
  status: "checking" | "ok" | "degraded" | "down";
  latencyMs?: number;
}

const SERVICES: Omit<ServiceStatus, "status" | "latencyMs">[] = [
  { name: "API", url: `${API_URL}/health` },
  { name: "Frontend", url: "/api/keep-alive" },
];

function StatusIcon({ status }: { status: ServiceStatus["status"] }) {
  if (status === "checking") return <Clock size={16} style={{ color: "var(--fg-tertiary)" }} />;
  if (status === "ok") return <CheckCircle size={16} style={{ color: "var(--verdict-neon)" }} />;
  return <XCircle size={16} style={{ color: "#ef4444" }} />;
}

function StatusDot({ status }: { status: ServiceStatus["status"] }) {
  const color =
    status === "ok"
      ? "var(--verdict-neon)"
      : status === "degraded"
      ? "#f59e0b"
      : status === "down"
      ? "#ef4444"
      : "var(--fg-tertiary)";
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: status === "ok" ? `0 0 6px ${color}` : undefined,
      }}
    />
  );
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICES.map((s) => ({ ...s, status: "checking" }))
  );
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function checkAll() {
    setServices(SERVICES.map((s) => ({ ...s, status: "checking" })));
    const results = await Promise.all(
      SERVICES.map(async (svc) => {
        const start = performance.now();
        try {
          const res = await fetch(svc.url, {
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          });
          const latencyMs = Math.round(performance.now() - start);
          return {
            ...svc,
            status: (res.ok ? "ok" : "degraded") as ServiceStatus["status"],
            latencyMs,
          };
        } catch {
          return { ...svc, status: "down" as ServiceStatus["status"], latencyMs: undefined };
        }
      })
    );
    setServices(results);
    setCheckedAt(new Date().toLocaleTimeString());
  }

  useEffect(() => { checkAll(); }, []);

  const allOk = services.every((s) => s.status === "ok");
  const anyDown = services.some((s) => s.status === "down");

  const overallLabel = anyDown ? "Partial Outage" : allOk ? "All Systems Operational" : "Checking…";
  const overallColor = anyDown ? "#ef4444" : allOk ? "var(--verdict-neon)" : "var(--fg-tertiary)";

  return (
    <main className="min-h-screen py-20 px-6" style={{ background: "var(--midnight-court)" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <Scale size={16} style={{ color: "var(--verdict-neon)" }} />
          <span className="font-serif text-sm" style={{ color: "var(--fg-tertiary)" }}>LexAgent</span>
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <StatusDot status={allOk ? "ok" : anyDown ? "down" : "checking"} />
          <h1 className="font-serif text-3xl font-semibold" style={{ color: overallColor }}>
            {overallLabel}
          </h1>
        </div>

        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{ border: "1px solid var(--border)" }}
        >
          {services.map((svc, i) => (
            <div
              key={svc.name}
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                background: "var(--surface)",
              }}
            >
              <div className="flex items-center gap-3">
                <StatusIcon status={svc.status} />
                <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>
                  {svc.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {svc.latencyMs !== undefined && (
                  <span className="text-xs font-mono" style={{ color: "var(--fg-tertiary)" }}>
                    {svc.latencyMs}ms
                  </span>
                )}
                <span
                  className="text-xs font-medium capitalize"
                  style={{
                    color:
                      svc.status === "ok"
                        ? "var(--verdict-neon)"
                        : svc.status === "checking"
                        ? "var(--fg-tertiary)"
                        : "#ef4444",
                  }}
                >
                  {svc.status === "checking" ? "Checking" : svc.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          {checkedAt && (
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
              Last checked at {checkedAt}
            </p>
          )}
          <button
            onClick={checkAll}
            className="text-xs px-3 py-1.5 rounded-md"
            style={{
              background: "var(--panel)",
              color: "var(--verdict-neon)",
              border: "1px solid var(--border)",
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    </main>
  );
}
