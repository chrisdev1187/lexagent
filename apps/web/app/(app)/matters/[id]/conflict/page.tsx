"use client";

import { useState, useEffect } from "react";
import { Scale, AlertTriangle, CheckCircle, Zap, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { QuotaExceededError, FreeTierExhaustedError } from "@/lib/api";
import { withLexMemory } from "@/lib/lex-memory";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { Markdown } from "@/components/shared/Markdown";

interface ConflictMatch {
  matterId: string;
  matterTitle: string;
  client: string;
  caseType: string;
  reason: string;
}

function normalize(s: string) {
  return (s ?? "").toLowerCase().trim();
}

export default function ConflictPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, matters, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [conflicts, setConflicts] = useState<ConflictMatch[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [freeTierMsg, setFreeTierMsg] = useState<string | null>(null);

  // Automated conflict check on load
  useEffect(() => {
    if (!matter) return;
    const found: ConflictMatch[] = [];
    const otherMatters = matters.filter(m => m.id !== matter.id);
    const myClient = normalize(matter.client);

    for (const other of otherMatters) {
      const reasons: string[] = [];
      if (myClient && normalize(other.client) === myClient) {
        reasons.push("Same client name");
      }
      // Check if client name appears in opposing party of title
      if (myClient && normalize(other.title).includes(myClient)) {
        reasons.push("Client name appears in matter title");
      }
      if (matter.caseType && normalize(other.caseType) === normalize(matter.caseType) && myClient && normalize(other.client) !== myClient) {
        // Same case type, different client — potential positional conflict
        if (myClient && normalize(other.title).includes(myClient)) {
          reasons.push("Same case type, client appears in opposing matter");
        }
      }
      if (reasons.length) {
        found.push({
          matterId: other.id,
          matterTitle: other.title,
          client: other.client,
          caseType: other.caseType,
          reason: reasons.join("; "),
        });
      }
    }
    setConflicts(found);
  }, [matter, matters]);

  const runAiCheck = async () => {
    if (!matter) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const otherMatters = matters.filter(m => m.id !== matter.id);
      const userContent = `Perform a conflict of interest analysis for a law firm:\n\nNew Matter:\n- Client: ${matter.client}\n- Case Type: ${matter.caseType}\n- Title: ${matter.title}\n- Facts: ${matter.facts}\n\nExisting Matters:\n${otherMatters.map(m => `- ${m.title} (Client: ${m.client}, Type: ${m.caseType})`).join("\n")}\n\nIdentify any potential conflicts of interest and explain the applicable professional responsibility rules (ABA Model Rules 1.7, 1.9, 1.10).`;

      const lexFetch = withLexMemory(matter, updateMatter, { tab: "conflict" });
      setStreamingText("");
      const res = await lexFetch(
        { model: settings.model, max_tokens: settings.maxTokens, system: settings.systemPrompt, messages: [{ role: "user", content: userContent }] },
        undefined,
        { onChunk: chunk => setStreamingText(prev => prev + chunk) }
      );
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text ?? "No response.";
      setAiAnalysis(text);
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) { setFreeTierMsg(e.message); }
      else if (e instanceof QuotaExceededError) { setAiError("AI quota exceeded — upgrade your plan."); }
      else { setAiError((e as Error).message); }
    } finally {
      setStreamingText("");
      setAiLoading(false);
    }
  };

  return (
    <>
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
      icon={Scale}
      title="Conflict Check"
      description="Cross-matter conflict of interest analysis — ABA Model Rules 1.7, 1.9, 1.10"
    >
      {/* Automated check results */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>
            Automated Conflict Scan
          </p>
          {conflicts.length === 0 ? (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,255,195,0.08)", color: "var(--verdict-neon)", border: "0.5px solid rgba(0,255,195,0.28)" }}
            >
              <CheckCircle size={11} /> No conflicts detected
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,51,85,0.08)", color: "var(--verdict-crimson)", border: "0.5px solid rgba(255,51,85,0.3)" }}
            >
              <AlertTriangle size={11} /> {conflicts.length} potential conflict{conflicts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {conflicts.length > 0 ? (
          <div className="space-y-2">
            {conflicts.map(c => (
              <div
                key={c.matterId}
                className="rounded px-4 py-3"
                style={{
                  background: "rgba(17,17,20,0.7)",
                  border: "0.5px solid rgba(255,51,85,0.28)",
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} style={{ color: "var(--verdict-crimson)", flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{c.matterTitle}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
                      Client: {c.client} · {c.caseType}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--verdict-crimson)" }}>{c.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded px-4 py-4 flex items-center gap-3"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
          >
            <CheckCircle size={16} style={{ color: "var(--verdict-neon)", flexShrink: 0 }} />
            <div>
              <p className="text-sm" style={{ color: "var(--fg-primary)" }}>
                No matching client names or obvious conflicts found across {matters.length - 1} other matter{matters.length !== 2 ? "s" : ""}.
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>
                Run the AI check below for a thorough professional responsibility analysis.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI-assisted check */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>AI Professional Responsibility Analysis</p>
          <button
            onClick={runAiCheck}
            disabled={aiLoading}
            className="lex-btn lex-btn--primary"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {aiLoading ? "Analyzing…" : "Run AI Check"}
          </button>
        </div>

        {aiError && (
          <div
            className="rounded-lg px-4 py-3 mb-3 text-xs"
            style={{ background: "rgba(255,51,85,0.08)", border: "0.5px solid rgba(255,51,85,0.3)", color: "var(--verdict-crimson)" }}
          >
            {aiError}
          </div>
        )}

        {aiLoading && !streamingText && (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--verdict-neon)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Analyzing all matters for conflicts…</span>
          </div>
        )}

        {(aiAnalysis || streamingText) && (
          <div
            className="rounded p-5"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
          >
            <Markdown text={streamingText || aiAnalysis} />
            {aiLoading && streamingText && (
              <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "var(--verdict-neon)", borderRadius: "1px" }} />
            )}
          </div>
        )}

        {!aiAnalysis && !aiLoading && (
          <div
            className="rounded px-4 py-6 text-center"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
          >
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
              Click &quot;Run AI Check&quot; for a detailed analysis applying ABA Model Rules 1.7 (current clients), 1.9 (former clients), and 1.10 (imputed conflicts).
            </p>
          </div>
        )}
      </div>
    </PanelShell>
    </>
  );
}
