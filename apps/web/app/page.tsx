"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Scale, Shield, Brain, Search, BookOpen, Gavel,
  Clock, Users, ChevronRight, Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Legal Research",
    desc: "Query 10 live legal databases simultaneously — CourtListener, SEC EDGAR, USPTO, Congress.gov, eCFR, and more. AI synthesises results into actionable analysis.",
  },
  {
    icon: Shield,
    title: "Hallucination Shield",
    desc: "Every AI-generated citation is verified in real-time against CourtListener. Unconfirmed citations are flagged before they reach your brief.",
  },
  {
    icon: Brain,
    title: "LexMemory",
    desc: "A 4-level knowledge hierarchy that remembers your case across sessions. Research feeds strategy feeds drafting — no re-explaining required.",
  },
  {
    icon: Gavel,
    title: "Judge Intelligence",
    desc: "Profiles on 16,000+ federal and state judges — writing style, ruling tendencies, and oral argument preferences.",
  },
  {
    icon: BookOpen,
    title: "Document Drafting",
    desc: "AI-assisted briefs, motions, demand letters, and contracts. Inline editing with version history and print export.",
  },
  {
    icon: Clock,
    title: "Deadlines & Timeline",
    desc: "Statute of limitations calculator, deadline tracker, and visual timeline builder — with jurisdiction-aware rules.",
  },
];

