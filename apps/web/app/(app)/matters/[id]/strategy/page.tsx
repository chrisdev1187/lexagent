"use client";

import { useState } from "react";
import { Target, RefreshCw, Zap, AlertTriangle, Copy, Check } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch, QuotaExceededError, FreeTierExhaustedError } from "@/lib/api";
import { withLexMemory } from "@/lib/lex-memory";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { Markdown } from "@/components/shared/Markdown";
import { usePresence } from "@/hooks/usePresence";

export default function StrategyPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);
  const present = usePresence(id, "strategy");
  const editingUsers = present.filter(u => u.tab === "strategy");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
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
Court: ${matter.court ?? "N/A"}
Judge: ${matter.judgeName ?? "Unknown"}
Facts: ${matter.facts ?? "N/A"}

Provide:
## CASE ASSESSMENT
Strengths and weaknesses (2-3 sentences each)

## KEY LEGAL ARGUMENTS
Top 3-5 arguments with supporting Bluebook citations. Lead with the strongest.

## OPPOSING ARGUMENTS
Anticipated counterarguments and specific rebuttals.

## RECOMMENDED STRATEGY
Concrete tactical recommendations with priority order.

## RISK FACTORS
What could go wrong and specific mitigation steps.

## BOTTOM LINE
Practical 2-3 sentence summary of the recommended approach.

Use Bluebook citation format. Flag any circuit splits.`;

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "strategy" });
      const res = await lexFetch({
        model: settings.model,
        max_tokens: settings.maxTokens,
        system: settings.systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text;
      if (text) {
        await updateMatter({ ...matter, strategy: text });
      } else {
        setError("No response from AI. Check API keys and try again.");
      }
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) { setFreeTierMsg(e.message); }
      else if (e instanceof QuotaExceededError) { setShowUpgrade(true); }
      else { setError((e as Error).message); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showUpgrade && (
        <UpgradeCTA
          reason="You've used your monthly AI quota. Upgrade to continue generating strategies."
          onClose={() => setShowUpgrade(false)}
        />
      )}
      {freeTierMsg && (
        <div className="rounded px-4 py-3 mb-4 flex items-start justify-between gap-3" style={{ background: "rgba(0,255,195,0.05)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: "var(--verdict-neon)" }}>Free plan limit reached</p>
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>{freeTierMsg}</p>
          </div>
          <a href="/settings/billing" className="lex-btn lex-btn--primary text-xs flex-shrink-0">Upgrade</a>
        </div>
      )}
      <PanelShell
        icon={Target}
        title="Case strategy"
        description="AI-generated comprehensive case strategy and analysis"
        actions={
          strategy ? (
            <div className="flex items-center gap-2">
              <button
                onClick={copyStrategy}
                className="lex-btn lex-btn--secondary"
                style={copied ? { color: "var(--verdict-neon)" } : {}}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="lex-btn lex-btn--secondary"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Regenerate
              </button>
            </div>
          ) : undefined
        }
      >
        {editingUsers.length > 0 && (
          <div
            className="rounded px-4 py-2.5 mb-4 flex items-center gap-2 text-xs"
            style={{ background: "rgba(255,184,0,0.06)", border: "0.5px solid rgba(255,184,0,0.28)", color: "var(--verdict-amber)" }}
          >
            <AlertTriangle size={12} />
            {editingUsers.map(u => u.email).join(", ")} {editingUsers.length === 1 ? "is" : "are"} also viewing this strategy — changes may conflict
          </div>
        )}

        {error && (
          <div
            className="rounded px-4 py-3 mb-4 text-xs"
            style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}
          >
            {error}
          </div>
        )}

        {!strategy && !loading && (
          <div className="lex-empty">
            <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
              <Target size={28} style={{ color: "var(--verdict-neon)" }} />
            </div>
            <p className="lex-empty__label">No strategy generated yet</p>
            <p className="lex-empty__body">
              Generate a comprehensive AI-powered case strategy including strengths, weaknesses, arguments, and tactical recommendations.
            </p>
            <button onClick={generate} className="lex-btn lex-btn--primary mt-4">
              <Zap size={15} />
              Generate strategy
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex gap-1.5 mb-4">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--verdict-neon)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>Generating strategy…</p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-tertiary)" }}>This may take 15-30 seconds</p>
          </div>
        )}

        {strategy && !loading && (
          <div className="lex-card overflow-auto" style={{ maxHeight: "720px" }}>
            <Markdown text={strategy} />
          </div>
        )}
      </PanelShell>
    </>
  );
}
