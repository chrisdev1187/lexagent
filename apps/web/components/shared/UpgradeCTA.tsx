"use client";

import { X, Zap } from "lucide-react";

interface UpgradeCTAProps {
  reason: string;
  onClose: () => void;
}

export function UpgradeCTA({ reason, onClose }: UpgradeCTAProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="lex-card lex-card--raised"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded cursor-pointer lex-btn lex-btn--ghost"
        >
          <X size={15} />
        </button>

        <div
          className="w-9 h-9 rounded flex items-center justify-center mb-4 lex-chip lex-chip--amber"
        >
          <Zap size={16} style={{ color: "var(--verdict-amber)" }} />
        </div>

        <h2
          className="font-serif font-semibold text-base mb-1.5 tracking-tight"
          style={{ color: "var(--fg-primary)" }}
        >
          Upgrade your plan
        </h2>
        <p
          className="text-sm mb-5 leading-relaxed"
          style={{ color: "var(--fg-secondary)" }}
        >
          {reason}
        </p>

        <div className="flex gap-2">
          <a
            href="mailto:sales@lexagent.ai?subject=Upgrade%20Request"
            className="flex-1 flex items-center justify-center gap-1.5 rounded py-2.5 cursor-pointer lex-btn lex-btn--primary"
          >
            <Zap size={12} />
            UPGRADE NOW
          </a>
          <button
            onClick={onClose}
            className="px-4 rounded cursor-pointer lex-btn lex-btn--secondary"
          >
            LATER
          </button>
        </div>
      </div>
    </div>
  );
}
