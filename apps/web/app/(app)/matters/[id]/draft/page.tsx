"use client";

import { useState, useEffect } from "react";
import { FileEdit, Zap, Copy, Check, Loader2, Download, BookOpen, ChevronDown, ChevronUp, Bookmark, Trash2, Plus } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { buildLetterheadHtml } from "@/components/shared/Letterhead";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { anthropicFetch, QuotaExceededError, FreeTierExhaustedError, CreditExhaustedError } from "@/lib/api";
import { DOC_TEMPLATES, DRAFT_DOC_TYPES as DOC_TYPES } from "@/lib/settings";
import { withLexMemory } from "@/lib/lex-memory";
import { UpgradeCTA } from "@/components/shared/UpgradeCTA";
import { PanelShell } from "@/components/panels/PanelShell";
import { Markdown } from "@/components/shared/Markdown";

interface DraftVersion {
  content: string;
  docType: string;
  timestamp: number;
}

interface Snippet { id: string; label: string; text: string; }

const QUICK_FILL_KEYS = ["court", "caseNumber", "parties", "judgeName"] as const;
const QUICK_FILL_LABELS: Record<string, string> = { court: "Court", caseNumber: "Case No.", parties: "Parties", judgeName: "Judge" };

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creditErr, setCreditErr] = useState<{ remaining: number; creditCost: number } | null>(null);

  useEffect(() => {
    if (!matter) return;
    const versions = (matter.draftVersions as DraftVersion[] | undefined) ?? [];
    if (versions.length > 0 && !draft) {
      setDraft(versions[0].content);
      setDocType(versions[0].docType);
    }
  }, [matter?.id, draft, matter]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!instructions.trim() || loading || !matter) return;
    setLoading(true);
    setError(null);
    setStreamingText("");

    try {
      const prompt = `Draft a ${docType} based on the following instructions: ${instructions}`;
      const lexFetch = withLexMemory(matter, updateMatter, { tab: "draft" });
      const res = await lexFetch(
        { model: settings.model, max_tokens: 4000, system: settings.systemPrompt, messages: [{ role: "user", content: prompt }] },
        undefined,
        { onChunk: chunk => setStreamingText(prev => prev + chunk) }
      );
      const data = await res.json() as { content?: Array<{ text: string }> };
      const text = data.content?.[0]?.text ?? "No response.";
      setDraft(text);

      const newVersion: DraftVersion = { content: text, docType, timestamp: Date.now() };
      const currentVersions = (matter.draftVersions as DraftVersion[] | undefined) ?? [];
      updateMatter({ ...matter, draftVersions: [newVersion, ...currentVersions].slice(0, 10) });
    } catch (e) {
      if (e instanceof FreeTierExhaustedError) { setError(e.message); }
      else if (e instanceof CreditExhaustedError) { setCreditErr({ remaining: e.remaining, creditCost: e.creditCost }); }
      else if (e instanceof QuotaExceededError) { setError("AI quota exceeded."); }
      else { setError((e as Error).message); }
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  };

  return (
    <PanelShell icon={FileEdit} title="AI Drafting" description="Generate professional legal documents and templates">
      {creditErr && <UpgradeCTA reason="Monthly credits exhausted." creditsRemaining={creditErr.remaining} creditCost={creditErr.creditCost} onClose={() => setCreditErr(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Left: Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)] mb-1.5">Document Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className="lex-input w-full">
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)] mb-1.5">Instructions</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Describe the document, specific arguments, parties, and desired tone..."
              className="lex-input w-full h-48 resize-none"
            />
          </div>

          <button onClick={handleGenerate} disabled={loading || !instructions.trim()} className="lex-btn lex-btn--primary w-full justify-center">
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2" />}
            {draft ? "Re-generate Document" : "Generate Draft"}
          </button>

          {error && <p className="text-xs text-[var(--verdict-crimson)] font-mono">{error}</p>}
        </div>

        {/* Right: Output */}
        <div className="flex flex-col border border-[rgba(224,224,224,0.08)] rounded-xl bg-[var(--midnight-deep)] overflow-hidden">
          <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)]">Draft Output</span>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10 text-[var(--fg-tertiary)]" title="Copy to clipboard">
                {copied ? <Check size={14} className="text-[var(--verdict-neon)]" /> : <Copy size={14} />}
              </button>
              <ExportButton content={draft} filename={`draft-${docType.replace(/\s+/g, '-').toLowerCase()}`} format="markdown" label="Export" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 prose prose-invert prose-sm max-w-none">
            {loading && streamingText ? <Markdown text={streamingText} /> : draft ? <Markdown text={draft} /> : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--fg-quaternary)] opacity-40 italic">
                <FileEdit size={32} className="mb-2" />
                <p className="text-xs">Generated draft will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
