"use client";
import { Bookmark, BookmarkCheck } from "lucide-react";
export interface PatentResult { patent_id: string; patent_title: string; patent_date?: string; assignees?: Array<{ assignee_organization?: string }>; }
interface PatentResultProps { patent: PatentResult; isSaved: boolean; onSave: (p: PatentResult) => void; }
export function PatentResultItem({ patent, isSaved, onSave }: PatentResultProps) {
  return (
    <div className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <div className="flex-1 min-w-0 text-xs">
        <span className="font-bold text-[#fb923c]">No. {patent.patent_id}</span> · {patent.patent_title}
      </div>
      <button onClick={() => !isSaved && onSave(patent)} className="p-1.5 rounded-md cursor-pointer flex-shrink-0" style={{ color: isSaved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>
        {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
      </button>
    </div>
  );
}
