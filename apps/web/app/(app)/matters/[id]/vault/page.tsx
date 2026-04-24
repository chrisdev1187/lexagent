"use client";

import { useState, useRef } from "react";
import { Archive, Plus, Trash2, ExternalLink, Upload, FileText, Loader2, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PanelShell } from "@/components/panels/PanelShell";
import { logAudit } from "@/lib/audit";
import { adjustStorageUsage } from "@/lib/quota";

interface VaultDoc {
  id: string;
  title: string;
  docType: string;
  url?: string;
  storagePath?: string;
  fileSize?: number;
  fileType?: string;
  notes?: string;
  acp?: boolean;
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

export default function VaultPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { user } = useAuth();
  const matter = getMatter(id);

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const docs = (matter?.vaultDocs as unknown as VaultDoc[]) ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !title) setTitle(file.name.replace(/\.[^.]+$/, ""));
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
        url: url.trim() || undefined,
        storagePath,
        fileSize,
        fileType,
        notes: notes.trim() || undefined,
        acp,
        createdAt: Date.now(),
      };
      await updateMatter({ ...matter, vaultDocs: [newDoc, ...docs] });
      logAudit("doc.upload", "document", newDoc.id, matter.id, { title: newDoc.title, acp }).catch(() => {});
      if (fileSize) adjustStorageUsage(fileSize).catch(() => {});
      setTitle("");
      setDocType("Motion");
      setUrl("");
      setNotes("");
      setAcp(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false);
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

  const inputStyle = {
    background: "var(--bg-raised)",
    color: "var(--fg-primary)",
    border: "0.5px solid var(--border-hair)",
    borderRadius: "var(--radius-md)",
    outline: "none",
    fontSize: "0.75rem",
    padding: "6px 12px",
    width: "100%",
  };

  return (
    <PanelShell
      icon={Archive}
      title={`Document vault${docs.length > 0 ? ` (${docs.length})` : ""}`}
      description="Reference manager for case documents, filings, and evidence"
      actions={
        <button
          onClick={() => setShowForm(v => !v)}
          className="lex-btn lex-btn--primary"
        >
          <Plus size={12} />
          Add document
        </button>
      }
    >
      {/* Add form */}
      {showForm && (
        <div className="lex-card mb-6" style={{ borderColor: "var(--border-neon)" }}>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div style={{ flex: "1 1 auto" }}>
                <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Document title…"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "0 0 140px" }}>
                <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Type</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  style={inputStyle}
                >
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* File upload */}
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
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Brief description or notes…"
                rows={2}
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

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

            {uploadError && (
              <p className="text-xs" style={{ color: "var(--verdict-crimson)" }}>{uploadError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowForm(false); setSelectedFile(null); setUploadError(null); }}
                className="lex-btn lex-btn--ghost"
              >
                Cancel
              </button>
              <button
                onClick={addDoc}
                disabled={!title.trim() || uploading}
                className="lex-btn lex-btn--primary"
              >
                {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <><Plus size={12} /> Save document</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document grid */}
      {docs.length === 0 ? (
        <div className="lex-empty">
          <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
            <Archive size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">No documents yet</p>
          <p className="lex-empty__body">Click &quot;Add document&quot; to start building your vault</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {docs.map(doc => (
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
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--verdict-neon)", display: "flex", alignItems: "center" }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{doc.title}</p>
                    {doc.notes && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--fg-tertiary)" }}>
                        {doc.notes}
                      </p>
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
                    <button
                      onClick={() => deleteDoc(doc)}
                      className="lex-btn lex-btn--icon lex-btn--ghost"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="font-mono text-[10px] mt-2" style={{ color: "var(--fg-tertiary)" }}>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Inline file viewer */}
              {viewingDocId === doc.id && viewingUrl && (
                <div
                  className="rounded mt-2 overflow-hidden"
                  style={{ border: "0.5px solid var(--border-hair)", height: 500 }}
                >
                  {doc.fileType?.startsWith("image/") ? (
                    <img src={viewingUrl} alt={doc.title} className="w-full h-full object-contain" style={{ background: "var(--bg-raised)" }} />
                  ) : (
                    <iframe src={viewingUrl} title={doc.title} className="w-full h-full" style={{ border: "none" }} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
