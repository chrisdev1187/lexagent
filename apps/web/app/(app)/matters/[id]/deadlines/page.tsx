"use client";
import { Clock } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function DeadlinesPage() {
  return <PanelShell icon={Clock} title="Deadlines" description="Case deadline tracking and calendar management"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Deadlines — coming soon</p></div></PanelShell>;
}
