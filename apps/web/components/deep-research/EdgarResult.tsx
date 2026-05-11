"use client";
import { Bookmark, BookmarkCheck } from "lucide-react";
export interface EdgarFiling { id: string; entityName: string; formType: string; fileDate: string; periodOfReport?: string; description?: string; }
interface EdgarResultProps { filing: EdgarFiling; isSaved: boolean; onSave: (f: EdgarFiling) => void; }
export function EdgarResult({ filing, isSaved, onSave }: EdgarResultProps) {
  return (
    <div className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <div className="flex-1 min-w-0 text-xs">
        <span className="font-bold text-[#0ea5e9]">{filing.formType}</span> · {filing.entityName} · {filing.fileDate}
      </div>
      <button onClick={() => !isSaved && onSave(filing)} className="p-1.5 rounded-md cursor-pointer flex-shrink-0" style={{ color: isSaved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>
        {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
      </button>
    </div>
  );
}
