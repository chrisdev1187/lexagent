import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const BASE = "https://data.sec.gov";
const SEARCH_BASE = "https://efts.sec.gov/LATEST/search-index";

export const edgarRouter = new Hono();
edgarRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

// SEC requires a descriptive User-Agent — no API key needed
const UA = "LexAgent/1.0 (legal research; contact: admin@lexagent.app)";

edgarRouter.get("/search", async (c) => {
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${SEARCH_BASE}?${params}`;

  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});

edgarRouter.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/edgar/, "");
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${BASE}${path}${params ? `?${params}` : ""}`;

  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
