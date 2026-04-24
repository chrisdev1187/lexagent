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

        <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>
          Terms of Service
        </h1>
        <p className="text-xs mb-10" style={{ color: "var(--fg-tertiary)" }}>Effective 24 April 2026</p>

        <div className="space-y-8 text-[14px]" style={{ color: "var(--fg-secondary)", lineHeight: 1.75 }}>
          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>1. Acceptance</h2>
            <p>By creating an account or using LexAgent you agree to these Terms. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>2. Service description</h2>
            <p>LexAgent provides AI-assisted legal research, document drafting, and matter management tools. The service is provided &ldquo;as-is&rdquo; and is intended for qualified legal professionals. Output from LexAgent is for research assistance only and <strong>does not constitute legal advice</strong>. You remain solely responsible for all legal filings, professional obligations, and client outcomes.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>3. Eligibility</h2>
            <p>You must be at least 18 years old and legally able to enter contracts. By using LexAgent you represent that you meet these requirements.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>4. Subscriptions and billing</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Subscriptions are billed monthly in advance via Lemon Squeezy.</li>
              <li>You may cancel at any time; cancellation takes effect at period end, no pro-rata refunds.</li>
              <li>We may change pricing with 30 days&rsquo; notice. Continued use after notice constitutes acceptance.</li>
              <li>AI usage budgets are monthly; unused budget does not roll over.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>5. Acceptable use</h2>
            <p>You must not:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use LexAgent to generate fraudulent legal documents or assist in illegal activity.</li>
              <li>Attempt to reverse-engineer, scrape, or overload our APIs.</li>
              <li>Share account credentials or resell access.</li>
              <li>Upload content that violates third-party intellectual property or privacy rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>6. Intellectual property</h2>
            <p>You retain ownership of all matter data and documents you create. LexAgent retains ownership of the platform, models, and underlying code. You grant us a limited licence to process your data to provide the service.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>7. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, LexAgent is not liable for any indirect, incidental, or consequential damages arising from use of the service, including reliance on AI-generated output. Our total liability is limited to the amount you paid in the 3 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>8. Termination</h2>
            <p>We may suspend or terminate accounts that violate these Terms, are involved in fraud, or remain unpaid. You may delete your account at any time from Settings.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>9. Governing law</h2>
            <p>These Terms are governed by the laws of South Africa. Disputes are subject to the jurisdiction of the South Gauteng High Court.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>10. Changes</h2>
            <p>We may update these Terms. Material changes are notified by email or in-app notice at least 14 days in advance. Continued use after the effective date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>11. Contact</h2>
            <p>Questions: <a href="mailto:support@lexagent.io" style={{ color: "var(--verdict-neon)" }}>support@lexagent.io</a></p>
          </section>
        </div>
      </div>
    </main>
  );
}
