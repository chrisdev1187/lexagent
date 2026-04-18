import { ReactNode, useState } from "react";
import { useAuth } from "../lib/auth";

const T = {
  bg: "#08090F",
  surface: "#10131F",
  panel: "#141828",
  border: "#1E2438",
  borderHi: "#2A3252",
  gold: "#C8A96E",
  goldDim: "#C8A96E40",
  text: "#D4D9EC",
  textSub: "#5E6E90",
  textMuted: "#303855",
  cobalt: "#4070D8",
  crimson: "#C43355",
  emerald: "#26A860",
};

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: T.bg,
          color: T.textSub,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: "0.1em",
        }}
      >
        LOADING…
      </div>
    );
  }

  if (user) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const fn = mode === "signin" ? signInWithEmail : signUpWithEmail;
    const { error: err } = await fn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else if (mode === "signup") {
      setMessage("Check your email to confirm your account.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 40,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 28,
              fontFamily: "'Playfair Display', serif",
              color: T.gold,
              marginBottom: 6,
            }}
          >
            LexAgent
          </div>
          <div
            style={{
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: T.textSub,
              letterSpacing: "0.15em",
            }}
          >
            ARES v5 · LEGAL AI PLATFORM
          </div>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: T.bg,
            borderRadius: 8,
            padding: 4,
            marginBottom: 24,
            gap: 4,
          }}
        >
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? T.panel : "transparent",
                border: mode === m ? `1px solid ${T.borderHi}` : "1px solid transparent",
                borderRadius: 6,
                color: mode === m ? T.text : T.textSub,
                padding: "8px 0",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {m === "signin" ? "SIGN IN" : "SIGN UP"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 10,
                color: T.textSub,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.text,
                padding: "10px 14px",
                fontSize: 13,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: "none",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 10,
                color: T.textSub,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.text,
                padding: "10px 14px",
                fontSize: 13,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: `${T.crimson}14`,
                border: `1px solid ${T.crimson}40`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: 12,
                color: T.crimson,
              }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              style={{
                background: `${T.emerald}14`,
                border: `1px solid ${T.emerald}40`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: 12,
                color: T.emerald,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: `linear-gradient(135deg, ${T.gold}, #D8BB80)`,
              border: "none",
              borderRadius: 8,
              color: "#08090F",
              padding: "12px 0",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: submitting ? "wait" : "pointer",
              marginBottom: 12,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Google */}
        <button
          onClick={async () => {
            setError(null);
            const { error: err } = await signInWithGoogle();
            if (err) setError(err.message);
          }}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text,
            padding: "11px 0",
            fontSize: 13,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
