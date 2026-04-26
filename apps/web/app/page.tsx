"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Scale, Shield, Brain, Search, BookOpen, Gavel,
  Clock, ChevronRight, Zap, Database, Users,
  CheckCircle2, ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Legal Research",
    desc: "Query 10 live legal databases simultaneously — CourtListener, SEC EDGAR, USPTO, Congress.gov, eCFR, and more. AI synthesises results into actionable analysis.",
    color: "var(--verdict-neon)",
    bg: "rgba(0,255,195,0.06)",
    border: "rgba(0,255,195,0.20)",
  },
  {
    icon: Shield,
    title: "Hallucination Shield",
    desc: "Every AI-generated citation is verified in real-time against CourtListener. Unconfirmed citations are flagged before they reach your brief.",
    color: "var(--verdict-violet)",
    bg: "rgba(106,0,255,0.08)",
    border: "rgba(106,0,255,0.25)",
  },
  {
    icon: Brain,
    title: "LexMemory",
    desc: "A 4-level knowledge hierarchy that remembers your case across sessions. Research feeds strategy feeds drafting — no re-explaining required.",
    color: "var(--verdict-neon)",
    bg: "rgba(0,255,195,0.06)",
    border: "rgba(0,255,195,0.20)",
  },
  {
    icon: Gavel,
    title: "Judge Intelligence",
    desc: "Profiles on 16,000+ federal and state judges — writing style, ruling tendencies, and oral argument preferences.",
    color: "var(--verdict-amber)",
    bg: "rgba(255,184,0,0.07)",
    border: "rgba(255,184,0,0.22)",
  },
  {
    icon: BookOpen,
    title: "Document Drafting",
    desc: "AI-assisted briefs, motions, demand letters, and contracts. Inline editing with version history and print export.",
    color: "var(--verdict-violet)",
    bg: "rgba(106,0,255,0.08)",
    border: "rgba(106,0,255,0.25)",
  },
  {
    icon: Clock,
    title: "Deadlines & Timeline",
    desc: "Statute of limitations calculator, deadline tracker, and visual timeline builder — with jurisdiction-aware rules.",
    color: "var(--verdict-amber)",
    bg: "rgba(255,184,0,0.07)",
    border: "rgba(255,184,0,0.22)",
  },
];

const STATS = [
  { value: "10+", label: "Legal databases", icon: Database },
  { value: "16K+", label: "Judge profiles", icon: Users },
  { value: "80%", label: "Token savings", icon: Zap },
];

