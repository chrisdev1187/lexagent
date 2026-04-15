import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { anthropicRouter } from "./routes/anthropic.js";
import { courtlistenerRouter } from "./routes/courtlistener.js";
import { capRouter } from "./routes/cap.js";
import { govinfoRouter } from "./routes/govinfo.js";

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
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);

app.use("*", logger());

// Health check — Railway / Vercel probe
app.get("/health", (c) => c.json({ status: "ok", service: "lexagent-api" }));

// ── Route groups ──────────────────────────────────────────────────────────
app.route("/api/anthropic", anthropicRouter);
app.route("/api/courtlistener", courtlistenerRouter);
app.route("/api/cap", capRouter);
app.route("/api/govinfo", govinfoRouter);

// ── Start ─────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port }, () => {
  console.log(`[lexagent-api] listening on http://localhost:${port}`);
});

export default app;
