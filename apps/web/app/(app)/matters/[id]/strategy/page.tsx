"use client";

import { useState } from "react";
import { Target, RefreshCw, Zap, AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch } from "@/lib/api";
import { PanelShell } from "@/components/panels/PanelShell";
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

  const strategy = matter?.strategy as string | undefined;

  const generate = async () => {
    if (!matter) return;
    setLoading(true);
    setError(null);
    try {
      const userContent = `Analyze this legal matter and produce a comprehensive case strategy report:

Matter: ${matter.title}
Case Type: ${matter.caseType}
Jurisdiction: ${matter.jurisdiction}
Court: ${matter.court}
Judge: ${matter.judgeName}
Facts: ${matter.facts}

Provide:
1. CASE ASSESSMENT — strengths and weaknesses (2-3 sentences each)
2. KEY LEGAL ARGUMENTS — top 3 arguments with supporting precedent citations
3. OPPOSING ARGUMENTS — anticipated defense/prosecution arguments and rebuttals
4. RECOMMENDED STRATEGY — specific tactical recommendations
5. RISK FACTORS — what could go wrong and mitigation steps

Format with clear headers. Use Bluebook citation format.`;

      const res = await anthropicFetch({
        model: settings.model,
        max_tokens: settings.maxTokens,
        system: settings.systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });
      const data = await res.json() as { content?: Array<{ type: string; text: string }>; error?: { message: string } };
      const text = data.content?.[0]?.text ?? data.error?.message ?? "No response.";
      await updateMatter({ ...matter, strategy: text });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelShell
      icon={Target}
      title="Case Strategy"
      description="AI-generated comprehensive case strategy and analysis"
      actions={
        strategy ? (
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: "var(--panel2)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              cursor: loading ? "default" : "pointer",
            }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Regenerate
          </button>
        ) : undefined
      }
    >
      {editingUsers.length > 0 && (
        <div
          className="rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2 text-xs"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "var(--gold)" }}
        >
          <AlertTriangle size={12} />
          {editingUsers.map(u => u.email).join(", ")} {editingUsers.length === 1 ? "is" : "are"} also viewing this strategy — changes may conflict
        </div>
      )}

      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-xs"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--crimson)" }}
        >
          {error}
        </div>
      )}

      {!strategy && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
          >
            <Target size={28} style={{ color: "var(--emerald)" }} />
          </div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>No strategy generated yet</p>
          <p className="text-xs mb-6 max-w-sm" style={{ color: "var(--text-muted)" }}>
            Generate a comprehensive AI-powered case strategy including strengths, weaknesses, arguments, and tactical recommendations.
          </p>
          <button
            onClick={generate}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
              color: "#0A0F0D",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Zap size={15} />
            Generate Strategy
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
                style={{ background: "var(--emerald)", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Generating strategy…</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>This may take 15-30 seconds</p>
        </div>
      )}

      {strategy && !loading && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <pre
            className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
            style={{ color: "var(--text)" }}
          >
            {strategy}
          </pre>
        </div>
      )}
    </PanelShell>
  );
}
