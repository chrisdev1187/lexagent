"use client";

import { useState } from "react";
import { Archive, Plus, Trash2, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface VaultDoc {
  id: string;
  title: string;
  docType: string;
  url?: string;
  notes?: string;
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

export default function VaultPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("Motion");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const docs = (matter?.vaultDocs as unknown as VaultDoc[]) ?? [];

  const addDoc = async () => {
    if (!title.trim() || !matter) return;
    const newDoc: VaultDoc = {
      id: crypto.randomUUID(),
      title: title.trim(),
      docType,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };
    await updateMatter({ ...matter, vaultDocs: [newDoc, ...docs] });
    setTitle("");
    setDocType("Motion");
    setUrl("");
    setNotes("");
    setShowForm(false);
  };

  const deleteDoc = async (docId: string) => {
    if (!matter) return;
    await updateMatter({ ...matter, vaultDocs: docs.filter(d => d.id !== docId) });
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
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "var(--panel2)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={addDoc}
                disabled={!title.trim()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{
                  background: title.trim()
                    ? "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)"
                    : "var(--panel2)",
                  color: title.trim() ? "#0A0F0D" : "var(--text-muted)",
                  border: "none",
                  cursor: title.trim() ? "pointer" : "default",
                }}
              >
                <Plus size={12} />
                Save Document
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
            <div
              key={doc.id}
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
                    <p
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {doc.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
