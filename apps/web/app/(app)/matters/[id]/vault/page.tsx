"use client";
import { FileText } from "lucide-react";
import { PanelShell } from "@/components/panels/PanelShell";
export default function VaultPage() {
  return <PanelShell icon={FileText} title="Document Vault" description="Secure document storage — upload PDFs, evidence, discovery materials"><div className="rounded-xl p-8 text-center" style={{background:"var(--surface)",border:"1px solid var(--border)"}}><p className="text-sm" style={{color:"var(--text-muted)"}}>Vault — coming soon</p></div></PanelShell>;
}
