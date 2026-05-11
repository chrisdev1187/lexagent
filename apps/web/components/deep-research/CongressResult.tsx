"use client";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
export interface CongressBill { congress: number; number: string; type: string; title: string; originChamber: string; latestAction?: { actionDate: string; text: string }; url?: string; }
export function formatBillCitation(bill: CongressBill): string {
  const typeMap: Record<string, string> = { HR: "H.R.", S: "S.", HJRES: "H.J. Res.", SJRES: "S.J. Res.", HCONRES: "H. Con. Res.", SCONRES: "S. Con. Res.", HRES: "H. Res.", SRES: "S. Res.", };
  const typeLabel = typeMap[bill.type.toUpperCase()] ?? bill.type;
  return `${typeLabel} ${bill.number}, ${bill.congress}th Cong. (${new Date().getFullYear()})`;
}
interface CongressResultProps { bill: CongressBill; isSaved: boolean; onSave: (bill: CongressBill) => void; }
export function CongressResult({ bill, isSaved, onSave }: CongressResultProps) {
  return (
    <div className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5 line-clamp-2" style={{ color: "var(--fg-primary)" }}>{bill.title}</p>
        <p className="text-xs font-mono" style={{ color: "var(--verdict-amber)" }}>{formatBillCitation(bill)}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {bill.url && <a href={bill.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md cursor-pointer" style={{ color: "var(--fg-tertiary)" }}><ExternalLink size={13} /></a>}
        <button onClick={() => !isSaved && onSave(bill)} className="p-1.5 rounded-md cursor-pointer" style={{ color: isSaved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>
          {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        </button>
      </div>
    </div>
  );
}
