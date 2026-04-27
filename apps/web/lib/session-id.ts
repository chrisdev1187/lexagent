const KEY = "lex_session_id";

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

export function rotateSessionId(): string {
  try {
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

export function clearSessionId(): void {
  try { localStorage.removeItem(KEY); } catch {}
}
