import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";

const FREE_PLAN_ID = "free";

declare module "hono" {
  interface ContextVariableMap {
    freeTierTool: string | null;
    freeTierMatterId: string | null;
  }
}

/**
 * checkFreeTier — runs after checkQuota, before the AI handler.
 * For users on the "free" plan: enforces 1 AI call per tool per matter.
 * Paid users and admins are passed through unconditionally.
 */
export const checkFreeTier = createMiddleware(async (c, next) => {
  const userId = c.get("userId");
  if (!supabase || userId === "anon") return next();

  // Check if user is on free plan
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("plan_id, role")
    .eq("user_id", userId)
    .single();

  if (!roleRow || roleRow.plan_id !== FREE_PLAN_ID || roleRow.role === "admin") {
    return next();
  }

  // Parse tool_name and matter_id from request body
  let toolName: string | null = null;
  let matterId: string | null = null;
  try {
    const body = await c.req.json();
    toolName  = body.tool_name  ?? null;
    matterId  = body.matter_id  ?? null;
    // Restore body so downstream middleware can re-read it
    c.req.raw = new Request(c.req.raw.url, {
      method:  c.req.raw.method,
      headers: c.req.raw.headers,
      body:    JSON.stringify(body),
    });
  } catch {
    return next();
  }

  if (!toolName || !matterId) return next();

  // Check if this (user, matter, tool) combination has already been used
  const { data: existing } = await supabase
    .from("free_tier_usage")
    .select("id")
    .eq("user_id", userId)
    .eq("matter_id", matterId)
    .eq("tool", toolName)
    .maybeSingle();

  if (existing) {
    console.log(JSON.stringify({
      tag:      "free_tier",
      event:    "exhausted",
      userId,
      tool:     toolName,
      matterId,
    }));
    return c.json(
      {
        error:       "free_tier_exhausted",
        tool:        toolName,
        matter_id:   matterId,
        message:     `Free plan allows 1 use of "${toolName}" per matter. Upgrade to use it again.`,
        upgrade_url: "/settings/billing",
      },
      429
    );
  }

  // Store for post-response recording
  c.set("freeTierTool",     toolName);
  c.set("freeTierMatterId", matterId);

  await next();

  // Record usage after successful response (2xx only)
  if (c.res.status >= 200 && c.res.status < 300) {
    await supabase
      .from("free_tier_usage")
      .insert({ user_id: userId, matter_id: matterId, tool: toolName })
      .then(({ error }) => {
        if (error && error.code !== "23505") { // 23505 = unique_violation (race condition, safe to ignore)
          console.warn(JSON.stringify({ tag: "free_tier", event: "insert_failed", error: error.message }));
        }
      });
  }
});