const PLANS = [
  { name: "Starter", price: "$45", period: "/mo", budget: "$8 AI budget", tag: "" },
  { name: "Professional", price: "$95", period: "/mo", budget: "$20 AI budget", tag: "Most popular", highlight: true },
  { name: "Firm", price: "$200", period: "/mo", budget: "$35 AI budget", tag: "" },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--midnight-court)" }}>
        <div
          className="h-5 w-5 rounded-full border animate-spin"
          style={{ borderColor: "var(--midnight-line)", borderTopColor: "var(--verdict-neon)" }}
        />
      </div>
    );
  }

  if (user) return null;

  return (
    <main className="min-h-screen" style={{ background: "var(--midnight-court)" }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(10,15,13,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "0.5px solid rgba(224,224,224,0.07)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Scale size={18} style={{ color: "var(--verdict-neon)" }} />
          <span className="font-serif text-base font-semibold tracking-tight" style={{ color: "var(--fg-primary)" }}>
            LexAgent
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Pricing
          </Link>
          <Link href="/login" className="lex-btn lex-btn--ghost" style={{ fontSize: 11 }}>
            Log in
          </Link>
          <Link href="/login?tab=signup" className="lex-btn lex-btn--primary" style={{ fontSize: 11 }}>
            Start free
            <ChevronRight size={12} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6"
            style={{
              background: "rgba(0,255,195,0.06)",
              border: "0.5px solid rgba(0,255,195,0.22)",
            }}
          >
            <Zap size={11} style={{ color: "var(--verdict-neon)" }} />
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--verdict-neon)" }}>
              Powered by Claude Sonnet 4.6
            </span>
          </div>
          <h1
            className="font-serif text-5xl sm:text-6xl font-semibold tracking-tight mb-6 leading-tight"
            style={{ color: "var(--fg-primary)" }}
          >
            Legal AI that works<br />
            <span style={{ color: "var(--verdict-neon)" }}>like a senior associate</span>
          </h1>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "var(--fg-tertiary)" }}>
            Research, strategy, drafting, and citation verification — in one platform that remembers your entire case.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?tab=signup" className="lex-btn lex-btn--primary justify-center" style={{ fontSize: 13 }}>
              Start free — no credit card
              <ChevronRight size={14} />
            </Link>
            <Link href="/pricing" className="lex-btn lex-btn--ghost justify-center" style={{ fontSize: 13 }}>
              View plans
            </Link>
          </div>
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase mt-4" style={{ color: "var(--fg-quaternary)" }}>
            Free tier · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--verdict-neon)" }}>
              What LexAgent does
            </p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight" style={{ color: "var(--fg-primary)" }}>
              Every tool you need. One intelligent workspace.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded p-5"
                style={{
                  background: "rgba(17,17,20,0.7)",
                  border: "0.5px solid rgba(224,224,224,0.09)",
                }}
              >
                <div
                  className="w-9 h-9 rounded flex items-center justify-center mb-4"
                  style={{
                    background: "rgba(0,255,195,0.07)",
                    border: "0.5px solid rgba(0,255,195,0.22)",
                  }}
                >
                  <Icon size={16} style={{ color: "var(--verdict-neon)" }} />
                </div>
                <h3 className="font-serif text-base font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>
                  {title}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--fg-tertiary)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LexMemory callout */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded p-10 text-center"
            style={{
              background: "rgba(0,255,195,0.04)",
              border: "0.5px solid rgba(0,255,195,0.18)",
              boxShadow: "0 0 60px rgba(0,255,195,0.04)",
            }}
          >
            <Brain size={32} className="mx-auto mb-5" style={{ color: "var(--verdict-neon)" }} />
            <h2 className="font-serif text-3xl font-semibold tracking-tight mb-4" style={{ color: "var(--fg-primary)" }}>
              The AI that remembers your cases
            </h2>
            <p className="text-[15px] max-w-2xl mx-auto mb-6" style={{ color: "var(--fg-tertiary)" }}>
              LexMemory builds a 4-level knowledge hierarchy for every matter — raw transcripts, condensed episodes, verified authorities, and strategic themes. Each AI call draws from this memory, delivering better answers that get smarter over time.
            </p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {[
                { label: "Token savings", value: "60–80%" },
                { label: "Memory levels", value: "4" },
                { label: "Persisted in", value: "Supabase" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="font-serif text-3xl font-semibold" style={{ color: "var(--verdict-neon)" }}>{value}</div>
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--verdict-neon)" }}>
            Simple pricing
          </p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight mb-3" style={{ color: "var(--fg-primary)" }}>
            Legal AI that pays for itself
          </h2>
          <p style={{ color: "var(--fg-tertiary)" }}>
            All plans include the same frontier model — Claude Sonnet 4.6. Higher tiers unlock more AI budget and seats.
          </p>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className="rounded p-6 text-center"
              style={{
                background: plan.highlight ? "rgba(0,255,195,0.05)" : "rgba(17,17,20,0.7)",
                border: `0.5px solid ${plan.highlight ? "rgba(0,255,195,0.30)" : "rgba(224,224,224,0.09)"}`,
              }}
            >
              {plan.tag && (
                <p className="font-mono text-[9px] tracking-[0.16em] uppercase mb-2" style={{ color: "var(--verdict-neon)" }}>
                  {plan.tag}
                </p>
              )}
              <h3 className="font-serif text-xl font-semibold mb-1" style={{ color: plan.highlight ? "var(--verdict-neon)" : "var(--fg-primary)" }}>
                {plan.name}
              </h3>
              <p className="font-serif text-3xl font-semibold mb-1" style={{ color: "var(--fg-primary)" }}>
                {plan.price}
                <span className="text-sm font-normal ml-0.5" style={{ color: "var(--fg-quaternary)" }}>{plan.period}</span>
              </p>
              <p className="font-mono text-[10px] tracking-[0.08em]" style={{ color: "var(--fg-quaternary)" }}>
                {plan.budget}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/pricing" className="lex-btn lex-btn--secondary justify-center mx-auto">
            See full pricing
            <ChevronRight size={13} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-4xl font-semibold tracking-tight mb-4" style={{ color: "var(--fg-primary)" }}>
            Ready to work smarter?
          </h2>
          <p className="mb-8" style={{ color: "var(--fg-tertiary)" }}>
            Create your first matter in 60 seconds. No credit card required.
          </p>
          <Link href="/login?tab=signup" className="lex-btn lex-btn--primary justify-center mx-auto" style={{ fontSize: 14 }}>
            Get started free
            <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: "0.5px solid rgba(224,224,224,0.07)" }}
      >
        <div className="flex items-center gap-2">
          <Scale size={14} style={{ color: "var(--verdict-neon)" }} />
          <span className="font-serif text-sm" style={{ color: "var(--fg-tertiary)" }}>LexAgent</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/pricing" className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            Pricing
          </Link>
          <Link href="/login" className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            Login
          </Link>
          <Link href="/legal/privacy" className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            Privacy
          </Link>
          <Link href="/legal/terms" className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            Terms
          </Link>
        </div>
        <p className="font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
          © 2026 LexAgent
        </p>
      </footer>
    </main>
  );
}
