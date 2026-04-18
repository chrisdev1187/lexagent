"use client";
import { CalendarDays } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function TimelinePage() {
  return <PanelShell icon={CalendarDays} title="Timeline" description="Visual timeline of case events and milestones"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Timeline — coming soon</p></div></PanelShell>;
}
