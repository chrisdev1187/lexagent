"use client";

interface NeonOrbitProps {
  size?: number;
  className?: string;
}

export function NeonOrbit({ size = 48, className = "" }: NeonOrbitProps) {
  return (
    <div className={className} style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes no-spin {
          from { stroke-dashoffset:0 }
          to   { stroke-dashoffset:-110 }
        }
        @keyframes no-breathe {
          0%,100% { filter:drop-shadow(0 0 2px var(--verdict-neon)); color:var(--gavel-silver,#b8b8bc) }
          50%     { filter:drop-shadow(0 0 8px var(--verdict-neon));  color:var(--verdict-neon) }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        width={size}
        height={size}
        style={{ overflow: "visible" }}
      >
        <g style={{ color: "var(--gavel-silver, #b8b8bc)", animation: "no-breathe 2s ease-in-out infinite" }}>
          <line x1="20" y1="10" x2="20" y2="30" strokeWidth="1.25"/>
          <line x1="14" y1="30" x2="26" y2="30" strokeWidth="1.25"/>
          <line x1="11" y1="15" x2="29" y2="15" strokeWidth="1.25"/>
          <line x1="11" y1="15" x2="11" y2="20" strokeWidth="0.75"/>
          <line x1="11" y1="20" x2="8"  y2="23" strokeWidth="0.75"/>
          <line x1="11" y1="20" x2="14" y2="23" strokeWidth="0.75"/>
          <path d="M7 23 Q11 26 15 23" strokeWidth="1" fill="none"/>
          <line x1="29" y1="15" x2="29" y2="20" strokeWidth="0.75"/>
          <line x1="29" y1="20" x2="26" y2="23" strokeWidth="0.75"/>
          <line x1="29" y1="20" x2="32" y2="23" strokeWidth="0.75"/>
          <path d="M25 23 Q29 26 33 23" strokeWidth="1" fill="none"/>
          <circle cx="20" cy="10" r="1.25" fill="currentColor"/>
        </g>
        <circle
          cx="20" cy="20" r="17.5"
          stroke="var(--verdict-neon)"
          strokeWidth="0.75"
          fill="none"
          strokeDasharray="14 96"
          style={{
            transformOrigin: "20px 20px",
            animation: "no-spin 4s linear infinite",
            filter: "drop-shadow(0 0 4px var(--verdict-neon))",
          }}
        />
      </svg>
    </div>
  );
}
