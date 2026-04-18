"use client";

import { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useTooltipSettings } from "@/providers/tooltip-provider";

interface LexTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

export function LexTooltip({ content, children, side = "top", delayDuration = 600 }: LexTooltipProps) {
  const { enabled } = useTooltipSettings();
  if (!enabled) return <>{children}</>;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="fade-in max-w-xs rounded-lg px-3 py-2 text-xs leading-relaxed shadow-xl z-50"
            style={{
              background: "var(--panel2)",
              border: "1px solid var(--border-hi)",
              color: "var(--text-sub)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {content}
            <TooltipPrimitive.Arrow
              style={{ fill: "var(--border-hi)" }}
              width={10}
              height={5}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
