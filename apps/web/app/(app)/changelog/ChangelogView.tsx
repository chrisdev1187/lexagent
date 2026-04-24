"use client";

import { ScrollText } from "lucide-react";
import { Markdown } from "@/components/shared/Markdown";

export function ChangelogView({ md, version }: { md: string; version: string }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-8 h-8 rounded flex items-center justify-center"
          style={{
            background: "rgba(0,255,195,0.06)",
            border: "0.5px solid rgba(0,255,195,0.22)",
          }}
        >
          <ScrollText size={15} style={{ color: "var(--verdict-neon)" }} />
        </div>
        <div>
          <h2
            className="font-serif font-semibold text-base leading-tight tracking-tight"
            style={{ color: "var(--fg-primary)" }}
          >
            Release Notes
          </h2>
          <p
            className="font-mono text-[10px] tracking-[0.14em] uppercase mt-0.5"
            style={{ color: "var(--fg-quaternary)" }}
          >
            Current version v{version} — all shipped changes, newest first
          </p>
        </div>
      </div>

      <div
        className="rounded p-6"
        style={{
          background: "rgba(17,17,20,0.7)",
          border: "0.5px solid rgba(224,224,224,0.09)",
        }}
      >
        <Markdown text={md} className="lex-prose" />
      </div>
    </div>
  );
}
