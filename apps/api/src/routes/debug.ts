import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

export const debugRouter = new Hono();

// Protected by a static secret header so it's not publicly accessible.
// Call with: GET /api/debug/auth -H "X-Debug-Secret: <DEBUG_SECRET env var>"
debugRouter.get("/auth", async (c) => {
  const secret = process.env.DEBUG_SECRET;
  if (!secret || c.req.header("X-Debug-Secret") !== secret) {
    return c.json({ error: "forbidden" }, 403);
  }

  const result: Record<string, unknown> = {
    ts:                   new Date().toISOString(),
    supabase_url_set:     !!process.env.SUPABASE_URL,
    supabase_key_set:     !!process.env.SUPABASE_SERVICE_KEY,
    anthropic_key_set:    !!process.env.ANTHROPIC_API_KEY,
    groq_key_set:         !!process.env.GROQ_API_KEY,
    gemini_key_set:       !!process.env.GEMINI_API_KEY,
    supabase_url_prefix:  process.env.SUPABASE_URL?.slice(0, 30) ?? null,
    client_initialized:   !!supabase,
  };

  // Try a real Supabase query
  if (supabase) {
    const start = Date.now();
    const { data, error } = await supabase.from("plans").select("id").limit(1);
    result.supabase_query_ms  = Date.now() - start;
    result.supabase_query_ok  = !error;
    result.supabase_query_err = error?.message ?? null;
    result.supabase_rows      = (data ?? []).length;

    // Try validating a dummy token to see what error format comes back
    const { error: authErr } = await supabase.auth.getUser("test.invalid.token");
    result.supabase_auth_error_status  = (authErr as any)?.status ?? null;
    result.supabase_auth_error_message = authErr?.message ?? null;
  }

  return c.json(result);
});
