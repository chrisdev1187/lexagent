"use client";
import { Scale } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function ConflictPage() {
  return <PanelShell icon={Scale} title="Conflict Check" description="Conflict of interest checker across all active matters"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Conflict Check — coming soon</p></div></PanelShell>;
}
