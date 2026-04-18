"use client";
import { ShieldCheck } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function CitationsPage() {
  return <PanelShell icon={ShieldCheck} title="Hallucination Shield" description="Verify all citations against 18M+ CourtListener records"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Citation Shield — coming soon</p></div></PanelShell>;
}
