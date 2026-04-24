"use client";

import { ScrollText } from "lucide-react";
import { Markdown } from "@/components/shared/Markdown";
import { PanelShell } from "@/components/panels/PanelShell";

export function ChangelogView({ md, version }: { md: string; version: string }) {
  return (
    <PanelShell
      icon={ScrollText}
      title="Release Notes"
      description={`Current version v${version} — all shipped changes, newest first`}
    >
      <div
        className="rounded p-6"
        style={{
          background: "rgba(17,17,20,0.7)",
          border: "0.5px solid rgba(224,224,224,0.09)",
        }}
      >
        <Markdown text={md} className="lex-prose" />
      </div>
    </PanelShell>
  );
}
