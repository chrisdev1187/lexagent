"use client";
import { ScanSearch } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function DeepResearchPage() {
  return <PanelShell icon={ScanSearch} title="Deep Research" description="Multi-source legal research: Congress, eCFR, EDGAR, USPTO, OpenStates"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Deep Research — coming soon</p></div></PanelShell>;
}
