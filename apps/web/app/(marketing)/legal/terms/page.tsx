import Link from "next/link";
import { Scale } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen py-20 px-6" style={{ background: "var(--midnight-court)" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <Scale size={16} style={{ color: "var(--verdict-neon)" }} />
          <span className="font-serif text-sm" style={{ color: "var(--fg-tertiary)" }}>LexAgent</span>
        </Link>
        <h1 className="font-serif text-3xl font-semibold mb-6" style={{ color: "var(--fg-primary)" }}>Terms of Service</h1>
        <div className="space-y-6 text-[14px]" style={{ color: "var(--fg-tertiary)", lineHeight: 1.75 }}>
          <p>These terms of service are being updated. Please check back shortly, or contact us at <a href="mailto:support@lexagent.io" style={{ color: "var(--verdict-neon)" }}>support@lexagent.io</a> with any questions.</p>
          <p>By using LexAgent you agree that AI-generated content is for research assistance only and does not constitute legal advice. You remain responsible for all legal filings and professional obligations.</p>
        </div>
      </div>
    </main>
  );
}
