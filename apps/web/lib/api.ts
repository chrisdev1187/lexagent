const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

let _anthropicKey: string = process.env.NEXT_PUBLIC_ANTHROPIC_KEY ?? "";
export function setAnthropicKey(key: string) { _anthropicKey = key; }
export function getAnthropicKey(): string { return _anthropicKey; }

let _authToken: string | null = null;
export function setAuthToken(token: string | null) { _authToken = token; }
function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

export const ANTHROPIC_ENDPOINT = API_URL
  ? `${API_URL}/api/anthropic/messages`
  : "https://api.anthropic.com/v1/messages";

export class QuotaExceededError extends Error {
  constructor() { super("AI quota exceeded — upgrade your plan to continue."); this.name = "QuotaExceededError"; }
}

export async function anthropicFetch(
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_URL ? authHeaders() : {}),
    ...extraHeaders,
  };
  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new QuotaExceededError();
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
