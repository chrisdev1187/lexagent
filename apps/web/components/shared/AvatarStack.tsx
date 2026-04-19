"use client";

import type { PresenceUser } from "@/hooks/usePresence";

interface AvatarStackProps {
  users: PresenceUser[];
  max?: number;
}

export function AvatarStack({ users, max = 4 }: AvatarStackProps) {
  if (!users.length) return null;

  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {visible.map((u, i) => (
        <div
          key={u.user_id}
          title={`${u.email} — on ${u.tab}`}
          className="flex items-center justify-center rounded-full text-[10px] font-bold ring-2 select-none"
          style={{
            width: 26,
            height: 26,
            background: u.color,
            color: "#0A0F0D",
            marginLeft: i === 0 ? 0 : -8,
            zIndex: visible.length - i,
            outline: "2px solid var(--surface)",
            flexShrink: 0,
          }}
        >
          {u.initials}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full text-[9px] font-bold ring-2"
          style={{
            width: 26,
            height: 26,
            background: "var(--panel2)",
            color: "var(--text-muted)",
            marginLeft: -8,
            outline: "2px solid var(--surface)",
            flexShrink: 0,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
