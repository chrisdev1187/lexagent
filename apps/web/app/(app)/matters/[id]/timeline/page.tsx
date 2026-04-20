"use client";

import { useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
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
  discovery: "#0ea5e9",
  deposition: "var(--text-sub)",
  order: "var(--verdict-crimson)",
  settlement: "var(--verdict-neon)",
  other: "var(--text-muted)",
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
      icon={CalendarDays}
      title="Case Timeline"
      description="Visual chronology of case events and milestones"
    >
      {/* Add form */}
      <div
        className="rounded p-4 mb-8"
        style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
      >
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ ...inputStyle, flex: "0 0 auto" }}
          />
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event title…"
            style={{ ...inputStyle, flex: "1 1 180px" }}
          />
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value as TimelineEvent["eventType"])}
            style={{ ...inputStyle, flex: "0 0 auto" }}
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
            style={{ ...inputStyle, flex: "1 1 auto" }}
          />
          <button
            onClick={addEvent}
            disabled={!date || !title.trim()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0"
            style={{
              background: date && title.trim()
                ? "var(--verdict-neon)"
                : "var(--panel2)",
              color: date && title.trim() ? "var(--midnight-court)" : "var(--text-muted)",
              border: "none",
              cursor: date && title.trim() ? "pointer" : "default",
            }}
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-12 h-12 rounded flex items-center justify-center mb-3"
            style={{ background: "rgba(0,255,195,0.06)", border: "1px solid rgba(0,255,195,0.28)" }}
          >
            <CalendarDays size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>No events yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add your first timeline event above</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-3 top-0 bottom-0 w-px"
            style={{ background: "var(--border)" }}
          />
          <div className="space-y-6 pl-10">
            {sorted.map(event => (
              <div key={event.id} className="relative">
                {/* Dot */}
                <div
                  className="absolute -left-7 top-1 w-3 h-3 rounded-full border-2"
                  style={{
                    background: TYPE_COLORS[event.eventType],
                    borderColor: "var(--panel)",
                    boxShadow: `0 0 0 2px ${TYPE_COLORS[event.eventType]}44`,
                  }}
                />
                <div
                  className="rounded p-4"
                  style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${TYPE_COLORS[event.eventType]}22`,
                            color: TYPE_COLORS[event.eventType],
                            border: `1px solid ${TYPE_COLORS[event.eventType]}44`,
                          }}
                        >
                          {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(event.date + "T12:00:00").toLocaleDateString(undefined, {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{event.title}</p>
                      {event.description && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{event.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
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
