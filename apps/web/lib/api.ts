import { setBudgetState, getBudgetState, BudgetStatus } from "@/lib/budget-store";
import { log } from "@/lib/logger";
import { getSessionId } from "@/lib/session-id";
import { getCachedFingerprint } from "@/hooks/useFingerprint";

let _sessionSignOutCallback: (() => void) | null = null;
export function registerSessionSignOut(cb: () => void) { _sessionSignOutCallback = cb; }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

let _anthropicKey: string = process.env.NEXT_PUBLIC_ANTHROPIC_KEY ?? "";
export function setAnthropicKey(key: string) { _anthropicKey = key; }
export function getAnthropicKey(): string { return _anthropicKey; }

let _authToken: string | null = null;
export function setAuthToken(token: string | null) {
  log.debug("api", `auth token ${token ? "set" : "cleared"}`, { hasToken: !!token });
  _authToken = token;
}
function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

export const ANTHROPIC_ENDPOINT = API_URL
  ? `${API_URL}/api/anthropic/messages`
  : "https://api.anthropic.com/v1/messages";

log.info("api", "API_URL resolved", { API_URL: API_URL || "(empty — direct Anthropic)", ANTHROPIC_ENDPOINT });

export class QuotaExceededError extends Error {
  constructor() { super("AI quota exceeded — upgrade your plan to continue."); this.name = "QuotaExceededError"; }
}

export class FreeTierExhaustedError extends Error {
  tool: string;
  matterId: string;
  constructor(tool: string, matterId: string) {
    super(`Free plan allows 1 use of "${tool}" per matter. Upgrade to continue.`);
    this.name     = "FreeTierExhaustedError";
    this.tool     = tool;
    this.matterId = matterId;
  }
}

export class CreditExhaustedError extends Error {
  remaining: number;
  creditCost: number;
  constructor(remaining: number, creditCost: number) {
    super(`Monthly credit allowance exhausted. Upgrade your plan to continue.`);
    this.name       = "CreditExhaustedError";
    this.remaining  = remaining;
    this.creditCost = creditCost;
  }
}

export class AccountSuspendedError extends Error {
  reason: string;
  suspendedUntil: string | null;
  constructor(reason: string, suspendedUntil: string | null) {
    super(`Your account has been suspended. ${reason}`);
    this.name          = "AccountSuspendedError";
    this.reason        = reason;
    this.suspendedUntil = suspendedUntil;
  }
}

export interface AnthropicFetchOptions {
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
}

