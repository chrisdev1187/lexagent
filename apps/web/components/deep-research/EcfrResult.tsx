"use client";
import { Bookmark, BookmarkCheck } from "lucide-react";
export interface EcfrResult { id: string; label: string; label_description?: string; fr_citation?: string; full_text_excerpt?: string; hierarchy_headings?: { title?: string; part?: string }; }
interface EcfrResultProps { result: EcfrResult; isSaved: boolean; onSave: (res: EcfrResult) => void; }
export function EcfrResultItem({ result, isSaved, onSave }: EcfrResultProps) {
  return (
    <div className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5 line-clamp-2">{result.label_description ?? result.label}</p>
        <p className="text-xs font-mono" style={{ color: "var(--verdict-neon)" }}>{result.fr_citation ?? result.label}</p>
      </div>
      <button onClick={() => !isSaved && onSave(result)} className="p-1.5 rounded-md cursor-pointer flex-shrink-0" style={{ color: isSaved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>
        {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
      </button>
    </div>
  );
}
