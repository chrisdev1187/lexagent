"use client";
import { Users } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function JudgePage() {
  return <PanelShell icon={Users} title="Judge Intel" description="Judge profile: career history, rulings, political affiliations"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Judge Intel — coming soon</p></div></PanelShell>;
}
