import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const CAP_BASE = "https://api.case.law/v1";

export const capRouter = new Hono();
capRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

// Generic GET passthrough to Harvard CAP
capRouter.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/cap/, "");
  const query = c.req.query();
  const params = new URLSearchParams(query).toString();
  const url = `${CAP_BASE}${path}${params ? `?${params}` : ""}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
