import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const TIMEOUT_MS = 4000;

type ServiceStatus = "green" | "amber" | "red";

interface ServiceResult {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
}

async function probe(fn: () => Promise<void>): Promise<ServiceResult> {
  const start = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
    ]);
    const latencyMs = Date.now() - start;
    return { status: latencyMs < 500 ? "green" : "amber", latencyMs };
  } catch (e) {
    return { status: "red", latencyMs: Date.now() - start, error: String(e) };
  }
}

async function probeUrl(url: string, headers?: Record<string, string>): Promise<ServiceResult> {
  return probe(async () => {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.text();
  });
}

export const healthDeepRouter = new Hono();

healthDeepRouter.get("/", async (c) => {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const GROQ_KEY      = process.env.GROQ_API_KEY;
  const GEMINI_KEY    = process.env.GEMINI_API_KEY;
  const CEREBRAS_KEY  = process.env.CEREBRAS_API_KEY;
  const CL_TOKEN      = process.env.COURTLISTENER_TOKEN;
  const GOVINFO_KEY   = process.env.DATA_GOV_KEY;
  const OPENSTATES_KEY = process.env.OPENSTATES_KEY;

  const CONGRESS_KEY   = process.env.CONGRESS_KEY ?? process.env.DATA_GOV_KEY;
  const SAMBANOVA_KEY  = process.env.SAMBANOVA_API_KEY;
  const NVIDIA_KEY     = process.env.NVIDIA_API_KEY;

  const [
    supabaseResult,
    anthropicResult,
    groqResult,
    geminiResult,
    cerebrasResult,
    courtlistenerResult,
    govinfoResult,
    openstatesResult,
    xaiResult,
    mistralResult,
    sambanovaResult,
    nvidiaResult,
    congressResult,
    ecfrResult,
    renderSelfResult,
  ] = await Promise.all([
    // Supabase: HTTP health check (avoids JS client auth overhead)
    (() => {
      const url  = process.env.SUPABASE_URL;
      const key  = process.env.SUPABASE_SERVICE_KEY;
      if (!url || !key) return Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "not configured" });
      return probeUrl(`${url}/rest/v1/plans?select=id&limit=1`, { apikey: key, Authorization: `Bearer ${key}` });
    })(),

    // Anthropic: model list (doesn't cost tokens)
    ANTHROPIC_KEY
      ? probeUrl("https://api.anthropic.com/v1/models", {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // Groq
    GROQ_KEY
      ? probeUrl("https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${GROQ_KEY}` })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // Gemini
    GEMINI_KEY
      ? probeUrl(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`)
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // Cerebras
    CEREBRAS_KEY
      ? probeUrl("https://api.cerebras.ai/v1/models", { Authorization: `Bearer ${CEREBRAS_KEY}` })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // CourtListener
    CL_TOKEN
      ? probeUrl("https://www.courtlistener.com/api/rest/v4/courts/?format=json&page_size=1", {
          Authorization: `Token ${CL_TOKEN}`,
        })
      : probeUrl("https://www.courtlistener.com/api/rest/v4/courts/?format=json&page_size=1"),

    // GovInfo
    GOVINFO_KEY
      ? probeUrl(`https://api.govinfo.gov/published/2024-01-01?pageSize=1&api_key=${GOVINFO_KEY}`)
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // OpenStates
    OPENSTATES_KEY
      ? probeUrl("https://v3.openstates.org/jurisdictions?classification=state&page=1&per_page=1", {
          "X-API-KEY": OPENSTATES_KEY,
        })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // xAI
    process.env.XAI_API_KEY
      ? probeUrl("https://api.x.ai/v1/models", { Authorization: `Bearer ${process.env.XAI_API_KEY}` })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // Mistral
    process.env.MISTRAL_API_KEY
      ? probeUrl("https://api.mistral.ai/v1/models", { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // SambaNova
    SAMBANOVA_KEY
      ? probeUrl("https://api.sambanova.ai/v1/models", { Authorization: `Bearer ${SAMBANOVA_KEY}` })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // NVIDIA
    NVIDIA_KEY
      ? probeUrl("https://integrate.api.nvidia.com/v1/models", { Authorization: `Bearer ${NVIDIA_KEY}` })
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // Congress.gov
    CONGRESS_KEY
      ? probeUrl(`https://api.congress.gov/v3/bill?api_key=${CONGRESS_KEY}&limit=1&format=json`)
      : Promise.resolve<ServiceResult>({ status: "red", latencyMs: 0, error: "key not configured" }),

    // eCFR (no key required)
    probeUrl("https://www.ecfr.gov/api/search/v1/results?query=law&per_page=1"),

    // Render self-check (cold-start indicator)
    probeUrl(`${process.env.RENDER_EXTERNAL_URL ?? "https://lexagent-0o5u.onrender.com"}/api/health`),
  ]);

  const services = {
    supabase:      supabaseResult,
    anthropic:     anthropicResult,
    groq:          groqResult,
    gemini:        geminiResult,
    cerebras:      cerebrasResult,
    xai:           xaiResult,
    mistral:       mistralResult,
    sambanova:     sambanovaResult,
    nvidia:        nvidiaResult,
    courtlistener: courtlistenerResult,
    govinfo:       govinfoResult,
    openstates:    openstatesResult,
    congress:      congressResult,
    ecfr:          ecfrResult,
    render:        renderSelfResult,
  };

  const overall = Object.values(services).every(s => s.status !== "red")
    ? "green"
    : Object.values(services).some(s => s.status === "green")
    ? "amber"
    : "red";

  console.log(JSON.stringify({
    tag:     "healthdeep",
    event:   "probe_complete",
    overall,
    summary: Object.fromEntries(Object.entries(services).map(([k, v]) => [k, v.status])),
    ts:      new Date().toISOString(),
  }));

  return c.json({ overall, services, ts: new Date().toISOString() });
});
