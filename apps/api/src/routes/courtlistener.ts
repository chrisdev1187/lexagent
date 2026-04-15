import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const CL_TOKEN = process.env.COURTLISTENER_TOKEN ?? "";
const CL_BASE = "https://www.courtlistener.com/api/rest/v4";

export const courtlistenerRouter = new Hono();
courtlistenerRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

// Generic passthrough: forward GET requests, appending the server-side token
courtlistenerRouter.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/courtlistener/, "");
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${CL_BASE}${path}${params ? `?${params}` : ""}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (CL_TOKEN) headers["Authorization"] = `Token ${CL_TOKEN}`;

  const res = await fetch(url, { headers });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});

// Citation lookup POST endpoint
courtlistenerRouter.post("/citation-lookup/", async (c) => {
  const body = await c.req.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
  if (CL_TOKEN) headers["Authorization"] = `Token ${CL_TOKEN}`;

  const res = await fetch(`${CL_BASE}/citation-lookup/`, { method: "POST", headers, body });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
