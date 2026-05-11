"use client";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
export interface OpenStatesBill { id: string; identifier: string; title: string; jurisdiction?: { name?: string }; session?: { identifier?: string }; latest_action_date?: string; openstates_url?: string; }
interface OpenStatesResultProps { bill: OpenStatesBill; isSaved: boolean; onSave: (b: OpenStatesBill) => void; }
export function OpenStatesResult({ bill, isSaved, onSave }: OpenStatesResultProps) {
  return (
    <div className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5 line-clamp-2">{bill.title}</p>
        <p className="text-xs font-mono" style={{ color: "#34d399" }}>{bill.identifier}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {bill.openstates_url && <a href={bill.openstates_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md cursor-pointer" style={{ color: "var(--fg-tertiary)" }}><ExternalLink size={13} /></a>}
        <button onClick={() => !isSaved && onSave(bill)} className="p-1.5 rounded-md cursor-pointer" style={{ color: isSaved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>
          {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        </button>
      </div>
    </div>
  );
}
