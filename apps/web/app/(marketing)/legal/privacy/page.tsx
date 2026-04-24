import Link from "next/link";
import { Scale } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen py-20 px-6" style={{ background: "var(--midnight-court)" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <Scale size={16} style={{ color: "var(--verdict-neon)" }} />
          <span className="font-serif text-sm" style={{ color: "var(--fg-tertiary)" }}>LexAgent</span>
        </Link>
        <h1 className="font-serif text-3xl font-semibold mb-6" style={{ color: "var(--fg-primary)" }}>Privacy Policy</h1>
        <div className="space-y-6 text-[14px]" style={{ color: "var(--fg-tertiary)", lineHeight: 1.75 }}>
          <p>This privacy policy is being updated. Please check back shortly, or contact us at <a href="mailto:support@lexagent.io" style={{ color: "var(--verdict-neon)" }}>support@lexagent.io</a> with any questions.</p>
          <p>LexAgent processes the minimum data necessary to provide AI-assisted legal research services. Your matter data is stored in your Supabase account and never shared with third parties for advertising.</p>
        </div>
      </div>
    </main>
  );
}