const PLANS = [
  {
    name: "Starter",
    price: "$45",
    period: "/mo",
    budget: "$8 AI budget included",
    features: ["All AI research tools", "Citation verification", "1 user seat", "Email support"],
    highlight: false,
    tag: "",
  },
  {
    name: "Professional",
    price: "$95",
    period: "/mo",
    budget: "$20 AI budget included",
    features: ["Everything in Starter", "LexMemory across matters", "Judge intelligence", "Priority support"],
    highlight: true,
    tag: "Most popular",
  },
  {
    name: "Firm",
    price: "$200",
    period: "/mo",
    budget: "$35 AI budget included",
    features: ["Everything in Professional", "Up to 5 user seats", "Admin dashboard", "Dedicated support"],
    highlight: false,
    tag: "",
  },
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
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 sm:px-8"
        style={{
          height: 60,
          background: "rgba(5,5,7,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "0.5px solid rgba(224,224,224,0.07)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,195,0.14), rgba(106,0,255,0.14))",
              border: "0.5px solid rgba(0,255,195,0.28)",
            }}
          >
            <Scale size={14} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <span className="font-serif text-[15px] font-semibold tracking-tight" style={{ color: "var(--fg-primary)" }}>
            LexAgent
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/pricing"
            className="hidden sm:block font-mono text-[10px] tracking-[0.16em] uppercase cursor-pointer"
            style={{ color: "var(--fg-tertiary)", textDecoration: "none" }}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="lex-btn lex-btn--ghost cursor-pointer"
            style={{ fontSize: 11, minHeight: 36 }}
          >
            Log in
          </Link>
          <Link
            href="/login?tab=signup"
            className="lex-btn lex-btn--primary cursor-pointer"
            style={{ fontSize: 11, minHeight: 36 }}
          >
            Start free
            <ChevronRight size={12} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20 px-5 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-7"
            style={{
              background: "rgba(0,255,195,0.06)",
              border: "0.5px solid rgba(0,255,195,0.22)",
            }}
          >
            <Zap size={10} style={{ color: "var(--verdict-neon)" }} />
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--verdict-neon)" }}>
              Powered by Claude Sonnet 4.6
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              color: "var(--fg-primary)",
              marginBottom: 24,
            }}
          >
            Legal AI that works<br />
            <span style={{ color: "var(--verdict-neon)", textShadow: "0 0 40px rgba(0,255,195,0.25)" }}>
              like a senior associate
            </span>
          </h1>

          <p
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: "var(--fg-tertiary)",
              maxWidth: 480,
              margin: "0 auto 36px",
            }}
          >
            Research, strategy, drafting, and citation verification — in one platform that remembers your entire case.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link
              href="/login?tab=signup"
              className="lex-btn lex-btn--primary justify-center cursor-pointer"
              style={{ fontSize: 13, minHeight: 48, paddingLeft: 24, paddingRight: 24 }}
            >
              Start free — no credit card
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/pricing"
              className="lex-btn lex-btn--ghost justify-center cursor-pointer"
              style={{ fontSize: 13, minHeight: 48 }}
            >
              View plans
            </Link>
          </div>

          <p className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
            Free tier available · Cancel anytime
          </p>

          {/* Stats row */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-px mt-14 rounded-xl overflow-hidden mx-auto"
            style={{
              maxWidth: 520,
              border: "0.5px solid rgba(224,224,224,0.09)",
              background: "rgba(17,17,20,0.6)",
            }}
          >
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center justify-center py-5 px-4 w-full"
                style={{
                  borderRight: i < STATS.length - 1 ? "0.5px solid rgba(224,224,224,0.07)" : "none",
                }}
              >
                <Icon size={13} style={{ color: "var(--verdict-neon)", marginBottom: 8 }} />
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 26,
                    fontWeight: 600,
                    color: "var(--fg-primary)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1"
                  style={{ color: "var(--fg-quaternary)" }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-5 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--verdict-neon)" }}>
              What LexAgent does
            </p>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--fg-primary)",
              }}
            >
              Every tool you need. One intelligent workspace.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div
                key={title}
                className="rounded-xl p-6"
                style={{
                  background: "rgba(14,14,18,0.80)",
                  border: "0.5px solid rgba(224,224,224,0.09)",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = border;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,224,224,0.09)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: bg, border: `0.5px solid ${border}` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <h3
                  className="font-serif text-[15px] font-semibold mb-2"
                  style={{ color: "var(--fg-primary)" }}
                >
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
      <section className="py-20 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl p-10 sm:p-14 text-center relative overflow-hidden"
            style={{
              background: "rgba(0,255,195,0.03)",
              border: "0.5px solid rgba(0,255,195,0.18)",
            }}
          >
            {/* Glow orb */}
            <div
              style={{
                position: "absolute",
                top: -60,
                left: "50%",
                transform: "translateX(-50%)",
                width: 240,
                height: 240,
                background: "radial-gradient(ellipse, rgba(0,255,195,0.12) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
              style={{
                background: "linear-gradient(135deg, rgba(0,255,195,0.14), rgba(106,0,255,0.14))",
                border: "0.5px solid rgba(0,255,195,0.30)",
                boxShadow: "0 0 24px rgba(0,255,195,0.18)",
              }}
            >
              <Brain size={26} style={{ color: "var(--verdict-neon)" }} />
            </div>

            <h2
              className="font-serif font-semibold tracking-tight mb-4 relative"
              style={{ fontSize: "clamp(24px, 4vw, 36px)", color: "var(--fg-primary)" }}
            >
              The AI that remembers your cases
            </h2>
            <p
              className="relative max-w-2xl mx-auto mb-10"
              style={{ fontSize: 15, lineHeight: 1.7, color: "var(--fg-tertiary)" }}
            >
              LexMemory builds a 4-level knowledge hierarchy for every matter — raw transcripts, condensed episodes, verified authorities, and strategic themes. Each AI call draws from this memory, delivering better answers that get smarter over time.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-px rounded-xl overflow-hidden mx-auto relative"
              style={{
                maxWidth: 420,
                border: "0.5px solid rgba(0,255,195,0.14)",
                background: "rgba(0,255,195,0.04)",
              }}
            >
              {[
                { value: "60–80%", label: "Token savings" },
                { value: "4", label: "Memory levels" },
                { value: "∞", label: "Sessions retained" },
              ].map(({ value, label }, i) => (
                <div
                  key={label}
                  className="flex-1 py-5 px-4 text-center"
                  style={{
                    borderRight: i < 2 ? "0.5px solid rgba(0,255,195,0.10)" : "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 24,
                      fontWeight: 600,
                      color: "var(--verdict-neon)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {value}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--fg-quaternary)" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--verdict-neon)" }}>
            Simple pricing
          </p>
          <h2
            className="font-serif font-semibold tracking-tight mb-3"
            style={{ fontSize: "clamp(24px, 4vw, 36px)", color: "var(--fg-primary)" }}
          >
            Legal AI that pays for itself
          </h2>
          <p style={{ fontSize: 15, color: "var(--fg-tertiary)" }}>
            All plans include Claude Sonnet 4.6. Higher tiers unlock more AI budget and seats.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: plan.highlight ? "rgba(0,255,195,0.05)" : "rgba(14,14,18,0.80)",
                border: `0.5px solid ${plan.highlight ? "rgba(0,255,195,0.30)" : "rgba(224,224,224,0.09)"}`,
                boxShadow: plan.highlight ? "0 0 40px rgba(0,255,195,0.08)" : "none",
              }}
            >
              {plan.tag && (
                <p className="font-mono text-[9px] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--verdict-neon)" }}>
                  {plan.tag}
                </p>
              )}
              <h3
                className="font-serif text-lg font-semibold mb-1"
                style={{ color: plan.highlight ? "var(--verdict-neon)" : "var(--fg-primary)" }}
              >
                {plan.name}
              </h3>
              <div className="mb-1">
                <span
                  style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 600, color: "var(--fg-primary)", letterSpacing: "-0.02em" }}
                >
                  {plan.price}
                </span>
                <span className="font-mono text-[11px] ml-1" style={{ color: "var(--fg-quaternary)" }}>
                  {plan.period}
                </span>
              </div>
              <p className="font-mono text-[10px] tracking-[0.08em] mb-5" style={{ color: "var(--fg-quaternary)" }}>
                {plan.budget}
              </p>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--fg-secondary)" }}>
                    <CheckCircle2
                      size={12}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: plan.highlight ? "var(--verdict-neon)" : "var(--fg-quaternary)" }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="mt-6 lex-btn cursor-pointer justify-center"
                style={{
                  background: plan.highlight ? "var(--verdict-neon)" : "rgba(255,255,255,0.04)",
                  color: plan.highlight ? "var(--midnight-court)" : "var(--fg-secondary)",
                  border: plan.highlight ? "none" : "0.5px solid rgba(224,224,224,0.12)",
                  fontSize: 11,
                  fontWeight: plan.highlight ? 700 : 500,
                }}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="lex-btn lex-btn--ghost justify-center mx-auto cursor-pointer"
            style={{ fontSize: 12 }}
          >
            See full plan comparison
            <ChevronRight size={13} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 sm:px-6">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-12 sm:p-16 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(0,255,195,0.06) 0%, rgba(106,0,255,0.06) 100%)",
            border: "0.5px solid rgba(0,255,195,0.18)",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: -80,
              right: -80,
              width: 280,
              height: 280,
              background: "radial-gradient(ellipse, rgba(106,0,255,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -60,
              left: -60,
              width: 240,
              height: 240,
              background: "radial-gradient(ellipse, rgba(0,255,195,0.10) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase mb-4 relative" style={{ color: "var(--verdict-neon)" }}>
            Get started today
          </p>
          <h2
            className="font-serif font-semibold tracking-tight mb-4 relative"
            style={{ fontSize: "clamp(28px, 5vw, 48px)", color: "var(--fg-primary)", lineHeight: 1.1 }}
          >
            Ready to work smarter?
          </h2>
          <p className="mb-8 relative" style={{ fontSize: 15, color: "var(--fg-tertiary)" }}>
            Create your first matter in 60 seconds. No credit card required.
          </p>
          <Link
            href="/login?tab=signup"
            className="lex-btn lex-btn--primary justify-center mx-auto cursor-pointer relative"
            style={{ fontSize: 14, minHeight: 50, paddingLeft: 28, paddingRight: 28 }}
          >
            Get started free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: "0.5px solid rgba(224,224,224,0.07)" }}
      >
        <div className="flex items-center gap-2">
          <Scale size={13} style={{ color: "var(--verdict-neon)" }} />
          <span className="font-serif text-sm font-semibold" style={{ color: "var(--fg-tertiary)" }}>LexAgent</span>
        </div>
        <div className="flex items-center gap-5">
          {[
            { href: "/pricing", label: "Pricing" },
            { href: "/login", label: "Login" },
            { href: "/legal/privacy", label: "Privacy" },
            { href: "/legal/terms", label: "Terms" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-mono text-[10px] tracking-[0.14em] uppercase cursor-pointer"
              style={{ color: "var(--fg-quaternary)", textDecoration: "none" }}
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="font-mono text-[10px] tracking-[0.1em]" style={{ color: "var(--fg-quaternary)" }}>
          © 2026 LexAgent
        </p>
      </footer>
    </main>
  );
}
