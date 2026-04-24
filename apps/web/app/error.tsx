"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-md w-full text-center">
        <div
          className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)" }}
        >
          <AlertTriangle size={22} style={{ color: "var(--verdict-crimson)" }} />
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>
          Something went wrong
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--fg-tertiary)" }}>
          {error.message || "An unexpected error occurred."}
          {error.digest && <span className="block font-mono text-[10px] mt-2 opacity-60">ref: {error.digest}</span>}
        </p>
        <button
          onClick={reset}
          className="lex-btn lex-btn--primary"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      </div>
    </div>
  );
}
