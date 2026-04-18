"use client";
import { BookOpen } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function NotesPage() {
  return <PanelShell icon={BookOpen} title="Evidence & Notes" description="Case notes, evidence log, and annotations"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Evidence & Notes — coming soon</p></div></PanelShell>;
}
