"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { MattersProvider } from "@/providers/matters-provider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { NewMatterModal } from "@/components/shared/NewMatterModal";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showNewMatter, setShowNewMatter] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-6 w-6 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--border)", borderTopColor: "var(--emerald)" }}
          />
          <span className="font-mono text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
            LOADING…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full flex-shrink-0">
        <Sidebar onNewMatter={() => setShowNewMatter(true)} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <TopBar onNewMatter={() => setShowNewMatter(true)} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {showNewMatter && (
        <NewMatterModal onClose={() => setShowNewMatter(false)} />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MattersProvider>
      <AppShellInner>{children}</AppShellInner>
    </MattersProvider>
  );
}
