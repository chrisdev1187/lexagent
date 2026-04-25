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
    // Distinguish config/network failures from genuine bad-token errors.
    // A real bad token returns status 401 from the Supabase Auth API.
    // Network/config errors return status 0, 500, or an undefined status.
    const isTokenRejected = (error as any).status === 401;

    console.error(JSON.stringify({
      tag:             "auth",
      event:           "token_validation_failed",
      error:           error.message,
      supabaseStatus:  (error as any).status ?? null,
      isTokenRejected,
      ts:              new Date().toISOString(),
    }));

    if (!isTokenRejected) {
      // Supabase unreachable or misconfigured — allow as anon rather than hard-blocking.
      console.warn(JSON.stringify({
        tag:    "auth",
        event:  "fallback_to_anon",
        reason: "supabase_config_error",
      }));
      c.set("userId", "anon");
      return next();
    }

    return c.json({ error: "Invalid or expired token" }, 401);
  }

  if (!data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("userId", data.user.id);
  await next();
});
