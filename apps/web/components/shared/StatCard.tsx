"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  animClass?: string;
  href?: string;
  variant?: "primary" | "compact";
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "var(--verdict-neon)",
  animClass = "fade-in",
  href,
  variant = "primary"
}: StatCardProps) {
  const content = (
    <div className={clsx(
      variant === "primary" ? "lex-stat-card" : "flex items-center gap-2.5 rounded-lg p-3",
      animClass,
      href && "cursor-pointer transition-all duration-150"
    )}
    style={variant === "compact" ? {
      background: "rgba(17,17,20,0.7)",
      border: "0.5px solid rgba(224,224,224,0.09)",
      minHeight: 60,
    } : {}}
    >
      {variant === "primary" ? (
        <>
          <div className="lex-stat-card__accent" style={{ background: color }} />
          <div className="lex-stat-card__body">
            <div
              className="lex-stat-card__icon"
              style={{
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                border: `0.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
              }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <div className="lex-stat-card__meta">
              <div className="lex-stat-card__label">{label}</div>
              <div className="lex-stat-card__number">{value}</div>
              {sub && <div className="text-[10px] mt-1 font-mono uppercase tracking-wider opacity-50">{sub}</div>}
            </div>
          </div>
        </>
      ) : (
        <>
          <Icon size={13} style={{ color, flexShrink: 0 }} />
          <div className="min-w-0">
            <div className="font-serif text-[18px] font-normal leading-none" style={{ color: "var(--fg-primary)", letterSpacing: "-0.02em" }}>{value}</div>
            <div className="font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5" style={{ color: "var(--fg-quaternary)" }}>{label}</div>
          </div>
        </>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
