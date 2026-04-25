import { setBudgetState, BudgetStatus } from "@/lib/budget-store";
import { log } from "@/lib/logger";

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

export async function anthropicFetch(
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const hasToken = !!_authToken;
  const model = body.model as string ?? "unknown";
  log.info("anthropic", `→ POST ${ANTHROPIC_ENDPOINT}`, { model, hasToken, hasApiUrl: !!API_URL });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_URL ? authHeaders() : {}),
    ...extraHeaders,
  };

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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

    if (res.status === 429) {
      if (errCode === "free_tier_exhausted") {
        let tool = "", matterId = "";
        try { const j = JSON.parse(rawBody) as any; tool = j.tool ?? ""; matterId = j.matter_id ?? ""; } catch { /**/ }
        throw new FreeTierExhaustedError(tool, matterId);
      }
      throw new QuotaExceededError();
    }
    throw new Error(errMsg);
  }

  log.info("anthropic", `← ${res.status} OK`, { provider, tier, model, spent, budget });
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
