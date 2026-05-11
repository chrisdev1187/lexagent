"use client";

import { Copy, Check, BookOpen } from "lucide-react";
import { Markdown } from "@/components/shared/Markdown";
import { CLOpinion } from "@/lib/courtlistener";

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: CLOpinion[];
}

interface ChatMessageProps {
  message: Message;
  idx: number;
  isCopied: boolean;
  onCopy: (content: string, idx: number) => void;
  isExpanded: boolean;
  onToggleSources: (idx: number) => void;
}

export function ChatMessage({ message, idx, isCopied, onCopy, isExpanded, onToggleSources }: ChatMessageProps) {
  return (
    <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} gap-2`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          message.role === "user"
            ? "bg-[var(--verdict-neon)] text-[var(--midnight-deep)] font-medium"
            : "bg-[var(--bg-raised)] text-[var(--fg-secondary)] border border-[rgba(224,224,224,0.09)]"
        }`}
      >
        <Markdown text={message.content} />
      </div>

      {message.role === "assistant" && (
        <div className="flex items-center gap-3 px-1">
          <button
            onClick={() => onCopy(message.content, idx)}
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            {isCopied ? <Check size={11} className="text-[var(--verdict-neon)]" /> : <Copy size={11} />}
            {isCopied ? "Copied" : "Copy"}
          </button>

          {message.sources && message.sources.length > 0 && (
            <button
              onClick={() => onToggleSources(idx)}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              <BookOpen size={11} />
              {isExpanded ? "Hide Sources" : `${message.sources.length} Sources`}
            </button>
          )}
        </div>
      )}

      {message.role === "assistant" && message.sources && isExpanded && (
        <div className="w-full mt-2 space-y-2 fade-in">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-quaternary)] px-1">Grounding Sources</p>
          {message.sources.map((s, i) => (
            <div key={i} className="rounded-lg p-3 bg-white/[0.02] border border-white/[0.05]">
              <p className="text-xs font-semibold text-[var(--fg-primary)]">{s.caseName}</p>
              <p className="text-[10px] font-mono text-[var(--verdict-neon)] mt-0.5">{s.citation} · {s.court}</p>
              {s.snippet && (
                <p className="text-[11px] text-[var(--fg-tertiary)] mt-1.5 line-clamp-2 italic">
                  &ldquo;{s.snippet.replace(/<[^>]*>?/gm, "")}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
