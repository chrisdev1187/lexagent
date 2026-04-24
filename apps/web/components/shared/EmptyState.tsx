"use client";

import { ElementType, ReactNode } from "react";

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  iconColor?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = "var(--verdict-neon)",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-16 h-16 rounded flex items-center justify-center mb-5"
        style={{
          background: `color-mix(in srgb, ${iconColor} 8%, transparent)`,
          border: `0.5px solid color-mix(in srgb, ${iconColor} 28%, transparent)`,
        }}
      >
        <Icon size={26} style={{ color: iconColor }} />
      </div>
      <h3
        className="font-serif text-base font-semibold mb-2 tracking-tight"
        style={{ color: "var(--fg-primary)" }}
      >
        {title}
      </h3>
      <p
        className="font-mono text-[11px] tracking-[0.1em] uppercase mb-6 max-w-xs"
        style={{ color: "var(--fg-quaternary)" }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
