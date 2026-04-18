import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const BASE = "https://www.ecfr.gov/api/versioner/v1";

export const ecfrRouter = new Hono();
ecfrRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

// eCFR full-text search — different base than versioner
ecfrRouter.get("/search", async (c) => {
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `https://www.ecfr.gov/api/search/v1/results${params ? `?${params}` : ""}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});

// eCFR versioner (specific sections, full text by date/path)
ecfrRouter.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/ecfr/, "");
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${BASE}${path}${params ? `?${params}` : ""}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
