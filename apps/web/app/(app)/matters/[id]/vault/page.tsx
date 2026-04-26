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

interface VaultDoc {
  id: string;
  title: string;
  docType: string;
  section: "confidential" | "context";
  url?: string;
  storagePath?: string;
  fileSize?: number;
  fileType?: string;
  notes?: string;
  acp?: boolean;
  aresEnriched?: boolean;
  aresContext?: string;
  redacted?: boolean;
  createdAt: number;
}

const DOC_TYPES = [
  "Motion", "Brief", "Contract", "Evidence", "Discovery",
  "Correspondence", "Pleading", "Order", "Other",
];

const TYPE_COLORS: Record<string, string> = {
  Motion: "var(--verdict-amber)",
  Brief: "var(--verdict-neon)",
  Contract: "var(--verdict-violet)",
  Evidence: "var(--verdict-crimson)",
  Discovery: "#0ea5e9",
  Correspondence: "var(--fg-secondary)",
  Pleading: "var(--verdict-amber)",
  Order: "var(--verdict-crimson)",
  Other: "var(--fg-tertiary)",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

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
  const [contextWarningAcked, setContextWarningAcked] = useState(false);
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
    setContextWarningAcked(false);
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

  const DocCard = ({ doc }: { doc: VaultDoc }) => (
    <div key={doc.id}>
      <div className={`lex-card${doc.acp ? " lex-card--sealed" : ""}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="lex-chip"
                style={{
                  background: `${TYPE_COLORS[doc.docType] ?? "var(--fg-tertiary)"}22`,
                  color: TYPE_COLORS[doc.docType] ?? "var(--fg-tertiary)",
                  borderColor: `${TYPE_COLORS[doc.docType] ?? "var(--fg-tertiary)"}44`,
                }}
              >
                {doc.docType}
              </span>
              {doc.storagePath && (
                <span className="lex-chip lex-chip--neutral">
                  {doc.fileType?.split("/")[1]?.toUpperCase() ?? "FILE"} · {formatBytes(doc.fileSize ?? 0)}
                </span>
              )}
              {doc.acp && (
                <span className="lex-chip lex-chip--violet" title="Attorney-Client Privilege">
                  <ShieldCheck size={9} />
                  ACP
                </span>
              )}
              {doc.redacted && (
                <span className="lex-chip" style={{ background: "rgba(255,163,0,0.08)", color: "var(--verdict-amber)", borderColor: "rgba(255,163,0,0.28)" }}>
                  <Scissors size={9} />
                  Redacted copy
                </span>
              )}
              {doc.aresEnriched && (
                <span className="lex-chip" style={{ background: "rgba(0,255,195,0.06)", color: "var(--verdict-neon)", borderColor: "rgba(0,255,195,0.28)" }}>
                  <Zap size={9} />
                  ARES Enriched
                </span>
              )}
              {enrichingId === doc.id && (
                <span className="lex-chip" style={{ color: "var(--fg-tertiary)" }}>
                  <Loader2 size={9} className="animate-spin" />
                  Enriching…
                </span>
              )}
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--verdict-neon)", display: "flex", alignItems: "center" }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{doc.title}</p>
            {doc.notes && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--fg-tertiary)" }}>{doc.notes}</p>
            )}
            {doc.aresContext && (
              <p className="text-xs mt-1 line-clamp-3" style={{ color: "rgba(0,255,195,0.6)", fontStyle: "italic" }}>{doc.aresContext}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {doc.storagePath && (
              <button
                onClick={() => viewFile(doc)}
                className="lex-btn lex-btn--icon lex-btn--ghost"
                style={{ color: viewingDocId === doc.id ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}
                title="View file"
              >
                <FileText size={13} />
              </button>
            )}
            {!doc.redacted && (
              <button
                onClick={() => createRedactedCopy(doc)}
                className="lex-btn lex-btn--icon lex-btn--ghost"
                title="Create redacted copy"
              >
                <Scissors size={13} />
              </button>
            )}
            <button onClick={() => deleteDoc(doc)} className="lex-btn lex-btn--icon lex-btn--ghost">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <p className="font-mono text-[10px] mt-2" style={{ color: "var(--fg-tertiary)" }}>
          {new Date(doc.createdAt).toLocaleDateString()}
        </p>
      </div>
      {viewingDocId === doc.id && viewingUrl && (
        <div className="rounded mt-2 overflow-hidden" style={{ border: "0.5px solid var(--border-hair)", height: 500 }}>
          {doc.fileType?.startsWith("image/") ? (
            <img src={viewingUrl} alt={doc.title} className="w-full h-full object-contain" style={{ background: "var(--bg-raised)" }} />
          ) : (
            <iframe src={viewingUrl} title={doc.title} className="w-full h-full" style={{ border: "none" }} />
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Attorney warning modal */}
      {showContextWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "var(--bg-surface)", border: "0.5px solid rgba(224,224,224,0.12)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color: "var(--verdict-amber)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Context Library — Attorney Notice</p>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--fg-secondary)", lineHeight: 1.6 }}>
              Documents in the Context Library are <strong>not protected by attorney-client privilege</strong> and will be used as reference material to improve ARES AI responses within this matter. Do not upload privileged, confidential, or ACP-protected documents here.
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={contextWarningAcked}
                onChange={e => setContextWarningAcked(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
                I understand this document is non-confidential and may be used to inform AI analysis in this matter.
              </span>
            </label>
            <div className="flex gap-2 justify-end">
              <button className="lex-btn lex-btn--ghost" onClick={() => setShowContextWarning(false)}>Cancel</button>
              <button
                className="lex-btn lex-btn--primary"
                disabled={!contextWarningAcked}
                onClick={() => { setShowContextWarning(false); setShowForm(true); }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <PanelShell
        icon={Archive}
        title={`Document vault${docs.length > 0 ? ` (${docs.length})` : ""}`}
        description="Confidential case documents and non-confidential ARES context library"
        actions={
          <div className="flex gap-2">
            <button onClick={openConfidentialForm} className="lex-btn lex-btn--secondary">
              <ShieldCheck size={12} />
              Add confidential
            </button>
            <button onClick={openContextForm} className="lex-btn lex-btn--primary">
              <BookOpen size={12} />
              Add to context library
            </button>
          </div>
        }
      >
        {/* Add form */}
        {showForm && (
          <div
            className="lex-card mb-6"
            style={{ borderColor: addSection === "context" ? "rgba(255,163,0,0.3)" : "var(--border-neon)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              {addSection === "context"
                ? <><BookOpen size={13} style={{ color: "var(--verdict-amber)" }} /><span className="text-xs font-medium" style={{ color: "var(--verdict-amber)" }}>Adding to Context Library</span></>
                : <><ShieldCheck size={13} style={{ color: "var(--verdict-neon)" }} /><span className="text-xs font-medium" style={{ color: "var(--verdict-neon)" }}>Adding to Confidential Vault</span></>
              }
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div style={{ flex: "1 1 auto" }}>
                  <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title…" className="lex-input" />
                </div>
                <div style={{ flex: "0 0 140px" }}>
                  <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)} className="lex-input">
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Upload file (optional)</label>
                <div
                  className="flex items-center gap-2 rounded px-3 py-2 cursor-pointer"
                  style={{ border: "0.5px solid var(--border-hair)", background: "var(--bg-raised)" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} style={{ color: "var(--fg-tertiary)" }} />
                  <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
                    {selectedFile ? selectedFile.name : "Click to upload PDF, Word, image…"}
                  </span>
                  {selectedFile && (
                    <span className="ml-auto text-xs" style={{ color: "var(--fg-tertiary)" }}>
                      {formatBytes(selectedFile.size)}
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>URL (optional)</label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="lex-input" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Brief description or notes…" rows={2} className="lex-textarea" style={{ resize: "none" }} />
              </div>

              {addSection === "confidential" && (
                <button
                  type="button"
                  onClick={() => setAcp(v => !v)}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded w-full"
                  style={{
                    background: acp ? "rgba(106,0,255,0.08)" : "var(--bg-raised)",
                    color: acp ? "var(--verdict-violet)" : "var(--fg-tertiary)",
                    border: `0.5px solid ${acp ? "var(--border-violet)" : "var(--border-hair)"}`,
                    cursor: "pointer",
                  }}
                >
                  <ShieldCheck size={13} />
                  Attorney-client privilege (ACP) — {acp ? "Protected" : "Not tagged"}
                </button>
              )}

              {addSection === "context" && (
                <div className="rounded px-3 py-2 text-xs" style={{ background: "rgba(255,163,0,0.04)", border: "0.5px solid rgba(255,163,0,0.2)", color: "var(--verdict-amber)" }}>
                  <Zap size={11} className="inline mr-1" />
                  ARES will automatically summarize this document and inject it as context into all AI analyses for this matter.
                </div>
              )}

              {uploadError && <p className="text-xs" style={{ color: "var(--verdict-crimson)" }}>{uploadError}</p>}

              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowForm(false); resetForm(); }} className="lex-btn lex-btn--ghost">Cancel</button>
                <button onClick={addDoc} disabled={!title.trim() || uploading} className="lex-btn lex-btn--primary">
                  {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <><Plus size={12} /> Save document</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Confidential Vault ─────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} style={{ color: "var(--verdict-violet)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Confidential Vault</p>
            <span className="lex-chip lex-chip--violet">{confidentialDocs.length}</span>
          </div>
          {confidentialDocs.length === 0 ? (
            <div className="rounded px-4 py-5 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>No confidential documents. ACP-tagged documents will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {confidentialDocs.map(doc => <DocCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>

        {/* ── Context Library ────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} style={{ color: "var(--verdict-amber)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>Context Library</p>
            <span className="lex-chip" style={{ background: "rgba(255,163,0,0.08)", color: "var(--verdict-amber)", borderColor: "rgba(255,163,0,0.28)" }}>{contextDocs.length}</span>
            <span className="text-xs ml-1" style={{ color: "var(--fg-quaternary)" }}>Non-confidential · Used to enrich ARES responses</span>
          </div>
          {contextDocs.length === 0 ? (
            <div className="rounded px-4 py-5 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
              <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>Add non-confidential documents (statutes, public filings, reference material) to enrich ARES with case-specific knowledge.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {contextDocs.map(doc => <DocCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>
      </PanelShell>
    </>
  );
}
