"use client";

import { useEffect, useState } from "react";
import { X, Scale } from "lucide-react";

const SESSION_KEY = "lex_disclaimer_shown";

export function DisclaimerBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, "1");
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg max-w-lg w-[calc(100vw-2rem)]"
      style={{
        background: "rgba(17,17,20,0.96)",
        border: "0.5px solid rgba(224,224,224,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Scale size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--verdict-neon)" }} />
      <p className="text-[12px] leading-relaxed flex-1" style={{ color: "var(--fg-tertiary)" }}>
        <span style={{ color: "var(--fg-secondary)", fontWeight: 500 }}>ARES</span> provides legal research assistance only.
        Not a substitute for licensed legal advice. Attorney responsibilities governed by applicable Rules of Professional Conduct.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: "var(--fg-tertiary)" }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
