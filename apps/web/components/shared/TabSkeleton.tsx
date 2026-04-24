"use client";

export function TabSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Heading */}
      <div className="h-3 w-32 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      {/* Input-like bar */}
      <div className="h-10 w-full rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
      {/* Content rows */}
      <div className="space-y-3 pt-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div
              className="h-2.5 rounded"
              style={{
                background: "rgba(255,255,255,0.05)",
                width: `${70 + (i % 3) * 10}%`,
              }}
            />
            <div
              className="h-2 rounded"
              style={{
                background: "rgba(255,255,255,0.03)",
                width: `${50 + (i % 4) * 8}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded p-4 animate-pulse"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(224,224,224,0.06)",
      }}
    >
      <div className="h-3 w-1/2 rounded mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-2 w-3/4 rounded mb-2" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-2 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}
