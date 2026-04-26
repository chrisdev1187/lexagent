"use client";

import { useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  eventType: "filing" | "hearing" | "discovery" | "deposition" | "order" | "settlement" | "other";
  createdAt: number;
}

const EVENT_TYPES: TimelineEvent["eventType"][] = [
  "filing", "hearing", "discovery", "deposition", "order", "settlement", "other",
];

const TYPE_COLORS: Record<TimelineEvent["eventType"], string> = {
  filing: "var(--verdict-neon)",
  hearing: "var(--verdict-amber)",
  discovery: "var(--verdict-violet)",
  deposition: "var(--fg-secondary)",
  order: "var(--verdict-crimson)",
  settlement: "var(--verdict-neon)",
  other: "var(--fg-tertiary)",
};

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);

  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<TimelineEvent["eventType"]>("filing");

  const events = (matter?.timelineEvents as unknown as TimelineEvent[]) ?? [];

  const addEvent = async () => {
    if (!date || !title.trim() || !matter) return;
    const newEvent: TimelineEvent = {
      id: crypto.randomUUID(),
      date,
      title: title.trim(),
      description: description.trim() || undefined,
      eventType,
      createdAt: Date.now(),
    };
    await updateMatter({ ...matter, timelineEvents: [...events, newEvent] });
    setDate("");
    setTitle("");
    setDescription("");
    setEventType("filing");
  };

  const deleteEvent = async (eventId: string) => {
    if (!matter) return;
    await updateMatter({ ...matter, timelineEvents: events.filter(e => e.id !== eventId) });
  };

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PanelShell
      icon={CalendarDays}
      title="Case timeline"
      description="Visual chronology of case events and milestones"
      actions={
        <ExportButton
          content={sorted.map(e => `**${e.date}** — ${e.eventType.toUpperCase()}: ${e.title}${e.description ? `\n${e.description}` : ""}`).join("\n\n")}
          filename={`timeline-${matter?.title ?? id}`}
          format="markdown"
          label="Export"
        />
      }
    >
      {/* Add form */}
      <div className="lex-card mb-8">
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="lex-input"
            style={{ flex: "0 0 auto", width: "auto" }}
          />
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event title…"
            className="lex-input"
            style={{ flex: "1 1 180px" }}
          />
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value as TimelineEvent["eventType"])}
            className="lex-select"
            style={{ flex: "0 0 auto", width: "auto" }}
          >
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)…"
            className="lex-input"
            style={{ flex: "1 1 auto" }}
          />
          <button
            onClick={addEvent}
            disabled={!date || !title.trim()}
            className="lex-btn lex-btn--primary"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="lex-empty">
          <div className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}>
            <CalendarDays size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">No events yet</p>
          <p className="lex-empty__body">Add your first timeline event above</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-3 top-0 bottom-0 w-px"
            style={{ background: "var(--border-line)" }}
          />
          <div className="space-y-6 pl-10">
            {sorted.map(event => (
              <div key={event.id} className="relative">
                {/* Dot */}
                <div
                  className="absolute -left-7 top-1 w-3 h-3 rounded-full"
                  style={{
                    background: TYPE_COLORS[event.eventType],
                    border: "2px solid var(--bg-panel)",
                    boxShadow: `0 0 0 2px ${TYPE_COLORS[event.eventType]}44`,
                  }}
                />
                <div className="lex-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="lex-chip"
                          style={{
                            background: `${TYPE_COLORS[event.eventType]}22`,
                            color: TYPE_COLORS[event.eventType],
                            borderColor: `${TYPE_COLORS[event.eventType]}44`,
                          }}
                        >
                          {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                          {new Date(event.date + "T12:00:00").toLocaleDateString(undefined, {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{event.title}</p>
                      {event.description && (
                        <p className="text-xs mt-1" style={{ color: "var(--fg-tertiary)" }}>{event.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="lex-btn lex-btn--icon lex-btn--ghost"
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}
