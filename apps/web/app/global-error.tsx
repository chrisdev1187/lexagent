"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", color: "#e0e0e0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ maxWidth: "480px", textAlign: "center" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>Fatal error</h1>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
              The application encountered an unrecoverable error.
              {error.digest && <span style={{ display: "block", fontFamily: "monospace", fontSize: "10px", marginTop: "8px", opacity: 0.6 }}>ref: {error.digest}</span>}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                fontSize: "12px",
                background: "#00ffc3",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
