"use client";

import { useState, useRef } from "react";
import { Search, Send, RotateCcw, Copy, Check, AlertTriangle, BookOpen } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch, QuotaExceededError } from "@/lib/api";
import { searchOpinions, CLOpinion } from "@/lib/courtlistener";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { Markdown } from "@/components/shared/Markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: CLOpinion[];
}

const LOADING_LABELS = [
  "Searching case law…",
  "Grounding with CourtListener…",
  "ARES is analyzing…",
  "Composing response…",
];

export default function ResearchPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const loadingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasKey = !!settings.anthropicKey;

  const copyMessage = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggleSources = (idx: number) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    const currentQuery = query;
    setQuery("");
    setLoading(true);
    setLoadingPhase(0);

    loadingTimers.current = LOADING_LABELS.map((_, i) =>
      setTimeout(() => setLoadingPhase(i), i * 4000)
    );

    try {
      // Step 1: search CourtListener for grounding sources (fast)
      let sources: CLOpinion[] = [];
      try {
        sources = await searchOpinions(currentQuery, 5);
      } catch {
        // non-fatal — proceed without grounding
      }

      // Step 2: build grounded system context
      const groundingBlock = sources.length > 0
        ? `\n\nRELEVANT CASE LAW FROM COURTLISTENER (use these as authoritative sources where applicable):\n${sources.map((s, i) =>
            `${i + 1}. ${s.caseName}${s.citation ? `, ${s.citation}` : ""} (${s.court}, ${s.dateFiled ? new Date(s.dateFiled).getFullYear() : "n.d."})\n   Snippet: ${s.snippet || "No excerpt available."}`
          ).join("\n")}`
        : "";

      const systemWithGrounding = settings.systemPrompt + groundingBlock;

      // Step 3: call AI with grounded context
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const userContent = matter
        ? `Matter: ${matter.title}${matter.facts ? `\nFacts: ${matter.facts}` : ""}${matter.jurisdiction ? `\nJurisdiction: ${matter.jurisdiction}` : ""}\n\nQuery: ${currentQuery}`
        : currentQuery;

      const res = await anthropicFetch({
        model: settings.model,
        max_tokens: settings.maxTokens,
        system: systemWithGrounding,
        messages: [...history, { role: "user", content: userContent }],
      });

      const data = await res.json() as { content?: Array<{ type: string; text: string }>; error?: { message: string } };
      const text = data.content?.[0]?.text ?? data.error?.message ?? "No response.";
      setMessages(prev => [...prev, { role: "assistant", content: text, sources }]);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setShowUpgrade(true);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
      }
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
    <>
      {showUpgrade && (
        <UpgradeCTA
          reason="You've used your monthly AI quota. Upgrade to continue researching."
          onClose={() => setShowUpgrade(false)}
        />
      )}
      <PanelShell
        icon={Search}
        title="Legal Research"
        description="AI-powered research grounded in CourtListener (9M+ opinions)"
      >
        {!hasKey && (
          <div
            className="rounded px-4 py-3 mb-4 text-xs flex items-center gap-2"
            style={{
              background: "rgba(255,184,0,0.06)",
              border: "0.5px solid rgba(255,184,0,0.28)",
              color: "var(--verdict-amber)",
            }}
          >
            <AlertTriangle size={13} />
            Add your Anthropic API key in <a href="/admin" className="underline ml-1">Administration → API Keys</a>
          </div>
        )}

        {/* Chat messages */}
        <div className="space-y-5 mb-4 min-h-[200px]">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 rounded flex items-center justify-center mb-3"
                style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}
              >
                <Search size={20} style={{ color: "var(--verdict-neon)" }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--fg-primary)" }}>Ask ARES anything</p>
              <p className="text-xs max-w-sm" style={{ color: "var(--fg-tertiary)" }}>
                Research grounded in live CourtListener case law. All citations Bluebook-formatted.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div
                  className="max-w-2xl rounded px-4 py-3 text-sm"
                  style={{
                    background: "rgba(0,255,195,0.06)",
                    border: "0.5px solid rgba(0,255,195,0.22)",
                    color: "var(--fg-primary)",
                    lineHeight: 1.7,
                  }}
                >
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-3xl w-full">
                  {/* Sources panel */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mb-2">
                      <button
                        onClick={() => toggleSources(i)}
                        className="flex items-center gap-1.5 text-xs font-mono tracking-wide mb-1"
                        style={{ color: "var(--verdict-neon)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        <BookOpen size={11} />
                        {expandedSources.has(i) ? "Hide" : "Show"} {msg.sources.length} source{msg.sources.length !== 1 ? "s" : ""}
                      </button>
                      {expandedSources.has(i) && (
                        <div className="space-y-1.5 mb-3">
                          {msg.sources.map((s, si) => (
                            <div
                              key={si}
                              className="rounded px-3 py-2 text-xs"
                              style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid rgba(0,255,195,0.14)" }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="font-semibold" style={{ color: "var(--fg-primary)" }}>{s.caseName}</span>
                                  {s.citation && (
                                    <span className="ml-1.5 font-mono" style={{ color: "var(--verdict-neon)" }}>{s.citation}</span>
                                  )}
                                  <span className="ml-1.5" style={{ color: "var(--fg-tertiary)" }}>
                                    {s.court}{s.dateFiled ? ` · ${new Date(s.dateFiled).getFullYear()}` : ""}
                                  </span>
                                </div>
                                {s.absoluteUrl && (
                                  <a
                                    href={s.absoluteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 underline"
                                    style={{ color: "var(--verdict-neon)" }}
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                              {s.snippet && (
                                <p className="mt-1 line-clamp-2" style={{ color: "var(--fg-tertiary)" }}>{s.snippet}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI response */}
                  <div
                    className="rounded px-4 py-3"
                    style={{
                      background: "rgba(17,17,20,0.8)",
                      border: "0.5px solid rgba(224,224,224,0.09)",
                    }}
                  >
                    <Markdown text={msg.content} />
                    <div className="flex justify-end mt-2 pt-2" style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)" }}>
                      <button
                        onClick={() => copyMessage(msg.content, i)}
                        className="flex items-center gap-1 text-xs"
                        style={{ color: copiedIdx === i ? "var(--verdict-neon)" : "var(--fg-quaternary)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
                        {copiedIdx === i ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded px-4 py-3 flex items-center gap-2"
                style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(224,224,224,0.09)" }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "var(--verdict-neon)", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
                  {LOADING_LABELS[loadingPhase]}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="rounded overflow-hidden"
          style={{ background: "rgba(17,17,20,0.8)", border: "0.5px solid rgba(0,255,195,0.14)" }}
        >
          <textarea
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={matter ? `Research for ${matter.title}…` : "Ask a legal question…"}
            rows={3}
            className="w-full px-4 py-3 text-sm resize-none lex-focus"
            style={{ background: "transparent", color: "var(--fg-primary)", outline: "none", border: "none" }}
          />
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}
          >
            <div className="flex items-center gap-2">
              <LexTooltip content="Clear conversation">
                <button
                  onClick={() => setMessages([])}
                  className="cursor-pointer p-1.5 rounded-md transition-all duration-150"
                  style={{ color: "var(--fg-tertiary)", background: "none", border: "none" }}
                >
                  <RotateCcw size={13} />
                </button>
              </LexTooltip>
              <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
                Enter to send · Shift+Enter for newline
              </span>
            </div>
            <LexTooltip content="Send query (Enter)">
              <button
                onClick={handleSend}
                disabled={!query.trim() || loading}
                className="lex-btn lex-btn--primary"
              >
                <Send size={12} />
                Research
              </button>
            </LexTooltip>
          </div>
        </div>
      </PanelShell>
    </>
  );
}
