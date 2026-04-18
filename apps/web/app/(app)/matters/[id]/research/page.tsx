"use client";

import { useState, useRef } from "react";
import { Search, Send, RotateCcw, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch } from "@/lib/api";
import { PanelShell } from "@/components/panels/PanelShell";
import { LexTooltip } from "@/components/shared/LexTooltip";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: { text: string; valid?: boolean }[];
}

export default function ResearchPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const loadingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasKey = !!settings.anthropicKey;

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery("");
    setLoading(true);
    setLoadingPhase(0);
    loadingTimers.current = [
      setTimeout(() => setLoadingPhase(1), 5000),
      setTimeout(() => setLoadingPhase(2), 13000),
    ];

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const userContent = matter
        ? `Matter: ${matter.title}${matter.facts ? `\nFacts: ${matter.facts}` : ""}\n\nQuery: ${query}`
        : query;
      const res = await anthropicFetch({
        model: settings.model,
        max_tokens: settings.maxTokens,
        system: settings.systemPrompt,
        messages: [...history, { role: "user", content: userContent }],
      });
      const data = await res.json() as { content?: Array<{type:string; text:string}>; error?: {message:string} };
      const text = data.content?.[0]?.text ?? data.error?.message ?? "No response.";
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error: ${(e as Error).message}`,
      }]);
    } finally {
      loadingTimers.current.forEach(clearTimeout);
      loadingTimers.current = [];
      setLoadingPhase(0);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <PanelShell
      icon={Search}
      title="Legal Research"
      description="AI-powered case law research using CourtListener (9M+ opinions)"
    >
      {!hasKey && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-xs flex items-center gap-2"
          style={{
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "var(--gold)",
          }}
        >
          <AlertTriangle size={13} />
          Add your Anthropic API key in <a href="/admin" className="underline ml-1">Administration → API Keys</a>
        </div>
      )}

      {/* Chat messages */}
      <div className="space-y-4 mb-4 min-h-[200px]">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
            >
              <Search size={20} style={{ color: "var(--emerald)" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Ask ARES anything</p>
            <p className="text-xs max-w-sm" style={{ color: "var(--text-muted)" }}>
              Search case law, statutes, regulations, or ask for legal analysis. All citations will be Bluebook-formatted.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-2xl rounded-xl px-4 py-3 text-sm"
              style={{
                background: msg.role === "user" ? "var(--emerald-faint)" : "var(--surface)",
                border: `1px solid ${msg.role === "user" ? "var(--emerald-dim)" : "var(--border)"}`,
                color: "var(--text)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      background: "var(--emerald)",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {loadingPhase === 0 && "ARES is researching…"}
                {loadingPhase === 1 && "Server warming up — Render free tier takes ~8-12 s on first request…"}
                {loadingPhase === 2 && "Almost there…"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border-hi)" }}
      >
        <textarea
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={matter ? `Research for ${matter.title}…` : "Ask a legal question…"}
          rows={3}
          className="w-full px-4 py-3 text-sm resize-none lex-focus"
          style={{
            background: "transparent",
            color: "var(--text)",
            outline: "none",
            border: "none",
          }}
        />
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <LexTooltip content="Clear conversation">
              <button
                onClick={() => setMessages([])}
                className="cursor-pointer p-1.5 rounded-md transition-all duration-150"
                style={{ color: "var(--text-muted)" }}
              >
                <RotateCcw size={13} />
              </button>
            </LexTooltip>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Enter to send · Shift+Enter for newline
            </span>
          </div>
          <LexTooltip content="Send query (Enter)">
            <button
              onClick={handleSend}
              disabled={!query.trim() || loading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-150"
              style={{
                background: query.trim() && !loading
                  ? "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)"
                  : "var(--panel2)",
                color: query.trim() && !loading ? "#0A0F0D" : "var(--text-muted)",
                border: "none",
              }}
            >
              <Send size={12} />
              Research
            </button>
          </LexTooltip>
        </div>
      </div>
    </PanelShell>
  );
}
