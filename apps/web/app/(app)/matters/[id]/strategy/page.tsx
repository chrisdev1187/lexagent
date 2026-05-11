"use client";

import { useState } from "react";
import { Target, RefreshCw, Zap, Copy, Check, Loader2 } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { QuotaExceededError, FreeTierExhaustedError, CreditExhaustedError } from "@/lib/api";
import { withLexMemory } from "@/lib/lex-memory";
import { postureDetect, aresDebate } from "@/lib/ares";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { Markdown } from "@/components/shared/Markdown";
import { usePresence } from "@/hooks/usePresence";
import { AvatarStack } from "@/components/shared/AvatarStack";

export default function StrategyPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);
  const present = usePresence(id, "strategy");
  const editingUsers = present.filter(u => u.tab === "strategy");

  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [creditErr, setCreditErr] = useState<{ remaining: number; creditCost: number } | null>(null);
  const [freeTierMsg, setFreeTierMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const strategy = matter?.strategy as string | undefined;

  const copyStrategy = async () => {
    if (!strategy) return;
    await navigator.clipboard.writeText(strategy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generate = async () => {
    if (!matter) return;
    setLoading(true);
    setError(null);
    try {
      const userContent = `Analyze this legal matter and produce a comprehensive case strategy report:

Matter: ${matter.title}
Case Type: ${matter.caseType ?? "N/A"}
Jurisdiction: ${matter.jurisdiction ?? "N/A"}
Facts: ${matter.facts ?? "N/A"}`;

      let debatePrefix = "";
      const postureOut = await postureDetect({ matter_facts: matter.facts ?? "" }).catch(() => null);
      if (postureOut && (postureOut.posture === "msj" || postureOut.posture === "appeal") && postureOut.confidence >= 0.5) {
        const debateOut = await aresDebate({
          question: `Strategy for: ${matter.title}`,
          facts: matter.facts ?? "",
          posture: postureOut.posture,
          jurisdiction: matter.jurisdiction ?? undefined,
          matterId: matter.id,
        }).catch(() => null);
        if (debateOut && !debateOut.skipped && !debateOut.partial) {
          debatePrefix = `## ADVERSARIAL DEBATE SYNTHESIS (${postureOut.posture.toUpperCase()})\nPredicted outcome: ${debateOut.predicted_outcome}\n${debateOut.reasoning}\n`;
        }
      }

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "strategy" });
      setStreamingText("");
      const res = await lexFetch(
        { model: settings.model, max_tokens: settings.maxTokens, system: settings.systemPrompt, messages: [{ role: "user", content: debatePrefix + userContent }] },
        undefined,
        { onChunk: chunk => setStreamingText(prev => prev + chunk) }
      );
      const data = await res.json() as { content?: Array<{ text: string }> };
      const text = data.content?.[0]?.text;
      if (text) await updateMatter({ ...matter, strategy: text });
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) setFreeTierMsg(e.message);
      else if (e instanceof CreditExhaustedError) setCreditErr({ remaining: e.remaining, creditCost: e.creditCost });
      else if (e instanceof QuotaExceededError) setShowUpgrade(true);
      else setError((e as Error).message);
    } finally {
      setStreamingText("");
      setLoading(false);
    }
  };

  return (
    <>
      {(showUpgrade || creditErr) && (
        <UpgradeCTA
          reason={creditErr ? "Monthly credits exhausted." : "AI quota exceeded."}
          creditsRemaining={creditErr?.remaining}
          creditCost={creditErr?.creditCost}
          onClose={() => { setShowUpgrade(false); setCreditErr(null); }}
        />
      )}
      <PanelShell
        icon={Target}
        title="Case Strategy"
        description="AI-driven matter analysis and tactical roadmap"
        actions={
          <div className="flex items-center gap-4">
            <AvatarStack users={editingUsers} />
            {strategy && (
              <div className="flex items-center gap-2">
                <ExportButton content={strategy} filename={`strategy-${matter?.title}`} format="markdown" label="Export" />
                <button onClick={copyStrategy} className="lex-btn lex-btn--secondary">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={generate} disabled={loading} className="lex-btn lex-btn--secondary">
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Regenerate
                </button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {freeTierMsg && (
            <div className="rounded px-4 py-3 bg-[var(--verdict-crimson)]/10 border border-[var(--verdict-crimson)]/20 text-[var(--verdict-crimson)] text-xs">
              {freeTierMsg}
            </div>
          )}

          {!strategy && !loading && (
            <div className="rounded-xl p-12 text-center bg-[rgba(17,17,20,0.7)] border border-dashed border-white/10">
              <Zap size={32} className="mx-auto mb-4 text-[var(--verdict-neon)] opacity-40" />
              <h3 className="text-sm font-semibold mb-2">No Strategy Generated</h3>
              <p className="text-xs text-[var(--fg-tertiary)] mb-6 max-w-sm mx-auto">Analyze your matter facts and documents to produce a comprehensive legal strategy.</p>
              <button onClick={generate} className="lex-btn lex-btn--primary px-8">Generate Strategy</button>
            </div>
          )}

          {(loading || streamingText) && (
            <div className="rounded-xl p-6 bg-[rgba(17,17,20,0.7)] border border-[rgba(0,255,195,0.14)]">
              <div className="flex items-center gap-2 mb-4">
                <Loader2 size={14} className="animate-spin text-[var(--verdict-neon)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)]">ARES is analyzing...</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <Markdown text={streamingText || "Processing matter context..."} />
                {loading && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse bg-[var(--verdict-neon)]" />}
              </div>
            </div>
          )}

          {strategy && !loading && (
            <div className="rounded-xl p-8 bg-[rgba(17,17,20,0.7)] border border-[rgba(224,224,224,0.08)] prose prose-invert prose-sm max-w-none">
              <Markdown text={strategy} />
            </div>
          )}

          {error && <p className="text-xs text-[var(--verdict-crimson)] font-mono">{error}</p>}
        </div>
      </PanelShell>
    </>
  );
}
