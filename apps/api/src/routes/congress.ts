import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const KEY = process.env.DATA_GOV_KEY ?? "";
const BASE = "https://api.congress.gov/v3";

export const congressRouter = new Hono();
congressRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

congressRouter.get("/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/congress/, "");
  const query = c.req.query();
  delete query["api_key"];
  if (KEY) query["api_key"] = KEY;
  query["format"] = "json";
  const url = `${BASE}${path}?${new URLSearchParams(query)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
});
