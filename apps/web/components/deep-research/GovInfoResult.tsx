"use client";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
export interface GovInfoDoc { packageId: string; title: string; dateIssued?: string; governmentAuthor1?: string; collectionCode?: string; packageLink?: string; }
interface GovInfoResultProps { doc: GovInfoDoc; isSaved: boolean; onSave: (d: GovInfoDoc) => void; }
export function GovInfoResult({ doc, isSaved, onSave }: GovInfoResultProps) {
  return (
    <div className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5 line-clamp-2">{doc.title}</p>
        <p className="text-xs font-mono" style={{ color: "#a78bfa" }}>{doc.packageId}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {doc.packageLink && <a href={doc.packageLink} target="_blank" rel="noreferrer" className="p-1.5 rounded-md cursor-pointer" style={{ color: "var(--fg-tertiary)" }}><ExternalLink size={13} /></a>}
        <button onClick={() => !isSaved && onSave(doc)} className="p-1.5 rounded-md cursor-pointer" style={{ color: isSaved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>
          {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        </button>
      </div>
    </div>
  );
}
