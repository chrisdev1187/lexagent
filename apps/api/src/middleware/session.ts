import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";

export const validateSession = createMiddleware(async (c, next) => {
  const userId = (() => { try { return c.get("userId") as string | undefined; } catch { return undefined; } })();
  if (!supabase || !userId || userId === "anon") return next();

  const sessionId = c.req.header("X-Session-Id");
  if (!sessionId) return next(); // old clients without session tracking — allow through

  try {
    const { data } = await supabase
      .from("user_sessions_ext")
      .select("is_revoked")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (data?.is_revoked === true) {
      return c.json({ error: "Session revoked. Please sign in again." }, 401, {
        "X-Session-Invalid": "true",
      });
    }
  } catch {
    // DB unavailable — fail open to avoid blocking legitimate traffic
  }

  await next();
});
