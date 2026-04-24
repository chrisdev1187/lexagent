"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; color: string; Icon: React.ElementType }> = {
  success: {
    bg: "rgba(0,255,195,0.08)",
    border: "rgba(0,255,195,0.35)",
    color: "var(--verdict-neon)",
    Icon: CheckCircle,
  },
  warning: {
    bg: "rgba(255,184,0,0.08)",
    border: "rgba(255,184,0,0.35)",
    color: "var(--verdict-amber)",
    Icon: AlertTriangle,
  },
  error: {
    bg: "rgba(255,51,85,0.08)",
    border: "rgba(255,51,85,0.35)",
    color: "var(--verdict-crimson)",
    Icon: XCircle,
  },
  info: {
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.15)",
    color: "var(--fg-secondary)",
    Icon: Info,
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const s = TOAST_STYLES[toast.type];
  const { Icon } = s;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded pointer-events-auto max-w-sm"
      style={{
        background: s.bg,
        border: `0.5px solid ${s.border}`,
        backdropFilter: "blur(16px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minWidth: 260,
      }}
    >
      <Icon size={15} style={{ color: s.color, flexShrink: 0, marginTop: 1 }} />
      <span className="font-mono text-[11px] tracking-[0.08em] flex-1" style={{ color: "var(--fg-primary)" }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 cursor-pointer"
        style={{ background: "none", border: "none", color: "var(--fg-quaternary)" }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used inside <ToastProvider>");
  return ctx;
}