/** Parse Anthropic SSE stream, call onChunk per text delta, return synthetic Response. */
async function streamAnthropicSse(
  res: Response,
  onChunk: (text: string) => void,
  model: string
): Promise<Response> {
  if (!res.body) throw new Error("No response body for streaming");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "{}") continue;
        try {
          const ev = JSON.parse(raw) as {
            type?: string;
            message?: { usage?: { input_tokens?: number } };
            delta?: { type?: string; text?: string };
            usage?: { output_tokens?: number; input_tokens?: number };
            index?: number;
          };
          if (ev.type === "message_start") {
            inputTokens = ev.message?.usage?.input_tokens ?? 0;
          }
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            const chunk = ev.delta.text ?? "";
            if (chunk) { fullText += chunk; onChunk(chunk); }
          }
          if (ev.type === "message_delta") {
            outputTokens = ev.usage?.output_tokens ?? 0;
          }
        } catch { /* skip malformed SSE line */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return new Response(JSON.stringify({
    id: `msg_stream_${Date.now()}`,
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: fullText }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

export async function anthropicFetch(
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
  options?: AnthropicFetchOptions
): Promise<Response> {
  const { onChunk, signal } = options ?? {};
  const model = (body.model as string) ?? "unknown";
  const hasToken = !!_authToken;
  log.info("anthropic", `→ POST ${ANTHROPIC_ENDPOINT}`, { model, hasToken, hasApiUrl: !!API_URL, streaming: !!onChunk });

  const sessionId = getSessionId();
  const fingerprint = getCachedFingerprint();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_URL ? authHeaders() : {}),
    ...(API_URL && sessionId !== "unknown" ? { "X-Session-Id": sessionId } : {}),
    ...(API_URL && fingerprint ? { "X-Device-Fingerprint": fingerprint } : {}),
    ...extraHeaders,
  };

  // When streaming, inject stream:true into the request body
  const fetchBody = onChunk ? { ...body, stream: true } : body;

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(fetchBody),
      signal,
    });
  } catch (err) {
    log.error("anthropic", "fetch threw (network error)", { err: String(err), endpoint: ANTHROPIC_ENDPOINT });
    throw err;
  }

  const spent  = parseFloat(res.headers.get("X-Budget-USD-Spent")  ?? "0");
  const budget = parseFloat(res.headers.get("X-Budget-USD-Budget") ?? "0");
  const rawStatus = (res.headers.get("X-Budget-Status") ?? "ok") as BudgetStatus;
  const provider = res.headers.get("X-Provider") ?? res.headers.get("_provider") ?? "unknown";
  const tier = res.headers.get("X-Tier") ?? "unknown";

  if ((budget > 0 || rawStatus !== "ok") && Number.isFinite(spent) && Number.isFinite(budget)) {
    setBudgetState({ status: rawStatus, spent, budget });
  }

  // Single-session enforcement: if the server revoked this session, force sign-out
  if (res.headers.get("X-Session-Invalid") === "true") {
    log.warn("api", "session revoked by server — signing out");
    _sessionSignOutCallback?.();
  }

  // Credit economy: bump seq so UsagePill re-fetches after each AI call
  if (res.headers.has("X-Credits-Remaining")) {
    const cur = getBudgetState();
    setBudgetState({ status: cur.status, spent: cur.spent, budget: cur.budget });
  }

  if (!res.ok) {
    const rawBody = await res.clone().text().catch(() => "");
    let errMsg = `HTTP ${res.status}`;
    let errCode: string | null = null;
    try {
      const j = JSON.parse(rawBody) as Record<string, unknown>;
      errCode  = typeof j.error === "string" ? j.error : (j.error as any)?.type ?? null;
      errMsg   = typeof j.error === "string"
        ? j.error
        : (j.error as any)?.message ?? (j.message as string) ?? errMsg;
    } catch { /* body not JSON */ }
    log.error("anthropic", `← ${res.status} ${res.statusText}`, { status: res.status, body: rawBody.slice(0, 300), provider, tier, model });

    if (res.status === 403) {
      let reason = "Contact support for details.", suspendedUntil: string | null = null;
      try { const j = JSON.parse(rawBody) as any; reason = j.reason ?? reason; suspendedUntil = j.suspended_until ?? null; } catch { /**/ }
      throw new AccountSuspendedError(reason, suspendedUntil);
    }

    if (res.status === 429) {
      if (errCode === "free_tier_exhausted") {
        let tool = "", matterId = "";
        try { const j = JSON.parse(rawBody) as any; tool = j.tool ?? ""; matterId = j.matter_id ?? ""; } catch { /**/ }
        throw new FreeTierExhaustedError(tool, matterId);
      }
      if (errCode === "credit_exhausted") {
        let remaining = 0, creditCost = 0;
        try { const j = JSON.parse(rawBody) as any; remaining = j.remaining ?? 0; creditCost = j.credit_cost ?? 0; } catch { /**/ }
        throw new CreditExhaustedError(remaining, creditCost);
      }
      throw new QuotaExceededError();
    }
    throw new Error(errMsg);
  }

  log.info("anthropic", `← ${res.status} OK`, { provider, tier, model, spent, budget });

  // Streaming: consume SSE, call onChunk per text delta, return synthetic JSON response
  if (onChunk) {
    return streamAnthropicSse(res, onChunk, model);
  }

  return res;
}

export async function adminFetch(path: string, body: unknown): Promise<Response> {
  log.info("admin", `→ POST ${path}`, body);
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    log.error("admin", `fetch threw for ${path}`, { err: String(err) });
    throw err;
  }
  if (!res.ok) {
    const text = await res.clone().text().catch(() => "(unreadable)");
    log.error("admin", `← ${res.status} ${res.statusText} for ${path}`, { body: text });
  } else {
    log.info("admin", `← ${res.status} OK for ${path}`);
  }
  return res;
}

export const COURTLISTENER_BASE = API_URL
  ? `${API_URL}/api/courtlistener`
  : "https://www.courtlistener.com/api/rest/v4";

export const GOVINFO_BASE = API_URL
  ? `${API_URL}/api/govinfo`
  : "https://api.govinfo.gov";

export const CONGRESS_BASE = API_URL
  ? `${API_URL}/api/congress`
  : "https://api.congress.gov/v3";

export const ECFR_BASE = API_URL
  ? `${API_URL}/api/ecfr`
  : "https://www.ecfr.gov/api/versioner/v1";

export const REGULATIONS_BASE = API_URL
  ? `${API_URL}/api/regulations`
  : "https://api.regulations.gov/v4";

export const EDGAR_BASE = API_URL
  ? `${API_URL}/api/edgar`
  : "https://data.sec.gov";

export const USPTO_BASE = API_URL
  ? `${API_URL}/api/uspto`
  : "https://api.patentsview.org";

export const OPENSTATES_BASE = API_URL
  ? `${API_URL}/api/openstates`
  : "https://v3.openstates.org";

export function getApiHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}
