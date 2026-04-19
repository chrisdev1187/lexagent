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
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm relative"
        style={{ background: "var(--surface)", border: "1px solid var(--border-hi)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded cursor-pointer"
          style={{ color: "var(--text-muted)", background: "none", border: "none" }}
        >
          <X size={16} />
        </button>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
        >
          <Zap size={18} style={{ color: "var(--emerald)" }} />
        </div>

        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
          Upgrade your plan
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          {reason}
        </p>

        <div className="flex gap-2">
          <a
            href="mailto:sales@lexagent.ai?subject=Upgrade%20Request"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
              color: "#0A0F0D",
            }}
          >
            <Zap size={13} />
            Upgrade Now
          </a>
          <button
            onClick={onClose}
            className="px-4 rounded-xl text-sm cursor-pointer"
            style={{ background: "var(--panel2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
