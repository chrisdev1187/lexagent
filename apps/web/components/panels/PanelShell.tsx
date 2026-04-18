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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
          >
            <Icon size={15} style={{ color: "var(--emerald)" }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
            {description && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
