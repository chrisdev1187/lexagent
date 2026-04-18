"use client";

import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface Note {
  id: string;
  text: string;
  tag: string;
  createdAt: number;
}

const TAGS = ["Evidence", "Witness", "Legal Issue", "Strategy", "Admin", "General"];

const TAG_COLORS: Record<string, string> = {
  Evidence: "var(--emerald)",
  Witness: "var(--gold)",
  "Legal Issue": "var(--crimson)",
  Strategy: "#7c3aed",
  Admin: "var(--text-sub)",
  General: "var(--text-muted)",
};

export default function NotesPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);

  const [text, setText] = useState("");
  const [tag, setTag] = useState("General");

  const notes = (matter?.notes as unknown as Note[]) ?? [];

  const addNote = async () => {
    if (!text.trim() || !matter) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      text: text.trim(),
      tag,
      createdAt: Date.now(),
    };
    await updateMatter({ ...matter, notes: [newNote, ...notes] });
    setText("");
  };

  const deleteNote = async (noteId: string) => {
    if (!matter) return;
    await updateMatter({ ...matter, notes: notes.filter(n => n.id !== noteId) });
  };

  const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <PanelShell
      icon={FileText}
      title="Evidence & Notes"
      description="Capture notes, evidence observations, and case-related information"
    >
      {/* Add note form */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full text-sm resize-none mb-3"
          style={{
            background: "transparent",
            color: "var(--text)",
            border: "none",
            outline: "none",
          }}
        />
        <div className="flex items-center gap-3">
          <select
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="text-xs rounded-lg px-3 py-1.5"
            style={{
              background: "var(--panel2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              outline: "none",
            }}
          >
            {TAGS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={addNote}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ml-auto"
            style={{
              background: text.trim()
                ? "linear-gradient(135deg, var(--emerald) 0%, #059669 100%)"
                : "var(--panel2)",
              color: text.trim() ? "#0A0F0D" : "var(--text-muted)",
              border: "none",
              cursor: text.trim() ? "pointer" : "default",
            }}
          >
            <Plus size={12} />
            Add Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "var(--emerald-faint)", border: "1px solid var(--emerald-dim)" }}
          >
            <FileText size={20} style={{ color: "var(--emerald)" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>No notes yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add your first note above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(note => (
            <div
              key={note.id}
              className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${TAG_COLORS[note.tag] ?? "var(--text-muted)"}22`,
                        color: TAG_COLORS[note.tag] ?? "var(--text-muted)",
                        border: `1px solid ${TAG_COLORS[note.tag] ?? "var(--text-muted)"}44`,
                      }}
                    >
                      {note.tag}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text)", whiteSpace: "pre-wrap" }}>
                    {note.text}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1.5 rounded-md flex-shrink-0"
                  style={{ color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
