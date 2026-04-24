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

        <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>
          Privacy Policy
        </h1>
        <p className="text-xs mb-10" style={{ color: "var(--fg-tertiary)" }}>Effective 24 April 2026</p>

        <div className="space-y-8 text-[14px]" style={{ color: "var(--fg-secondary)", lineHeight: 1.75 }}>
          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>1. Who we are</h2>
            <p>LexAgent is operated by Christiaan Bothma (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;). You can reach us at <a href="mailto:support@lexagent.io" style={{ color: "var(--verdict-neon)" }}>support@lexagent.io</a>. We provide AI-assisted legal research software.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>2. Data we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data</strong> — email address, hashed password (managed by Supabase Auth).</li>
              <li><strong>Matter data</strong> — case titles, facts, AI conversation history, uploaded documents. Stored in your Supabase project.</li>
              <li><strong>Usage data</strong> — AI token counts, tool invocations, monthly spend totals. Used solely for quota enforcement and billing.</li>
              <li><strong>Payment data</strong> — handled entirely by Lemon Squeezy. We never store card numbers.</li>
              <li><strong>Technical logs</strong> — API request logs (IP, method, path, status) retained for 30 days for debugging and security.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>3. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, maintain, and improve the LexAgent service.</li>
              <li>Enforce subscription quotas and process billing via Lemon Squeezy.</li>
              <li>Send transactional emails (password reset, invoice receipts). No marketing email without consent.</li>
              <li>Diagnose errors and investigate abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>4. Third-party services</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database and authentication. Data stored in the EU (Frankfurt).</li>
              <li><strong>Anthropic</strong> — AI inference. Your matter text is transmitted to Anthropic to generate responses. Anthropic&rsquo;s <a href="https://www.anthropic.com/privacy" style={{ color: "var(--verdict-neon)" }}>privacy policy</a> applies to that processing.</li>
              <li><strong>Lemon Squeezy</strong> — payment processing and invoicing.</li>
              <li><strong>Vercel / Render</strong> — hosting. Request logs may be retained per their policies.</li>
            </ul>
            <p className="mt-2">We do not sell your data to any third party.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>5. Data retention</h2>
            <p>Your matter data is retained while your account is active. Upon account deletion we delete your matters, usage records, and API keys within 30 days. Anonymised aggregate statistics may be retained indefinitely.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>6. Your rights</h2>
            <p>You may request a copy of your personal data, correction of inaccurate data, or deletion of your account by emailing <a href="mailto:support@lexagent.io" style={{ color: "var(--verdict-neon)" }}>support@lexagent.io</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>7. Cookies</h2>
            <p>We use a single session cookie set by Supabase Auth. No advertising or tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>8. Changes to this policy</h2>
            <p>We will post updates on this page with a new effective date. Continued use of LexAgent after the effective date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>9. Contact</h2>
            <p>Questions? Email <a href="mailto:support@lexagent.io" style={{ color: "var(--verdict-neon)" }}>support@lexagent.io</a>.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
