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
            className="fade-in max-w-xs rounded px-3 py-2 text-[11px] leading-relaxed shadow-xl z-50"
            style={{
              background: "rgba(17,17,20,0.95)",
              border: "0.5px solid rgba(224,224,224,0.14)",
              color: "var(--fg-tertiary)",
              fontFamily: "var(--font-sans)",
              backdropFilter: "blur(12px)",
            }}
          >
            {content}
            <TooltipPrimitive.Arrow
              style={{ fill: "rgba(224,224,224,0.14)" }}
              width={10}
              height={5}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
