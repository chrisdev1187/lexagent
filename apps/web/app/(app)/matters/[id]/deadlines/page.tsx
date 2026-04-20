"use client";

import { useState } from "react";
import { Clock, Plus, Trash2, CheckSquare, Square } from "lucide-react";
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

  const inputStyle = {
    background: "var(--panel2)",
    color: "var(--text)",
    border: "0.5px solid rgba(224,224,224,0.09)",
    borderRadius: "8px",
    outline: "none",
    fontSize: "0.75rem",
    padding: "6px 12px",
  };

  return (
    <PanelShell
      icon={Clock}
      title="Deadlines"
      description="Track filing deadlines, hearings, and key dates"
    >
      {/* Add form */}
      <div
        className="rounded p-4 mb-6"
        style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Deadline title…"
            style={{ ...inputStyle, flex: "1 1 200px" }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ ...inputStyle, flex: "0 0 auto" }}
          />
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as "high" | "medium" | "low")}
            style={{ ...inputStyle, flex: "0 0 auto" }}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={addDeadline}
            disabled={!title.trim() || !dueDate}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: title.trim() && dueDate
                ? "var(--verdict-neon)"
                : "var(--panel2)",
              color: title.trim() && dueDate ? "var(--midnight-court)" : "var(--text-muted)",
              border: "none",
              cursor: title.trim() && dueDate ? "pointer" : "default",
            }}
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {/* Deadlines list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-12 h-12 rounded flex items-center justify-center mb-3"
            style={{ background: "rgba(0,255,195,0.06)", border: "1px solid rgba(0,255,195,0.28)" }}
          >
            <Clock size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>No deadlines yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add your first deadline above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(deadline => {
            const isOverdue = !deadline.done && deadline.dueDate < today;
            return (
              <div
                key={deadline.id}
                className="rounded px-4 py-3 flex items-center gap-3"
                style={{
                  background: "rgba(17,17,20,0.7)",
                  border: `1px solid ${isOverdue ? "rgba(220,38,38,0.3)" : "var(--border)"}`,
                  opacity: deadline.done ? 0.6 : 1,
                }}
              >
                <button
                  onClick={() => toggleDone(deadline.id)}
                  style={{ color: deadline.done ? "var(--verdict-neon)" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                >
                  {deadline.done ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: isOverdue ? "var(--verdict-crimson)" : "var(--text)",
                        textDecoration: deadline.done ? "line-through" : "none",
                      }}
                    >
                      {deadline.title}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${PRIORITY_COLORS[deadline.priority]}22`,
                        color: PRIORITY_COLORS[deadline.priority],
                        border: `1px solid ${PRIORITY_COLORS[deadline.priority]}44`,
                      }}
                    >
                      {deadline.priority}
                    </span>
                    {isOverdue && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "rgba(220,38,38,0.12)",
                          color: "var(--verdict-crimson)",
                          border: "1px solid rgba(220,38,38,0.3)",
                        }}
                      >
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: isOverdue ? "var(--verdict-crimson)" : "var(--text-muted)" }}>
                    Due: {new Date(deadline.dueDate + "T12:00:00").toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteDeadline(deadline.id)}
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
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
