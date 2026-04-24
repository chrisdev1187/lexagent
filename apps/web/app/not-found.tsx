import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-md w-full text-center">
        <div
          className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}
        >
          <SearchX size={22} style={{ color: "var(--verdict-neon)" }} />
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--fg-primary)" }}>
          Page not found
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--fg-tertiary)" }}>
          The page you requested doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="lex-btn lex-btn--primary" style={{ textDecoration: "none" }}>
          Go home
        </Link>
      </div>
    </div>
  );
}
