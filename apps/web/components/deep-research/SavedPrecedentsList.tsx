"use client";
import { ExternalLink, Trash2 } from "lucide-react";

import { SavedPrecedent } from "@/types/research";
const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  congress: { label: "Congress", color: "var(--verdict-amber)" },
  ecfr: { label: "eCFR", color: "var(--verdict-neon)" },
  opinion: { label: "Opinion", color: "var(--verdict-violet)" },
  edgar: { label: "SEC", color: "#0ea5e9" },
  govinfo: { label: "GovInfo", color: "#a78bfa" },
  openstates: { label: "State Leg.", color: "#34d399" },
  patent: { label: "Patent", color: "#fb923c" },
};
interface SavedPrecedentsListProps { precedents: SavedPrecedent[]; onRemove: (id: string) => void; }
export function SavedPrecedentsList({ precedents, onRemove }: SavedPrecedentsListProps) {
  if (precedents.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-mono tracking-wider mb-2" style={{ color: "var(--fg-tertiary)" }}>SAVED TO MATTER ({precedents.length})</p>
      <div className="space-y-2">
        {precedents.map((p) => {
          const badge = SOURCE_BADGE[p.source];
          return (
            <div key={p.id} className="rounded px-3 py-2.5 flex items-center gap-3" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(17,17,20,0.7)", color: badge?.color ?? "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}>{badge?.label ?? p.source}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.title}</p>
                <p className="text-xs font-mono opacity-50">{p.citation}</p>
              </div>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="p-1 rounded cursor-pointer flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}><ExternalLink size={12} /></a>}
              <button onClick={() => onRemove(p.id)} className="p-1 rounded cursor-pointer flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}><Trash2 size={12} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
