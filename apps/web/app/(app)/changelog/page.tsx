import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ScrollText } from "lucide-react";
import { Markdown } from "@/components/shared/Markdown";
import { PanelShell } from "@/components/panels/PanelShell";

export const dynamic = "force-static";

function loadChangelog(): string {
  try {
    // Resolve from monorepo root — next runs from apps/web, changelog lives two levels up
    const p = resolve(process.cwd(), "../../CHANGELOG.md");
    return readFileSync(p, "utf8");
  } catch {
    return "# Changelog\n\nCHANGELOG.md not found at repo root.";
  }
}

export default function ChangelogPage() {
  const md = loadChangelog();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

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
