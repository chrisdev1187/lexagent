"use client";

import React from "react";
import { LexTooltip } from "./LexTooltip";
import { clsx } from "clsx";

interface SectionHeadingProps {
  children: React.ReactNode;
  variant?: "admin" | "settings";
  className?: string;
}

export function SectionHeading({ children, variant = "admin", className }: SectionHeadingProps) {
  if (variant === "settings") {
    return (
      <h3 className={clsx("lex-page-eyebrow mt-6 first:mt-0", className)} style={{ marginBottom: 12 }}>
        {children}
      </h3>
    );
  }

  return (
    <h3 className={clsx("font-mono text-[10px] tracking-widest mb-3 mt-6 first:mt-0", className)} style={{ color: "var(--fg-tertiary)" }}>
      {children}
    </h3>
  );
}

interface FieldProps {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
  variant?: "admin" | "settings";
}

export function Field({ label, tooltip, children, variant = "admin" }: FieldProps) {
  const labelCls = variant === "settings"
    ? "font-mono text-[10px] tracking-[0.16em] uppercase"
    : "font-mono text-[11px] tracking-wider";

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className={labelCls} style={{ color: "var(--fg-tertiary)" }}>{label}</label>
        {tooltip && (
          <LexTooltip content={tooltip} side="right">
            <span className="w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center cursor-help flex-shrink-0"
              style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(0,255,195,0.14)", color: "var(--fg-tertiary)" }}>
              ?
            </span>
          </LexTooltip>
        )}
      </div>
      {children}
    </div>
  );
}
