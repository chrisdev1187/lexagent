"use client";

import { useState } from "react";
import { Clock, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  done: boolean;
  createdAt: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--verdict-crimson)",
  medium: "var(--verdict-amber)",
  low: "var(--verdict-neon)",
};

const PRIORITY_KIND: Record<string, string> = {
  high: "crimson",
  medium: "amber",
  low: "neon",
};

export default function DeadlinesPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const deadlines = (matter?.deadlines as unknown as Deadline[]) ?? [];
  const today = new Date().toISOString().split("T")[0];

  const addDeadline = async () => {
    if (!title.trim() || !dueDate || !matter) return;
    const newDeadline: Deadline = {
      id: crypto.randomUUID(),
      title: title.trim(),
      dueDate,
      priority,
      done: false,
      createdAt: Date.now(),
    };
    await updateMatter({ ...matter, deadlines: [...deadlines, newDeadline] });
    setTitle("");
    setDueDate("");
    setPriority("medium");
  };

  const toggleDone = async (deadlineId: string) => {
    if (!matter) return;
    await updateMatter({
      ...matter,
      deadlines: deadlines.map(d =>
        d.id === deadlineId ? { ...d, done: !d.done } : d
      ),
    });
  };

  const deleteDeadline = async (deadlineId: string) => {
    if (!matter) return;
    await updateMatter({ ...matter, deadlines: deadlines.filter(d => d.id !== deadlineId) });
  };

  const sorted = [...deadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <PanelShell
      icon={Clock}
      title="Deadlines"
      description="Track filing deadlines, hearings, and key dates"
      actions={
        <ExportButton
          content={sorted.map(d => `- [${d.done ? "x" : " "}] **${d.dueDate}** — ${d.title} (${d.priority} priority)`).join("\n")}
          filename={`deadlines-${matter?.title ?? id}`}
          format="markdown"
          label="Export"
        />
      }
    >
      {/* Add form */}
      <div className="lex-card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Deadline title…"
            className="lex-input"
            style={{ flex: "1 1 200px" }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="lex-input"
            style={{ flex: "0 0 auto", width: "auto" }}
          />
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as "high" | "medium" | "low")}
            className="lex-select"
            style={{ flex: "0 0 auto", width: "auto" }}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={addDeadline}
            disabled={!title.trim() || !dueDate}
            className="lex-btn lex-btn--primary"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {/* Deadlines list */}
      {sorted.length === 0 ? (
        <div className="lex-empty">
          <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
            <Clock size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">No deadlines yet</p>
          <p className="lex-empty__body">Add your first deadline above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(deadline => {
            const isOverdue = !deadline.done && deadline.dueDate < today;
            return (
              <div
                key={deadline.id}
                className="lex-card flex items-center gap-3"
                style={{
                  borderColor: isOverdue ? "rgba(255,51,85,0.3)" : "var(--border-hair)",
                  opacity: deadline.done ? 0.6 : 1,
                }}
              >
                <button
                  onClick={() => toggleDone(deadline.id)}
                  className="lex-btn lex-btn--icon lex-btn--ghost"
                  style={{ flexShrink: 0, color: deadline.done ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}
                >
                  {deadline.done ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: isOverdue ? "var(--verdict-crimson)" : "var(--fg-primary)",
                        textDecoration: deadline.done ? "line-through" : "none",
                      }}
                    >
                      {deadline.title}
                    </span>
                    <span className={`lex-chip lex-chip--${PRIORITY_KIND[deadline.priority] ?? "neutral"}`}>
                      {deadline.priority}
                    </span>
                    {isOverdue && (
                      <span className="lex-chip lex-chip--crimson">Overdue</span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] mt-0.5" style={{ color: isOverdue ? "var(--verdict-crimson)" : "var(--fg-tertiary)" }}>
                    Due: {new Date(deadline.dueDate + "T12:00:00").toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteDeadline(deadline.id)}
                  className="lex-btn lex-btn--icon lex-btn--ghost"
                  style={{ flexShrink: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
