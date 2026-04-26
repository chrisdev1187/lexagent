"use client";

import { useState } from "react";
import { MessageSquare, Bug, Lightbulb, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";

type FeedbackType = "bug" | "feature" | "general";
type Priority = "low" | "normal" | "high" | "critical";

const TABS: { id: FeedbackType; icon: React.ElementType; label: string; desc: string }[] = [
  { id: "bug",     icon: Bug,          label: "Bug Report",       desc: "Something isn't working as expected" },
  { id: "feature", icon: Lightbulb,    label: "Feature Request",  desc: "Suggest an improvement or new capability" },
  { id: "general", icon: MessageSquare, label: "General Feedback", desc: "Share your thoughts about the platform" },
];

const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: "low",      label: "Low",      color: "var(--fg-tertiary)"    },
  { id: "normal",   label: "Normal",   color: "var(--fg-secondary)"   },
  { id: "high",     label: "High",     color: "var(--verdict-amber)"  },
  { id: "critical", label: "Critical", color: "var(--verdict-crimson)" },
];

const inputCls = "w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all";
const inputStyle = {
  background: "var(--bg-raised)",
  border: "0.5px solid rgba(224,224,224,0.09)",
  color: "var(--fg-primary)",
  outline: "none",
} as const;

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: "var(--fg-tertiary)" }}>{label}</label>
        {tooltip && <span className="text-xs" style={{ color: "var(--fg-quaternary)" }}>— {tooltip}</span>}
      </div>
      {children}
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeType, setActiveType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setTitle(""); setBody(""); setSteps(""); setExpected(""); setActual("");
    setPriority("normal"); setRating(0); setSubmitted(false);
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setSubmitting(true);

    const fullBody = activeType === "bug"
      ? [
          body,
          steps ? `\n**Steps to reproduce:**\n${steps}` : "",
          expected ? `\n**Expected:** ${expected}` : "",
          actual ? `\n**Actual:** ${actual}` : "",
        ].filter(Boolean).join("")
      : body;

    const { error } = await supabase.from("feedback").insert({
      user_id: user?.id ?? null,
      type: activeType,
      title: title.trim(),
      body: fullBody.trim(),
      priority,
      rating: activeType === "general" && rating > 0 ? rating : null,
      metadata: {
        url: typeof window !== "undefined" ? window.location.href : "",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        user_email: user?.email ?? null,
        submitted_at: new Date().toISOString(),
      },
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit. Please try again.");
    } else {
      setSubmitted(true);
      toast.success("Feedback submitted — thank you!");
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ padding: "32px 32px 48px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }} className="flex flex-col items-center justify-center py-24 text-center gap-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,255,195,0.08)", border: "0.5px solid rgba(0,255,195,0.3)" }}
          >
            <MessageSquare size={24} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <div>
            <h2 className="text-xl font-serif mb-2" style={{ color: "var(--fg-primary)" }}>Feedback received</h2>
            <p className="text-sm" style={{ color: "var(--fg-tertiary)" }}>
              Your submission has been logged. Our team reviews all feedback and will follow up when applicable.
            </p>
          </div>
          <button onClick={reset} className="lex-btn lex-btn--secondary">Submit another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: "32px 32px 48px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div className="fade-in mb-10">
          <p className="lex-page-eyebrow">Support</p>
          <h1 className="lex-page-title">Feedback</h1>
          <p className="lex-page-subtitle">Report bugs, request features, or share your thoughts.</p>
        </div>

        {/* Type tabs */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {TABS.map(({ id, icon: Icon, label, desc }) => {
            const active = activeType === id;
            return (
              <button
                key={id}
                onClick={() => setActiveType(id)}
                className="flex flex-col items-start gap-2 rounded-lg p-4 text-left cursor-pointer transition-all duration-150"
                style={{
                  background: active ? "rgba(0,255,195,0.06)" : "rgba(17,17,20,0.8)",
                  border: `0.5px solid ${active ? "rgba(0,255,195,0.3)" : "rgba(224,224,224,0.09)"}`,
                  boxShadow: active ? "0 0 16px rgba(0,255,195,0.06)" : "none",
                }}
              >
                <Icon size={16} style={{ color: active ? "var(--verdict-neon)" : "var(--fg-tertiary)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: active ? "var(--fg-primary)" : "var(--fg-secondary)" }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fg-quaternary)" }}>{desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="rounded-xl" style={{ background: "rgba(14,14,18,0.85)", border: "0.5px solid rgba(224,224,224,0.09)", padding: "28px 28px 24px" }}>

          <Field label="Title">
            <input
              className={inputCls}
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                activeType === "bug" ? "e.g., Research tab crashes when matter has no client" :
                activeType === "feature" ? "e.g., Export research as Word document" :
                "e.g., Love the AI research speed"
              }
            />
          </Field>

          {activeType === "bug" && (
            <>
              <Field label="Description" tooltip="What were you doing?">
                <textarea
                  className={inputCls}
                  style={{ ...inputStyle, resize: "none", minHeight: 80 }}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Describe what happened..."
                />
              </Field>
              <Field label="Steps to reproduce" tooltip="optional">
                <textarea
                  className={inputCls}
                  style={{ ...inputStyle, resize: "none", minHeight: 72 }}
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  placeholder={"1. Open matter\n2. Click Research\n3. …"}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Expected behaviour">
                  <input className={inputCls} style={inputStyle} value={expected} onChange={e => setExpected(e.target.value)} placeholder="It should..." />
                </Field>
                <Field label="Actual behaviour">
                  <input className={inputCls} style={inputStyle} value={actual} onChange={e => setActual(e.target.value)} placeholder="Instead it..." />
                </Field>
              </div>
              <Field label="Severity">
                <div className="flex gap-2 flex-wrap">
                  {PRIORITIES.map(({ id, label, color }) => (
                    <button
                      key={id}
                      onClick={() => setPriority(id)}
                      className="px-3 py-1.5 rounded text-xs font-mono tracking-wide cursor-pointer transition-all"
                      style={{
                        background: priority === id ? "rgba(0,255,195,0.05)" : "var(--bg-raised)",
                        border: `0.5px solid ${priority === id ? color : "rgba(224,224,224,0.09)"}`,
                        color: priority === id ? color : "var(--fg-tertiary)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {activeType === "feature" && (
            <>
              <Field label="Description">
                <textarea
                  className={inputCls}
                  style={{ ...inputStyle, resize: "none", minHeight: 100 }}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Describe the feature you'd like to see..."
                />
              </Field>
              <Field label="Problem it solves" tooltip="optional">
                <textarea
                  className={inputCls}
                  style={{ ...inputStyle, resize: "none", minHeight: 72 }}
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  placeholder="What workflow pain does this address?"
                />
              </Field>
            </>
          )}

          {activeType === "general" && (
            <>
              <Field label="Your feedback">
                <textarea
                  className={inputCls}
                  style={{ ...inputStyle, resize: "none", minHeight: 120 }}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Share your thoughts about LexAgent..."
                />
              </Field>
              <Field label="Rating" tooltip="optional">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRating(n === rating ? 0 : n)}
                      onMouseEnter={() => setHoveredStar(n)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="cursor-pointer transition-all"
                      style={{ background: "none", border: "none", padding: 2 }}
                    >
                      <Star
                        size={22}
                        fill={(hoveredStar || rating) >= n ? "var(--verdict-amber)" : "none"}
                        style={{ color: (hoveredStar || rating) >= n ? "var(--verdict-amber)" : "rgba(224,224,224,0.18)" }}
                      />
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
            <p className="text-xs" style={{ color: "var(--fg-quaternary)" }}>
              Submitted as {user?.email ?? "anonymous"}
            </p>
            <button
              onClick={submit}
              disabled={submitting || !title.trim() || !body.trim()}
              className="lex-btn lex-btn--primary"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
