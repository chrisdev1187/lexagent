"use client";
import { Target } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function StrategyPage() {
  return <PanelShell icon={Target} title="Case Strategy" description="AI-generated case strategy with argument strength analysis"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Strategy — coming soon</p></div></PanelShell>;
}
