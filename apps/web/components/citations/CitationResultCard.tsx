"use client";

import { CheckCircle, XCircle, ExternalLink, Save, Loader2 } from "lucide-react";
import { CLLookupResult } from "@/lib/courtlistener";

export interface VerifiedEntry extends CLLookupResult {
  uid: string;
  checkedAt: number;
  savedToMatter: boolean;
  bluebook?: string;
}

interface CitationResultCardProps {
  result: VerifiedEntry;
  onSave: (uid: string) => void;
  isSaving: boolean;
}

export function CitationResultCard({ result, onSave, isSaving }: CitationResultCardProps) {
  return (
    <div className="rounded-xl border border-[rgba(224,224,224,0.08)] bg-[rgba(17,17,20,0.7)] overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {result.verified ? (
              <CheckCircle size={14} className="text-[var(--verdict-neon)]" />
            ) : (
              <XCircle size={14} className="text-[var(--verdict-crimson)]" />
            )}
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">
              {result.verified ? "Verified Authority" : "Verification Failed"}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-[var(--fg-primary)] line-clamp-1">
            {result.caseName || result.input}
          </h4>

          {result.verified && (
            <p className="text-xs font-mono text-[var(--verdict-neon)] mt-1">
              {result.reporter}
            </p>
          )}

          {!result.verified && (
            <p className="text-xs text-[var(--fg-tertiary)] mt-1">
              Could not find an exact match for &ldquo;{result.input}&rdquo; in 18M+ records.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {result.verified && result.absoluteUrl && (
            <a
              href={result.absoluteUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-white/5 text-[var(--fg-tertiary)] transition-colors"
              title="View source"
            >
              <ExternalLink size={15} />
            </a>
          )}

          {result.verified && (
            <button
              onClick={() => onSave(result.uid)}
              disabled={result.savedToMatter || isSaving}
              className={`p-2 rounded-lg transition-all ${result.savedToMatter ? "text-[var(--verdict-neon)] bg-[var(--verdict-neon)]/5" : "hover:bg-white/5 text-[var(--fg-tertiary)]"}`}
              title={result.savedToMatter ? "Saved to matter" : "Save to matter"}
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            </button>
          )}
        </div>
      </div>

      {result.verified && result.dateFiled && (
        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5">
          <p className="text-[9px] font-mono uppercase tracking-widest opacity-30">
            Filed: {new Date(result.dateFiled).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}
