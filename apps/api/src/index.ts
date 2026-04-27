import * as Sentry from "@sentry/node";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: process.env.APP_VERSION,
  environment: process.env.NODE_ENV ?? "production",
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
});
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { anthropicRouter } from "./routes/anthropic.js";
import { courtlistenerRouter } from "./routes/courtlistener.js";
import { capRouter } from "./routes/cap.js";
import { govinfoRouter } from "./routes/govinfo.js";
import { congressRouter } from "./routes/congress.js";
import { ecfrRouter } from "./routes/ecfr.js";
import { regulationsRouter } from "./routes/regulations.js";
import { edgarRouter } from "./routes/edgar.js";
import { usptoRouter } from "./routes/uspto.js";
import { openstatesRouter } from "./routes/openstates.js";
import { billingRouter } from "./routes/billing.js";
import { regionRouter } from "./routes/region.js";
import { healthDeepRouter } from "./routes/healthdeep.js";
import { debugRouter } from "./routes/debug.js";
import { telemetry } from "./middleware/telemetry.js";
import { validateSession } from "./middleware/session.js";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin; // server-to-server
      if (allowedOrigins.some((o) => origin === o || origin.endsWith(".vercel.app"))) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Session-Id", "X-Device-Fingerprint"],
    exposeHeaders: ["X-Session-Invalid", "X-Budget-USD-Spent", "X-Budget-USD-Budget", "X-Budget-Status", "X-Credits-Remaining", "X-Tier", "X-Provider"],
    maxAge: 600,
  })
);

app.use("*", logger());
app.use("*", telemetry);

// Health check — Vercel cron keep-alive + Railway probe
app.get("/health", (c) =>
  c.json({ status: "ok", service: "lexagent-api", ts: new Date().toISOString() })
);

// Global error handler — captures to Sentry
app.onError((err, c) => {
  Sentry.captureException(err);
  console.error("[lexagent-api] unhandled error", err);
  return c.json({ error: "internal_server_error" }, 500);
});

// ── Route groups ──────────────────────────────────────────────────────────
app.route("/api/anthropic", anthropicRouter);
app.route("/api/courtlistener", courtlistenerRouter);
app.route("/api/cap", capRouter);
app.route("/api/govinfo", govinfoRouter);
app.route("/api/congress", congressRouter);
app.route("/api/ecfr", ecfrRouter);
app.route("/api/regulations", regulationsRouter);
app.route("/api/edgar", edgarRouter);
app.route("/api/uspto", usptoRouter);
app.route("/api/openstates", openstatesRouter);
app.route("/api/billing", billingRouter);
app.route("/api/region", regionRouter);
app.route("/api/health/deep", healthDeepRouter);
app.route("/api/debug", debugRouter);

// ── Start ─────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port }, () => {
  console.log(`[lexagent-api] listening on http://localhost:${port}`);
});

export default app;
