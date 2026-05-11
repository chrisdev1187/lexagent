"use client";

import { ShieldCheck, Zap, Scissors, Loader2, ExternalLink, Archive, Trash2 } from "lucide-react";

export interface VaultDoc {
  id: string;
  title: string;
  docType: string;
  section: "confidential" | "context";
  url?: string;
  storagePath?: string;
  fileSize?: number;
  fileType?: string;
  notes?: string;
  acp?: boolean;
  aresEnriched?: boolean;
  aresContext?: string;
  redacted?: boolean;
  createdAt: number;
}

export const TYPE_COLORS: Record<string, string> = {
  Motion: "var(--verdict-amber)",
  Brief: "var(--verdict-neon)",
  Contract: "var(--verdict-violet)",
  Evidence: "var(--verdict-crimson)",
  Discovery: "#0ea5e9",
  Correspondence: "var(--fg-secondary)",
  Pleading: "var(--verdict-amber)",
  Order: "var(--verdict-crimson)",
  Other: "var(--fg-tertiary)",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

interface DocCardProps {
  doc: VaultDoc;
  enrichingId: string | null;
  onView: (doc: VaultDoc) => void;
  onDelete: (doc: VaultDoc) => void;
  onRedact: (doc: VaultDoc) => void;
}

export function DocCard({ doc, enrichingId, onView, onDelete, onRedact }: DocCardProps) {
  return (
    <div key={doc.id}>
      <div className={`lex-card${doc.acp ? " lex-card--sealed" : ""}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="lex-chip"
                style={{
                  background: `${TYPE_COLORS[doc.docType] ?? "var(--fg-tertiary)"}22`,
                  color: TYPE_COLORS[doc.docType] ?? "var(--fg-tertiary)",
                  borderColor: `${TYPE_COLORS[doc.docType] ?? "var(--fg-tertiary)"}44`,
                }}
              >
                {doc.docType}
              </span>
              {doc.storagePath && (
                <span className="lex-chip lex-chip--neutral">
                  {doc.fileType?.split("/")[1]?.toUpperCase() ?? "FILE"} · {formatBytes(doc.fileSize ?? 0)}
                </span>
              )}
              {doc.acp && (
                <span className="lex-chip lex-chip--violet" title="Attorney-Client Privilege">
                  <ShieldCheck size={9} />
                  ACP
                </span>
              )}
              {doc.redacted && (
                <span className="lex-chip" style={{ background: "rgba(255,163,0,0.08)", color: "var(--verdict-amber)", borderColor: "rgba(255,163,0,0.28)" }}>
                  <Scissors size={9} />
                  Redacted copy
                </span>
              )}
              {doc.aresEnriched && (
                <span className="lex-chip" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", borderColor: "rgba(0,255,195,0.28)" }}>
                  <Zap size={9} />
                  ARES Enriched
                </span>
              )}
              {enrichingId === doc.id && (
                <span className="lex-chip" style={{ color: "var(--fg-tertiary)" }}>
                  <Loader2 size={9} className="animate-spin" />
                  Enriching…
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold truncate" style={{ color: "var(--fg-primary)" }}>{doc.title}</h4>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--fg-quaternary)" }}>
              Added {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {doc.url && (
              <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "var(--fg-tertiary)" }}>
                <ExternalLink size={14} />
              </a>
            )}
            {doc.storagePath && (
              <button onClick={() => onView(doc)} className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "var(--fg-tertiary)" }}>
                <Archive size={14} />
              </button>
            )}
            {!doc.redacted && (
              <button onClick={() => onRedact(doc)} title="Create redacted copy" className="p-1.5 rounded-md hover:bg-white/5" style={{ color: "var(--fg-tertiary)" }}>
                <Scissors size={14} />
              </button>
            )}
            <button onClick={() => onDelete(doc)} className="p-1.5 rounded-md hover:bg-white/5 text-[var(--verdict-crimson)]">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {doc.notes && (
          <p className="text-xs line-clamp-2 mt-2" style={{ color: "var(--fg-tertiary)", lineHeight: 1.5 }}>{doc.notes}</p>
        )}
        {doc.aresEnriched && doc.aresContext && (
          <div className="mt-3 pt-3 border-t border-[rgba(0,255,195,0.1)]">
            <p className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--verdict-neon)" }}>Research Context</p>
            <p className="text-[11px] leading-relaxed italic" style={{ color: "var(--fg-secondary)" }}>{doc.aresContext}</p>
          </div>
        )}
      </div>
    </div>
  );
}
