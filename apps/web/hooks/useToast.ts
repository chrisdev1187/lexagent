"use client";

import { useToastContext, ToastType } from "@/providers/toast-provider";

export function useToast() {
  const { addToast } = useToastContext();
  return {
    success: (message: string) => addToast("success", message),
    warning: (message: string) => addToast("warning", message),
    error: (message: string) => addToast("error", message),
    info: (message: string) => addToast("info", message),
    toast: addToast,
  };
}

export type { ToastType };
