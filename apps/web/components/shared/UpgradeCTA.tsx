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
        className="rounded p-6 w-full max-w-sm relative"
        style={{
          background: "rgba(17,17,20,0.92)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "0.5px solid rgba(224,224,224,0.12)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,184,0,0.08)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded cursor-pointer"
          style={{ color: "var(--fg-quaternary)", background: "none", border: "none" }}
        >
          <X size={15} />
        </button>

        <div
          className="w-9 h-9 rounded flex items-center justify-center mb-4"
          style={{
            background: "rgba(255,184,0,0.08)",
            border: "0.5px solid rgba(255,184,0,0.3)",
          }}
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
            className="flex-1 flex items-center justify-center gap-1.5 rounded py-2.5 cursor-pointer"
            style={{
              background: "var(--verdict-neon)",
              color: "var(--midnight-court)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              boxShadow: "0 0 16px rgba(0,255,195,0.35)",
            }}
          >
            <Zap size={12} />
            UPGRADE NOW
          </a>
          <button
            onClick={onClose}
            className="px-4 rounded cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.03)",
              color: "var(--fg-tertiary)",
              border: "0.5px solid rgba(224,224,224,0.10)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
            }}
          >
            LATER
          </button>
        </div>
      </div>
    </div>
  );
}
