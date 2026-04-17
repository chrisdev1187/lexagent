import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const GOVINFO_KEY = process.env.DATA_GOV_KEY ?? process.env.GOVINFO_KEY ?? "DEMO_KEY";
const GOVINFO_BASE = "https://api.govinfo.gov";

export const govinfoRouter = new Hono();
govinfoRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

// Generic GET passthrough, injecting server-side API key
govinfoRouter.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/govinfo/, "");
  const query = c.req.query();
  // Inject server-side key (remove any client-supplied key for safety)
  delete query["api_key"];
  query["api_key"] = GOVINFO_KEY;
  const params = new URLSearchParams(query).toString();
  const url = `${GOVINFO_BASE}${path}${params ? `?${params}` : ""}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
