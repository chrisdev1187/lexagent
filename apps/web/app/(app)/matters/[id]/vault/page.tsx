"use client";

import { useState, useRef } from "react";
import {
  Archive, Plus, Trash2, ExternalLink, Upload, FileText,
  Loader2, ShieldCheck, BookOpen, Zap, Scissors,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/providers/settings-provider";
import { supabase } from "@/lib/supabase";
import { PanelShell } from "@/components/panels/PanelShell";
import { logAudit } from "@/lib/audit";
import { adjustStorageUsage } from "@/lib/quota";
import { anthropicFetch } from "@/lib/api";
import { mergeMemory } from "@/lib/lex-memory/merge";
import type { LexMemory, Level3Strategy } from "@/lib/lex-memory/types";
import { DocCard, VaultDoc } from "@/components/vault/DocCard";

const DOC_TYPES = [
  "Motion", "Brief", "Contract", "Evidence", "Discovery",
  "Correspondence", "Pleading", "Order", "Other",
];

function redactText(text: string): string {
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN REDACTED]")
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE REDACTED]")
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "[EMAIL REDACTED]")
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/g, "[DATE REDACTED]");
}

export default function VaultPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { user } = useAuth();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [addSection, setAddSection] = useState<"confidential" | "context">("confidential");
  const [showContextWarning, setShowContextWarning] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("Motion");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [acp, setAcp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const docs = (matter?.vaultDocs as unknown as VaultDoc[]) ?? [];
  const confidentialDocs = docs.filter(d => d.section === "confidential" || !d.section);
  const contextDocs = docs.filter(d => d.section === "context");

  const resetForm = () => {
    setTitle(""); setDocType("Motion"); setUrl(""); setNotes("");
    setAcp(false); setSelectedFile(null); setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const openContextForm = () => {
    setAddSection("context");
    setShowContextWarning(true);
  };

  const openConfidentialForm = () => {
    setAddSection("confidential");
    setShowForm(true);
  };

  const enrichWithAres = async (doc: VaultDoc, allDocs: VaultDoc[]) => {
    if (!matter) return;
    setEnrichingId(doc.id);
    try {
      const res = await anthropicFetch({
        model: settings.model,
        max_tokens: 300,
        system: settings.systemPrompt,
        messages: [{
          role: "user",
          content: `Summarize this document in 3-5 concise bullet points for use as legal research context:\n\nTitle: ${doc.title}\nType: ${doc.docType}\nNotes: ${doc.notes ?? "None"}\n\nBullet points only. Each under 20 words.`,
        }],
      });
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      const summary = data.content?.[0]?.text ?? "";

      const strategyNode: Level3Strategy = {
        kind: "strategy",
        id: `vault_ctx_${doc.id}`,
        label: `VAULT: ${doc.title}`,
        detail: summary,
        confirmedBy: ["vault"],
        lastRefAt: Date.now(),
        confidence: 2,
      };

      const currentMemory = (matter.lexMemory as LexMemory | undefined) ?? null;
      if (currentMemory) {
        const updated = mergeMemory(currentMemory, { nodes: [strategyNode] });
        const updatedDoc = { ...doc, aresEnriched: true, aresContext: summary };
        await updateMatter({
          ...matter,
          lexMemory: updated,
          vaultDocs: allDocs.map(d => d.id === doc.id ? updatedDoc : d),
        });
      } else {
        const updatedDoc = { ...doc, aresEnriched: true, aresContext: summary };
        await updateMatter({
          ...matter,
          vaultDocs: allDocs.map(d => d.id === doc.id ? updatedDoc : d),
        });
      }
    } catch {
      // enrichment failure is non-fatal
    } finally {
      setEnrichingId(null);
    }
  };

  const addDoc = async () => {
    if (!title.trim() || !matter || !user) return;
    setUploading(true);
    setUploadError(null);

    let storagePath: string | undefined;
    let fileSize: number | undefined;
    let fileType: string | undefined;

    try {
      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${matter.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("vault-docs")
          .upload(path, selectedFile, { upsert: false });
        if (error) throw new Error(error.message);
        storagePath = path;
        fileSize = selectedFile.size;
        fileType = selectedFile.type;
      }

      const newDoc: VaultDoc = {
        id: crypto.randomUUID(),
        title: title.trim(),
        docType,
        section: addSection,
        url: url.trim() || undefined,
        storagePath,
        fileSize,
        fileType,
        notes: notes.trim() || undefined,
        acp: addSection === "confidential" ? acp : false,
        createdAt: Date.now(),
      };

      const newDocs = [newDoc, ...docs];
      await updateMatter({ ...matter, vaultDocs: newDocs });
      logAudit("doc.upload", "document", newDoc.id, matter.id, { title: newDoc.title, section: addSection, acp: newDoc.acp }).catch(() => {});
      if (fileSize) adjustStorageUsage(fileSize).catch(() => {});

      resetForm();
      setShowForm(false);

      if (addSection === "context") {
        enrichWithAres(newDoc, newDocs);
      }
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (doc: VaultDoc) => {
    if (!matter) return;
    if (doc.storagePath) {
      await supabase.storage.from("vault-docs").remove([doc.storagePath]);
    }
    await updateMatter({ ...matter, vaultDocs: docs.filter(d => d.id !== doc.id) });
    logAudit("doc.delete", "document", doc.id, matter.id, { title: doc.title }).catch(() => {});
    if (doc.fileSize) adjustStorageUsage(-doc.fileSize).catch(() => {});
    if (viewingDocId === doc.id) { setViewingUrl(null); setViewingDocId(null); }
  };

  const viewFile = async (doc: VaultDoc) => {
    if (!doc.storagePath) return;
    if (viewingDocId === doc.id) { setViewingUrl(null); setViewingDocId(null); return; }
    const { data, error } = await supabase.storage
      .from("vault-docs")
      .createSignedUrl(doc.storagePath, 3600);
    if (error || !data?.signedUrl) return;
    setViewingUrl(data.signedUrl);
    setViewingDocId(doc.id);
  };

  const createRedactedCopy = async (doc: VaultDoc) => {
    if (!matter) return;
    const redactedDoc: VaultDoc = {
      ...doc,
      id: crypto.randomUUID(),
      title: `[REDACTED] ${doc.title}`,
      notes: doc.notes ? redactText(doc.notes) : undefined,
      storagePath: undefined,
      url: undefined,
      redacted: true,
      aresEnriched: false,
      createdAt: Date.now(),
    };
    await updateMatter({ ...matter, vaultDocs: [redactedDoc, ...docs] });
  };

  return (
    <PanelShell
      icon={Archive}
      title="Matter Vault"
      description="Secure discovery repository and research context"
    >
      <div className="flex gap-6">
        <div className="flex-1 space-y-8">

          {/* Context Section (Knowledge Base) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[var(--verdict-neon)]" />
                <h3 className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--fg-tertiary)" }}>Research Context</h3>
              </div>
              <button onClick={openContextForm} className="lex-btn lex-btn--ghost py-1 px-2 text-[10px]">
                <Plus size={12} /> Add Context
              </button>
            </div>
            {contextDocs.length === 0 ? (
              <div className="rounded p-10 text-center border border-dashed border-[rgba(224,224,224,0.1)]">
                <p className="text-xs text-[var(--fg-quaternary)]">No research context documents added. ARES will use these to ground research in matter facts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {contextDocs.map(doc => (
                  <DocCard key={doc.id} doc={doc} enrichingId={enrichingId} onView={viewFile} onDelete={deleteDoc} onRedact={createRedactedCopy} />
                ))}
              </div>
            )}
          </section>

          {/* Confidential Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[var(--verdict-violet)]" />
                <h3 className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "var(--fg-tertiary)" }}>Confidential Repository</h3>
              </div>
              <button onClick={openConfidentialForm} className="lex-btn lex-btn--primary py-1 px-3 text-[10px]">
                <Upload size={12} /> Upload Discovery
              </button>
            </div>
            {confidentialDocs.length === 0 ? (
              <div className="rounded p-10 text-center bg-white/5 border border-white/5">
                <FileText size={24} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs text-[var(--fg-quaternary)]">Discovery repository is empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {confidentialDocs.map(doc => (
                  <DocCard key={doc.id} doc={doc} enrichingId={enrichingId} onView={viewFile} onDelete={deleteDoc} onRedact={createRedactedCopy} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Quick View Sidebar */}
        {viewingUrl && (
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-0 rounded-xl overflow-hidden border border-[rgba(224,224,224,0.14)]" style={{ height: "calc(100vh - 200px)", background: "var(--midnight-deep)" }}>
              <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5">
                <span className="text-[10px] font-mono text-[var(--fg-tertiary)] uppercase tracking-widest">Preview</span>
                <button onClick={() => { setViewingUrl(null); setViewingDocId(null); }} className="p-1 rounded hover:bg-white/10 text-[var(--fg-tertiary)]">✕</button>
              </div>
              <iframe src={viewingUrl} className="w-full h-full border-none" title="Vault Document Preview" />
            </div>
          </div>
        )}
      </div>

      {/* Context Warning Modal */}
      {showContextWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[var(--midnight-deep)] rounded-xl border border-[rgba(0,255,195,0.2)] shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(0,255,195,0.08)] border border-[rgba(0,255,195,0.3)]">
                <Zap size={20} className="text-[var(--verdict-neon)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">Research Context</h3>
            </div>
            <p className="text-sm text-[var(--fg-secondary)] leading-relaxed mb-6">
              Documents added as <strong>Research Context</strong> are shared with AI models to improve research accuracy and ground ARES in your matter's specific facts.
              <br /><br />
              <span className="text-[var(--verdict-amber)]">⚠️ Do not include extremely sensitive or privileged information you do not want processed by LLM sub-processors.</span>
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowContextWarning(false); setShowForm(true); }}
                className="lex-btn lex-btn--primary w-full justify-center"
              >
                I understand, proceed
              </button>
              <button
                onClick={() => setShowContextWarning(false)}
                className="lex-btn lex-btn--ghost w-full justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload/Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full bg-[var(--midnight-deep)] rounded-xl border border-[rgba(224,224,224,0.1)] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--fg-primary)]">
                {addSection === "context" ? "Add Research Context" : "Upload Discovery"}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-[var(--fg-tertiary)] hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {uploadError && <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-500 text-xs">{uploadError}</div>}

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)] mb-1.5">Document Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="lex-input w-full"
                  placeholder="e.g. Complaint, MSJ Opposition, Exhibit A..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)] mb-1.5">Type</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="lex-input w-full"
                  >
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {addSection === "confidential" && (
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="acp-check"
                      checked={acp}
                      onChange={e => setAcp(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-white/5 text-[var(--verdict-neon)]"
                    />
                    <label htmlFor="acp-check" className="text-xs text-[var(--fg-secondary)] cursor-pointer">Privileged (ACP)</label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)] mb-1.5">Source File</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="lex-btn lex-btn--secondary flex-1 justify-center"
                  >
                    <Upload size={14} /> {selectedFile ? selectedFile.name : "Select File"}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--fg-tertiary)] mb-1.5">Internal Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="lex-input w-full h-24 resize-none text-xs"
                  placeholder="Summary, Bates range, or importance..."
                />
              </div>
            </div>
            <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="lex-btn lex-btn--ghost">Cancel</button>
              <button onClick={addDoc} disabled={uploading || (!selectedFile && !url)} className="lex-btn lex-btn--primary px-8">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : "Save Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
