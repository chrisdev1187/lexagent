"use client";
import { FileEdit } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function DraftPage() {
  return <PanelShell icon={FileEdit} title="Draft" description="AI document drafting: motions, briefs, letters, memos"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Draft — coming soon</p></div></PanelShell>;
}
