import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

/**
 * requireAuth — verifies the Supabase JWT from Authorization: Bearer <token>.
 *
 * Bypass mode: when Supabase is not configured (SUPABASE_URL not set), all
 * requests are allowed and userId is set to "anon". This lets the API run
 * without Supabase for local dev and free deployments.
 */
export const requireAuth = createMiddleware(async (c, next) => {
  // Bypass: Supabase not configured
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
  if (error || !data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  c.set("userId", data.user.id);
  await next();
});
