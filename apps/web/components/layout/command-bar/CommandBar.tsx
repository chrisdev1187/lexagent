"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Command, FileText, Settings, User, Gavel, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { matters } = useMatters();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const results = query.trim() ? matters.filter(m =>
    m.title.toLowerCase().includes(query.toLowerCase()) ||
    m.client?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5) : [];

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
    setQuery("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[var(--midnight-deep)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
          <Search size={18} className="text-[var(--fg-quaternary)]" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search matters, clients, or commands..."
            className="flex-1 bg-transparent border-none outline-none text-[var(--fg-primary)] placeholder:text-[var(--fg-quaternary)] text-sm"
          />
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] text-[var(--fg-quaternary)]">
            <Command size={10} /> K
          </div>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/5 rounded text-[var(--fg-quaternary)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {query && results.length === 0 && (
            <div className="py-8 text-center text-[var(--fg-tertiary)] text-xs font-mono">
              NO RESULTS FOUND
            </div>
          )}

          {results.length > 0 && (
            <div className="mb-4">
              <p className="px-3 py-2 text-[9px] font-mono text-[var(--fg-quaternary)] uppercase tracking-widest">Matters</p>
              {results.map(m => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/matters/${m.id}/overview`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--verdict-neon)]/5 text-left group transition-all"
                >
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[var(--fg-tertiary)] group-hover:text-[var(--verdict-neon)] transition-colors">
                    <Gavel size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg-primary)] truncate">{m.title}</p>
                    <p className="text-[10px] text-[var(--fg-tertiary)] truncate uppercase font-mono">{m.client}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mb-2">
            <p className="px-3 py-2 text-[9px] font-mono text-[var(--fg-quaternary)] uppercase tracking-widest">Navigation</p>
            {[
              { label: "Go to Dashboard", icon: FileText, path: "/dashboard" },
              { label: "System Settings", icon: Settings, path: "/settings" },
              { label: "My Profile", icon: User, path: "/settings/profile" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group transition-all"
              >
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[var(--fg-tertiary)] group-hover:text-[var(--fg-primary)]">
                  <item.icon size={14} />
                </div>
                <span className="text-sm text-[var(--fg-secondary)] group-hover:text-[var(--fg-primary)]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--fg-quaternary)]">
              <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-white">↑↓</span>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--fg-quaternary)]">
              <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-white">Enter</span>
              <span>to select</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-[var(--fg-quaternary)] uppercase">ARES COMMAND INTERFACE v6.1</span>
        </div>
      </div>
    </div>
  );
}
