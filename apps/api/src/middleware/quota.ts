import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";

// Sonnet 4.6 pricing (USD per token)
const COST_PER_INPUT_TOKEN  = 3   / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15  / 1_000_000;

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    byok: boolean;
    usdBudget: number;
    usdSpent: number;
  }
}

export interface UsagePayload {
  toolName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  matterId?: string;
}

/**
 * checkQuota — runs before the AI call.
 * Loads the user's plan budget and current month spend.
 * Sets ctx vars: byok, usdBudget, usdSpent.
 * Returns 429 if the user is hard-blocked (>110% of budget).
 */
export const checkQuota = createMiddleware(async (c, next) => {
  const userId = c.get("userId");

  // No Supabase → no quota enforcement
  if (!supabase || userId === "anon") {
    c.set("byok", false);
    c.set("usdBudget", 999);
    c.set("usdSpent", 0);
    return next();
  }

  // Fetch user role + plan in one query
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("byok_active, byok_key, plan_id, plans(usd_budget)")
    .eq("user_id", userId)
    .single();

  const byok = !!roleRow?.byok_active && !!roleRow?.byok_key;
  const usdBudget: number = (roleRow?.plans as any)?.usd_budget ?? 8;

  c.set("byok", byok);
  c.set("usdBudget", usdBudget);

  if (byok) {
    c.set("usdSpent", 0);
    return next(); // BYOK users bypass budget enforcement
  }

  // Current month spend
  const now = new Date();
  const { data: monthRow } = await supabase
    .from("usage_monthly")
    .select("total_usd_cost")
    .eq("user_id", userId)
    .eq("year",  now.getFullYear())
    .eq("month", now.getMonth() + 1)
    .single();

  const usdSpent: number = Number(monthRow?.total_usd_cost ?? 0);
  c.set("usdSpent", usdSpent);

  // Hard block at 110%
  if (usdSpent >= usdBudget * 1.1) {
    return c.json(
      {
        error: "budget_exceeded",
        message: "Monthly AI budget exhausted. Please upgrade your plan.",
        usdBudget,
        usdSpent,
      },
      429
    );
  }

  // Rate-limit at 100% — allow but add header so frontend can warn
  if (usdSpent >= usdBudget) {
    c.header("X-Budget-Status", "rate_limited");
  } else if (usdSpent >= usdBudget * 0.8) {
    c.header("X-Budget-Status", "warning");
  }

  return next();
});

/**
 * logUsage — call AFTER the AI response to record usage_events.
 * Does nothing if Supabase is not configured or user is anon.
 */
export async function logUsage(
  userId: string,
  payload: UsagePayload,
  byok: boolean
): Promise<void> {
  if (!supabase || userId === "anon") return;

  const usdCost =
    payload.inputTokens  * COST_PER_INPUT_TOKEN +
    payload.outputTokens * COST_PER_OUTPUT_TOKEN;

  await supabase.from("usage_events").insert({
    user_id:       userId,
    matter_id:     payload.matterId ?? null,
    tool_name:     payload.toolName,
    model:         payload.model,
    input_tokens:  payload.inputTokens,
    output_tokens: payload.outputTokens,
    usd_cost:      usdCost,
    byok,
  });
}
