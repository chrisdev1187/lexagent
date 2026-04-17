import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const legalRpm = Number(process.env.LEGAL_RPM ?? 120);
const CAP_BASE = "https://api.case.law/v1";

export const capRouter = new Hono();
capRouter.use("/*", requireAuth, rateLimit("legal", legalRpm));

// Harvard CAP API was decommissioned in 2024 — all requests return 301 → docs page.
// Return a clean 410 Gone so the frontend can handle gracefully instead of rendering HTML.
capRouter.get("/*", (c) => {
  return c.json({
    error: "Harvard Caselaw Access Project API decommissioned",
    message: "api.case.law shut down in 2024. Use CourtListener (/api/courtlistener) for case law search.",
  }, 410);
});
