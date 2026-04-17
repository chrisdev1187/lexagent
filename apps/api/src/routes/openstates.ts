import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const KEY = process.env.OPENSTATES_KEY ?? "";
const BASE = "https://v3.openstates.org";

export const openstatesRouter = new Hono();
openstatesRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

openstatesRouter.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/openstates/, "");
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${BASE}${path}${params ? `?${params}` : ""}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (KEY) headers["X-API-Key"] = KEY;

  const res = await fetch(url, { headers });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
