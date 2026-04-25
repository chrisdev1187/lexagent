import { createMiddleware } from "hono/factory";

export const telemetry = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const latencyMs = Date.now() - start;
  const userId = (() => { try { return c.get("userId") as string | undefined; } catch { return undefined; } })();

  console.log(JSON.stringify({
    tag:       "http",
    method:    c.req.method,
    path:      new URL(c.req.url).pathname,
    status:    c.res.status,
    latencyMs,
    userId:    userId ?? "unknown",
    ts:        new Date().toISOString(),
  }));
});
