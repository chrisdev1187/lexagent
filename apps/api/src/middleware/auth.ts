import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  if (!supabase) {
    c.set("userId", "anon");
    return next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }
  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    // Bad token: status 401. Infra failure: status 0/500/undefined.
    const supabaseStatus = (error as { status?: number }).status;
    const isTokenRejected = supabaseStatus === 401;

    console.error(JSON.stringify({
      tag:             "auth",
      event:           "token_validation_failed",
      error:           error.message,
      supabaseStatus:  supabaseStatus ?? null,
      isTokenRejected,
      ts:              new Date().toISOString(),
    }));

    if (!isTokenRejected) {
      // Fail closed on infra failure. Previously fell through to anon, which
      // masked Supabase outages and let unauthenticated traffic into
      // authenticated routes.
      return c.json({ error: "Auth service unavailable" }, 503);
    }
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  if (!data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("userId", data.user.id);
  await next();
});
