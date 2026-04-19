"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export interface TeamInfo {
  team_id: string;
  team_name: string;
  team_slug: string;
  my_role: "member" | "admin" | "owner";
  member_count: number;
  plan_id: string;
}

interface TeamsContextValue {
  teams: TeamInfo[];
  loading: boolean;
  reload: () => void;
}

const TeamsContext = createContext<TeamsContextValue>({
  teams: [],
  loading: false,
  reload: () => {},
});

export function TeamsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    if (!user) { setTeams([]); return; }
    setLoading(true);
    supabase.rpc("get_my_teams").then(({ data }) => {
      setTeams((data ?? []) as TeamInfo[]);
      setLoading(false);
    });
  }, [user, rev]);

  return (
    <TeamsContext.Provider value={{ teams, loading, reload: () => setRev((r) => r + 1) }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  return useContext(TeamsContext);
}
