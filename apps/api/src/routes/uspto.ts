import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const BASE = "https://api.patentsview.org";

export const usptoRouter = new Hono();
usptoRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

// No API key required
usptoRouter.get("/patents", async (c) => {
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${BASE}/patents/query${params ? `?${params}` : ""}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});

usptoRouter.post("/patents", async (c) => {
  const body = await c.req.text();
  const res = await fetch(`${BASE}/patents/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body,
  });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});

usptoRouter.get("/assignees", async (c) => {
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${BASE}/assignees/query${params ? `?${params}` : ""}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
