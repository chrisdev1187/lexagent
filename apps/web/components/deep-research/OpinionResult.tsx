"use client";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { CLOpinion } from "@/lib/courtlistener";
interface OpinionResultProps { opinion: CLOpinion; isSaved: boolean; onSave: (op: CLOpinion) => void; }
export function OpinionResult({ opinion, isSaved, onSave }: OpinionResultProps) {
  return (
    <div className="rounded p-3 flex items-start gap-3" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--fg-primary)" }}>{opinion.caseName}</p>
        <p className="text-xs font-mono" style={{ color: "var(--verdict-neon)" }}>{opinion.citation}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
          {opinion.court}{opinion.dateFiled ? ` · ${new Date(opinion.dateFiled).toLocaleDateString("en-US", { year: "numeric", month: "short" })}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {opinion.absoluteUrl && <a href={opinion.absoluteUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-md cursor-pointer" style={{ color: "var(--fg-tertiary)" }}><ExternalLink size={13} /></a>}
        <button onClick={() => !isSaved && onSave(opinion)} className="p-1.5 rounded-md cursor-pointer" style={{ color: isSaved ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>
          {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        </button>
      </div>
    </div>
  );
}
