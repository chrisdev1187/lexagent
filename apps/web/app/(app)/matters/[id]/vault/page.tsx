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
  Motion: "var(--gold)",
  Brief: "var(--emerald)",
  Contract: "#7c3aed",
  Evidence: "var(--crimson)",
  Discovery: "#0ea5e9",
  Correspondence: "var(--text-sub)",
  Pleading: "var(--gold)",
  Order: "var(--crimson)",
  Other: "var(--text-muted)",
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
    background: "var(--panel2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    outline: "none",
    fontSize: "0.75rem",
    padding: "6px 12px",
    width: "100%",
  };

  return (
    <PanelShell
      icon={Archive}
      title={`Document Vault ${docs.length > 0 ? `(${docs.length})` : ""}`}
      description="Reference manager for case documents, filings, and evidence"
      actions={
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)",
            color: "#0A0F0D",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={12} />
          Add Document
        </button>
      }
    >
      {/* Add form */}
      {showForm && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border-hi)" }}
        >
          <div className="space-y-3">
            <div className="flex gap-3">
              <div style={{ flex: "1 1 auto" }}>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Document title…"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "0 0 140px" }}>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Type</label>
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
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Upload File (optional)</label>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer"
                style={{ border: "1px dashed var(--border)", background: "var(--panel2)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {selectedFile ? selectedFile.name : "Click to upload PDF, Word, image…"}
                </span>
                {selectedFile && (
                  <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
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
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>URL (optional)</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Notes (optional)</label>
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
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg w-full"
              style={{
                background: acp ? "rgba(124,58,237,0.1)" : "var(--panel2)",
                color: acp ? "#7c3aed" : "var(--text-muted)",
                border: `1px solid ${acp ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              <ShieldCheck size={13} />
              Attorney-Client Privilege (ACP) — {acp ? "Protected" : "Not tagged"}
            </button>

            {uploadError && (
              <p className="text-xs" style={{ color: "var(--crimson)" }}>{uploadError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowForm(false); setSelectedFile(null); setUploadError(null); }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "var(--panel2)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={addDoc}
                disabled={!title.trim() || uploading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{
                  background: title.trim() && !uploading
                    ? "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)"
                    : "var(--panel2)",
                  color: title.trim() && !uploading ? "#0A0F0D" : "var(--text-muted)",
                  border: "none",
                  cursor: title.trim() && !uploading ? "pointer" : "default",
                }}
              >
                {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <><Plus size={12} /> Save Document</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document grid */}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
          >
            <Archive size={20} style={{ color: "var(--emerald)" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>No documents yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Click &quot;Add Document&quot; to start building your vault</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {docs.map(doc => (
            <div key={doc.id}>
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${TYPE_COLORS[doc.docType] ?? "var(--text-muted)"}22`,
                          color: TYPE_COLORS[doc.docType] ?? "var(--text-muted)",
                          border: `1px solid ${TYPE_COLORS[doc.docType] ?? "var(--text-muted)"}44`,
                        }}
                      >
                        {doc.docType}
                      </span>
                      {doc.storagePath && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--panel2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          {doc.fileType?.split("/")[1]?.toUpperCase() ?? "FILE"} · {formatBytes(doc.fileSize ?? 0)}
                        </span>
                      )}
                      {doc.acp && (
                        <span
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          title="Attorney-Client Privilege"
                          style={{ background: "rgba(124,58,237,0.12)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.3)" }}
                        >
                          <ShieldCheck size={9} />
                          ACP
                        </span>
                      )}
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--emerald)", display: "flex", alignItems: "center" }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{doc.title}</p>
                    {doc.notes && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        {doc.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {doc.storagePath && (
                      <button
                        onClick={() => viewFile(doc)}
                        className="p-1 rounded"
                        style={{ color: viewingDocId === doc.id ? "var(--emerald)" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                        title="View file"
                      >
                        <FileText size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteDoc(doc)}
                      style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Inline file viewer */}
              {viewingDocId === doc.id && viewingUrl && (
                <div
                  className="rounded-xl mt-2 overflow-hidden"
                  style={{ border: "1px solid var(--border)", height: 500 }}
                >
                  {doc.fileType?.startsWith("image/") ? (
                    <img src={viewingUrl} alt={doc.title} className="w-full h-full object-contain" style={{ background: "var(--surface)" }} />
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
