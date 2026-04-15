/**
 * API proxy wrappers — route all external service calls through the backend proxy
 * when VITE_API_URL is set, so secrets never leave the server.
 *
 * In dev without a backend: calls fall back to direct URLs (CORS may block
 * legal database calls — run the api app locally to fix).
 */

const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Anthropic key (demo / no-backend mode) ────────────────────────────────
// When VITE_API_URL is not set, Anthropic calls go directly to api.anthropic.com.
// The key can come from VITE_ANTHROPIC_KEY env var OR be set at runtime by
// LexAgent once the user enters it in settings / onboarding.
let _anthropicKey: string = import.meta.env.VITE_ANTHROPIC_KEY ?? "";
export function setAnthropicKey(key: string) { _anthropicKey = key; }
export function getAnthropicKey(): string { return _anthropicKey; }

// ── Auth token accessor ────────────────────────────────────────────────────
// Set by AuthProvider once a Supabase session is established.
let _authToken: string | null = null;
export function setAuthToken(token: string | null) {
  _authToken = token;
}

function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

// ── Anthropic messages proxy ───────────────────────────────────────────────
/**
 * ANTHROPIC_ENDPOINT — the URL used for all Claude API calls.
 * When VITE_API_URL is set the backend proxy is used (key stays server-side).
 * Without it, the direct Anthropic URL is used (requires the user's API key
 * to be passed in the request headers by the caller — dev only).
 */
export const ANTHROPIC_ENDPOINT = API_URL
  ? `${API_URL}/api/anthropic/messages`
  : "https://api.anthropic.com/v1/messages";

/**
 * anthropicFetch — thin wrapper used by LexAgent in place of the raw
 * fetch("https://api.anthropic.com/v1/messages", ...) calls.
 *
 * When routed through the proxy, auth headers are injected automatically.
 * When called directly (dev), the caller's options (including x-api-key) are preserved.
 */
export async function anthropicFetch(
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_URL ? authHeaders() : {}),
    ...extraHeaders,
  };
  return fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// ── CourtListener proxy ────────────────────────────────────────────────────
export const COURTLISTENER_BASE = API_URL
  ? `${API_URL}/api/courtlistener`
  : "https://www.courtlistener.com/api/rest/v4";

// ── Harvard CAP proxy ──────────────────────────────────────────────────────
export const CAP_BASE = API_URL
  ? `${API_URL}/api/cap`
  : "https://api.case.law/v1";

// ── GovInfo proxy ──────────────────────────────────────────────────────────
export const GOVINFO_BASE = API_URL
  ? `${API_URL}/api/govinfo`
  : "https://api.govinfo.gov";
