"use client";

import { useState } from "react";
import { Clock, Plus, Trash2, CheckSquare, Square, Calculator, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";
import { anthropicFetch } from "@/lib/api";
import { useSettings } from "@/providers/settings-provider";

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

  const { settings } = useSettings();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [showCalc, setShowCalc] = useState(false);
  const [calcEvent, setCalcEvent] = useState("");
  const [calcJurisdiction, setCalcJurisdiction] = useState(matter?.jurisdiction ?? "");
  const [calcTriggerDate, setCalcTriggerDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResults, setCalcResults] = useState<string | null>(null);

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

  const calculateDeadlines = async () => {
    if (!calcEvent.trim() || calcLoading) return;
    setCalcLoading(true);
    const prompt = `Calculate all procedural deadlines for the following legal event.\n\nEvent: ${calcEvent}\nTrigger Date: ${calcTriggerDate}\nJurisdiction: ${calcJurisdiction || "federal"}\nMatter Type: ${matter?.caseType ?? "civil"}\n\nFor each deadline output exactly:\nDEADLINE: [title] | DUE: [YYYY-MM-DD] | RULE: [rule citation] | PRIORITY: [high/medium/low]\n\nInclude: answer deadlines, reply deadlines, discovery cutoffs, motion deadlines, pretrial deadlines. Use Fed. R. Civ. P. and local rules where applicable. Compute exact dates.`;
    try {
      const res = await anthropicFetch(
        { model: settings.model, max_tokens: 1000, system: "You are a precise legal deadline calculator. Output deadlines in the exact format requested.", messages: [{ role: "user", content: prompt }] },
        undefined, {}
      );
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      setCalcResults(data.content?.[0]?.text ?? "No deadlines generated.");
    } catch (e) {
      setCalcResults(`Error: ${(e as Error).message}`);
    } finally {
      setCalcLoading(false);
    }
  };

  const addComputedDeadlines = () => {
    if (!matter || !calcResults) return;
    const newDeadlines: Deadline[] = calcResults
      .split("\n")
      .filter(l => l.includes("DEADLINE:") && l.includes("DUE:"))
      .map(l => {
        const titleM = l.match(/DEADLINE:\s*([^|]+)/);
        const dueM = l.match(/DUE:\s*(\d{4}-\d{2}-\d{2})/);
        const priM = l.match(/PRIORITY:\s*(high|medium|low)/i);
        return {
          id: crypto.randomUUID(),
          title: titleM?.[1]?.trim() ?? "Deadline",
          dueDate: dueM?.[1] ?? today,
          priority: ((priM?.[1]?.toLowerCase() ?? "medium") as "high" | "medium" | "low"),
          done: false,
          createdAt: Date.now(),
        };
      })
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate));
    if (newDeadlines.length > 0) {
      updateMatter({ ...matter, deadlines: [...deadlines, ...newDeadlines] });
    }
    setCalcResults(null);
    setShowCalc(false);
  };

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
      {/* AI Deadline Calculator */}
      <div className="mb-5">
        <button
          onClick={() => setShowCalc(p => !p)}
          className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] uppercase"
          style={{ color: "var(--fg-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <Calculator size={11} />
          AI Deadline Calculator
          {showCalc ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {showCalc && (
          <div className="mt-3 lex-card space-y-3">
            <p className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              Compute deadlines from a trigger event
            </p>
            <div className="flex flex-wrap gap-3">
              <select
                value={calcEvent}
                onChange={e => setCalcEvent(e.target.value)}
                className="lex-select"
                style={{ flex: "1 1 180px" }}
              >
                <option value="">Select trigger event…</option>
                <option value="Complaint filed">Complaint filed</option>
                <option value="Answer filed">Answer filed</option>
                <option value="Motion to dismiss filed">Motion to dismiss filed</option>
                <option value="Motion for summary judgment filed">MSJ filed</option>
                <option value="Notice of appeal filed">Notice of appeal filed</option>
                <option value="Discovery opened">Discovery opened</option>
                <option value="Scheduling order issued">Scheduling order issued</option>
                <option value="Trial date set">Trial date set</option>
              </select>
              <input
                type="date"
                value={calcTriggerDate}
                onChange={e => setCalcTriggerDate(e.target.value)}
                className="lex-input"
                style={{ flex: "0 0 auto", width: "auto" }}
              />
              <input
                type="text"
                value={calcJurisdiction}
                onChange={e => setCalcJurisdiction(e.target.value)}
                placeholder="Jurisdiction (e.g. S.D.N.Y.)"
                className="lex-input"
                style={{ flex: "1 1 160px" }}
              />
              <button
                onClick={calculateDeadlines}
                disabled={!calcEvent || calcLoading}
                className="lex-btn lex-btn--primary"
              >
                {calcLoading ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
                {calcLoading ? "Calculating…" : "Calculate"}
              </button>
            </div>
            {calcResults && (
              <div>
                <div
                  className="rounded p-3 text-xs font-mono whitespace-pre-wrap mb-3"
                  style={{ background: "rgba(0,0,0,0.4)", color: "var(--fg-secondary)", maxHeight: 200, overflowY: "auto" }}
                >
                  {calcResults}
                </div>
                <div className="flex gap-2">
                  <button onClick={addComputedDeadlines} className="lex-btn lex-btn--primary">
                    <Plus size={12} />
                    Add to Matter
                  </button>
                  <button onClick={() => setCalcResults(null)} className="lex-btn lex-btn--secondary">
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
