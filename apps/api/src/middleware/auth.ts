import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

/**
 * requireAuth — verifies the Supabase JWT from Authorization: Bearer <token>.
 * Attaches userId to Hono context. Rejects with 401 if missing or invalid.
 */
export const requireAuth = createMiddleware(async (c, next) => {
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
