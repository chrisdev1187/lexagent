"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  user_id: string;
  email: string;
  initials: string;
  tab: string;
  color: string;
}

const COLORS = ["#10B981","#F59E0B","#7C3AED","#0EA5E9","#EF4444","#EC4899","#14B8A6"];

function colorFor(uid: string) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function initials(email: string) {
  const parts = email.split("@")[0].split(/[._-]/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function usePresence(matterId: string, currentTab: string) {
  const { user } = useAuth();
  const [present, setPresent] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !matterId) return;

    // Supabase returns the same channel instance if the topic already exists.
    // Adding presence callbacks to an already-subscribed channel throws, so remove it first.
    const existing = supabase.getChannels().find(c => c.topic === `realtime:matter:${matterId}`);
    if (existing) supabase.removeChannel(existing);

    const ch = supabase.channel(`matter:${matterId}`, {
      config: { presence: { key: user.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ email: string; tab: string }>();
      const users: PresenceUser[] = Object.entries(state)
        .flatMap(([uid, presences]) =>
          presences.slice(0, 1).map(() => ({
            user_id: uid,
            email: presences[0].email,
            initials: initials(presences[0].email),
            tab: presences[0].tab,
            color: colorFor(uid),
          }))
        )
        .filter(u => u.user_id !== user.id);
      setPresent(users);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ email: user.email ?? "", tab: currentTab });
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user, matterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update tab without re-subscribing
  useEffect(() => {
    channelRef.current?.track({ email: user?.email ?? "", tab: currentTab });
  }, [currentTab, user]);

  return present;
}
