"use client";

interface ScanlineWipeProps {
  fontSize?: number;
  className?: string;
}

export function ScanlineWipe({ fontSize = 14, className = "" }: ScanlineWipeProps) {
  const trackH = Math.max(1, Math.round(fontSize * 0.08));

  return (
    <div
      className={className}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <style>{`
        @keyframes sw-base {
          0%,10%  { opacity:0.25 }
          20%     { opacity:1 }
          90%     { opacity:1 }
          100%    { opacity:0.25 }
        }
        @keyframes sw-sweep {
          0%,10%  { clip-path:inset(100% 0 0% 0) }
          40%     { clip-path:inset(0% 0 0% 0) }
          70%     { clip-path:inset(0% 0 0% 0) }
          95%,100%{ clip-path:inset(0% 0 100% 0) }
        }
        @keyframes sw-bar {
          0%,5%   { top:100%; opacity:0 }
          10%     { opacity:1; top:100% }
          40%     { top:0%; opacity:1 }
          50%     { top:-10%; opacity:0 }
          60%     { top:100%; opacity:0 }
          70%     { top:100%; opacity:1 }
          95%     { top:0%; opacity:1 }
          100%    { top:-10%; opacity:0 }
        }
      `}</style>

      {/* Scan bar */}
      <div style={{
        position: "absolute",
        left: -2, right: -2,
        height: trackH,
        background: "var(--verdict-neon)",
        boxShadow: "0 0 8px var(--verdict-neon), 0 0 2px #fff",
        top: 0,
        animation: "sw-bar 4s ease-in-out infinite",
        zIndex: 3,
        opacity: 0,
      }} />

      {/* Base text */}
      <span style={{
        fontFamily: "var(--font-sans, Inter, sans-serif)",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--gavel-chrome, #e0e0e0)",
        animation: "sw-base 4s ease-in-out infinite",
        position: "relative",
        zIndex: 1,
        whiteSpace: "nowrap",
      }}>
        LexAgent
      </span>

      {/* Neon overlay */}
      <span style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans, Inter, sans-serif)",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--verdict-neon)",
        clipPath: "inset(100% 0 0% 0)",
        animation: "sw-sweep 4s ease-in-out infinite",
        textShadow: "0 0 12px rgba(0,255,195,0.9)",
        zIndex: 2,
        whiteSpace: "nowrap",
      }}>
        LexAgent
      </span>
    </div>
  );
}
