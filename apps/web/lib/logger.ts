"use client";

// Centralised structured logger — every API call, auth event, and error lands here.
// Logs go to: console (always) + localStorage ring buffer (last 200 entries, admin-readable).

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  tag: string;
  msg: string;
  data?: unknown;
}

const MAX_ENTRIES = 200;
const STORAGE_KEY = "lex_debug_log";

function store(entry: LogEntry) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const buf: LogEntry[] = raw ? JSON.parse(raw) : [];
    buf.push(entry);
    if (buf.length > MAX_ENTRIES) buf.splice(0, buf.length - MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buf));
  } catch { /* quota full — ignore */ }
}

function emit(level: LogLevel, tag: string, msg: string, data?: unknown) {
  const entry: LogEntry = { ts: new Date().toISOString(), level, tag, msg, data };
  const prefix = `[${tag}] ${msg}`;
  if (level === "error") console.error(prefix, data ?? "");
  else if (level === "warn")  console.warn(prefix, data ?? "");
  else if (level === "debug") console.debug(prefix, data ?? "");
  else                        console.log(prefix, data ?? "");
  store(entry);
}

export const log = {
  info:  (tag: string, msg: string, data?: unknown) => emit("info",  tag, msg, data),
  warn:  (tag: string, msg: string, data?: unknown) => emit("warn",  tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => emit("error", tag, msg, data),
  debug: (tag: string, msg: string, data?: unknown) => emit("debug", tag, msg, data),
};

/** Read the full log buffer (for admin debug panel). */
export function readLog(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Clear the log buffer. */
export function clearLog() {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}
