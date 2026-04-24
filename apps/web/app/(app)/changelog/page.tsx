import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ChangelogView } from "./ChangelogView";

export const dynamic = "force-static";

function loadChangelog(): string {
  try {
    const p = resolve(process.cwd(), "../../CHANGELOG.md");
    return readFileSync(p, "utf8");
  } catch {
    return "# Changelog\n\nCHANGELOG.md not found at repo root.";
  }
}

export default function ChangelogPage() {
  const md = loadChangelog();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  return <ChangelogView md={md} version={version} />;
}
