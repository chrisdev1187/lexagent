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
  Evidence: "var(--verdict-neon)",
  Witness: "var(--verdict-amber)",
  "Legal Issue": "var(--verdict-crimson)",
  Strategy: "var(--verdict-violet)",
  Admin: "var(--fg-secondary)",
  General: "var(--fg-tertiary)",
};

const TAG_KIND: Record<string, string> = {
  Evidence: "neon",
  Witness: "amber",
  "Legal Issue": "crimson",
  Strategy: "violet",
  Admin: "neutral",
  General: "neutral",
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
      title="Evidence & notes"
      description="Capture notes, evidence observations, and case-related information"
    >
      {/* Add note form */}
      <div className="lex-card mb-6">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full text-sm resize-none mb-3"
          style={{
            background: "transparent",
            color: "var(--fg-primary)",
            border: "none",
            outline: "none",
          }}
        />
        <div className="flex items-center gap-3">
          <select
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="text-xs rounded px-3 py-1.5"
            style={{
              background: "var(--bg-raised)",
              color: "var(--fg-primary)",
              border: "0.5px solid var(--border-hair)",
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
            className="lex-btn lex-btn--primary ml-auto"
          >
            <Plus size={12} />
            Add note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {sorted.length === 0 ? (
        <div className="lex-empty">
          <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
            <FileText size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">No notes yet</p>
          <p className="lex-empty__body">Add your first note above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(note => (
            <div
              key={note.id}
              className={`lex-card${note.tag === "Strategy" ? " lex-card--sealed" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`lex-chip lex-chip--${TAG_KIND[note.tag] ?? "neutral"}`}>
                      {note.tag}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--fg-primary)", whiteSpace: "pre-wrap" }}>
                    {note.text}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="lex-btn lex-btn--icon lex-btn--ghost"
                  style={{ flexShrink: 0 }}
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
