"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, RotateCcw, FileText, Loader2, X } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch, QuotaExceededError, FreeTierExhaustedError, CreditExhaustedError } from "@/lib/api";
import { withLexMemory } from "@/lib/lex-memory";
import { searchOpinions, CLOpinion } from "@/lib/courtlistener";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { LexTooltip } from "@/components/shared/LexTooltip";
import { Markdown } from "@/components/shared/Markdown";
import { ChatMessage, Message } from "@/components/research/ChatMessage";

const LOADING_LABELS = [
  "Searching case law…",
  "Grounding with CourtListener…",
  "ARES is analyzing…",
  "Composing response…",
];

export default function ResearchPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [creditErr, setCreditErr] = useState<{ remaining: number; creditCost: number } | null>(null);
  const [freeTierMsg, setFreeTierMsg] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoContent, setMemoContent] = useState<string | null>(null);
  const loadingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!matter || initialized) return;
    setInitialized(true);
    const saved = (matter.researchHistory as Message[] | undefined) ?? [];
    if (saved.length > 0) setMessages(saved);
  }, [matter?.id, matter?.researchHistory, initialized]);

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
    if (!query.trim() || loading || !matter) return;
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
      let sources: CLOpinion[] = [];
      try {
        sources = await searchOpinions(currentQuery, 5);
      } catch { /* proceed without grounding */ }

      const groundingBlock = sources.length > 0
        ? `\n\nRELEVANT CASE LAW FROM COURTLISTENER (use these as authoritative sources where applicable):\n${sources.map((s, i) =>
            `${i + 1}. ${s.caseName}${s.citation ? `, ${s.citation}` : ""} (${s.court}, ${s.dateFiled ? new Date(s.dateFiled).getFullYear() : "n.d."})\n   Snippet: ${s.snippet || "No excerpt available."}`
          ).join("\n")}`
        : "";

      const historyBlock = messages.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

      const prompt = `Previous Research context:\n${historyBlock}\n\nNew Query: ${currentQuery}${groundingBlock}`;

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "research" });
      setStreamingText("");
      const res = await lexFetch(
        { model: settings.model, max_tokens: settings.maxTokens, system: settings.systemPrompt, messages: [{ role: "user", content: prompt }] },
        undefined,
        { onChunk: chunk => setStreamingText(prev => prev + chunk) }
      );

      const data = await res.json() as { content?: Array<{ text: string }> };
      const assistantText = data.content?.[0]?.text ?? "No response received.";
      const assistantMsg: Message = { role: "assistant", content: assistantText, sources: sources.length > 0 ? sources : undefined };

      const nextHistory = [...messages, userMsg, assistantMsg];
      setMessages(nextHistory);
      updateMatter({ ...matter, researchHistory: nextHistory });
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) { setFreeTierMsg(e.message); }
      else if (e instanceof CreditExhaustedError) { setCreditErr({ remaining: e.remaining, creditCost: e.creditCost }); }
      else if (e instanceof QuotaExceededError) { setFreeTierMsg("AI quota exceeded — upgrade your plan."); }
      else { setFreeTierMsg((e as Error).message); }
    } finally {
      setStreamingText("");
      setLoading(false);
      loadingTimers.current.forEach(clearTimeout);
    }
  };

  const generateMemo = async () => {
    if (messages.length === 0 || memoLoading) return;
    setMemoLoading(true);
    setMemoContent(null);
    try {
      const res = await anthropicFetch({
        model: settings.model,
        max_tokens: 1500,
        system: "You are a professional legal researcher. Summarize the research session below into a structured internal legal memorandum.",
        messages: [{ role: "user", content: messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n") }]
      });
      const data = await res.json() as { content?: Array<{ text: string }> };
      setMemoContent(data.content?.[0]?.text ?? "Failed to generate memo.");
    } catch {
      setMemoContent("Error generating memorandum.");
    } finally {
      setMemoLoading(false);
    }
  };

  const clearHistory = () => {
    if (!matter || !window.confirm("Clear all research history for this matter?")) return;
    setMessages([]);
    updateMatter({ ...matter, researchHistory: [] });
  };

  return (
    <PanelShell icon={Search} title="Research Terminal" description="Direct AI grounding with live CourtListener case law">
      {creditErr && <UpgradeCTA reason="Monthly credits exhausted." creditsRemaining={creditErr.remaining} creditCost={creditErr.creditCost} onClose={() => setCreditErr(null)} />}

      <div className="flex flex-col h-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
              <Search size={40} className="mb-4" />
              <p className="text-sm font-medium">No research history yet</p>
              <p className="text-xs max-w-[240px] mt-1">Ask ARES a legal question to begin grounding with 9M+ opinions.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} idx={i} isCopied={copiedIdx === i} onCopy={copyMessage} isExpanded={expandedSources.has(i)} onToggleSources={toggleSources} />
          ))}
          {streamingText && (
            <div className="flex flex-col items-start gap-2">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-[var(--bg-raised)] text-[var(--fg-secondary)] border border-[rgba(0,255,195,0.14)]">
                <Markdown text={streamingText} />
                <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse bg-[var(--verdict-neon)]" />
              </div>
            </div>
          )}
        </div>

        {/* Input & Actions */}
        <div className="pt-4 border-t border-[rgba(224,224,224,0.08)] bg-[var(--midnight-deep)]">
          {freeTierMsg && (
            <div className="mb-3 p-3 rounded-lg bg-[var(--verdict-crimson)]/10 border border-[var(--verdict-crimson)]/20 text-[var(--verdict-crimson)] text-xs flex items-center justify-between">
              <span>{freeTierMsg}</span>
              <button onClick={() => setFreeTierMsg(null)}><X size={14} /></button>
            </div>
          )}

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <LexTooltip content="Generate structured internal memo from this session">
                <button onClick={generateMemo} disabled={messages.length === 0 || memoLoading} className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 disabled:opacity-20 transition-all">
                  {memoLoading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                  Generate Memo
                </button>
              </LexTooltip>
              <button onClick={clearHistory} disabled={messages.length === 0} className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 disabled:opacity-20 transition-all ml-4">
                <RotateCcw size={11} /> Clear
              </button>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-30">Grounded via CourtListener</div>
          </div>

          <div className="relative group">
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask ARES a research question..."
              className="w-full bg-[var(--bg-raised)] border border-[rgba(224,224,224,0.12)] rounded-xl px-4 py-3.5 pr-14 text-sm focus:outline-none focus:border-[var(--verdict-neon)]/40 transition-all min-h-[56px] max-h-32 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!query.trim() || loading}
              className="absolute right-3 bottom-3 p-2 rounded-lg bg-[var(--verdict-neon)] text-[var(--midnight-deep)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 mt-3 px-1">
              <span className="text-[10px] font-mono text-[var(--verdict-neon)] animate-pulse">{LOADING_LABELS[loadingPhase]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Memo Modal */}
      {memoContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="max-w-4xl w-full max-h-[80vh] bg-[var(--midnight-deep)] rounded-2xl border border-[rgba(224,224,224,0.1)] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Research Memorandum</h3>
              <div className="flex items-center gap-2">
                <ExportButton content={memoContent} filename={`memo-${matter?.title}`} format="markdown" label="Export" />
                <button onClick={() => setMemoContent(null)} className="p-1 rounded hover:bg-white/5 text-[var(--fg-tertiary)]"><X size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 prose prose-invert prose-sm max-w-none">
              <Markdown text={memoContent} />
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
