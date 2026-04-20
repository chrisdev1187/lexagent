"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PanelShellProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PanelShell({ icon: Icon, title, description, actions, children }: PanelShellProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{
              background: "rgba(0,255,195,0.06)",
              border: "0.5px solid rgba(0,255,195,0.22)",
            }}
          >
            <Icon size={15} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <div>
            <h2
              className="font-serif font-semibold text-base leading-tight tracking-tight"
              style={{ color: "var(--fg-primary)" }}
            >
              {title}
            </h2>
            {description && (
              <p
                className="font-mono text-[10px] tracking-[0.14em] uppercase mt-0.5"
                style={{ color: "var(--fg-quaternary)" }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
