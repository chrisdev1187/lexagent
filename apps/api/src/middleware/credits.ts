import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";

// Credit costs per action type
export const CREDIT_COSTS: Record<string, number> = {
  research:       10,
  strategy:       10,
  draft:          10,
  "deep-research": 15,
  conflict:        8,
  judge:           8,
  citations:       5,
  vault_upload:    2,
  default:         5,
};

// 1 credit = $0.65 retail value
export const CREDIT_TO_USD = 0.65;

declare module "hono" {
  interface ContextVariableMap {
    creditsRemaining: number;
    creditCost: number;
  }
}

/**
 * checkCredits — runs before AI call for paid-plan users.
 * Free-plan users are handled by checkFreeTier and passed through here.
 * Calls deduct_credits() RPC which atomically checks + deducts + logs.
 * Sets X-Credits-Remaining and X-Credits-Cost headers on response.
 */
export const checkCredits = createMiddleware(async (c, next) => {
  const userId = c.get("userId");
  if (!supabase || userId === "anon") return next();

  // Parse action context from body
  let toolName = "default";
  let matterId: string | null = null;
  let bodyClone: unknown = null;

  try {
    bodyClone = await c.req.json();
    toolName  = (bodyClone as Record<string, string>).tool_name ?? "default";
    matterId  = (bodyClone as Record<string, string>).matter_id ?? null;
    // Restore body for downstream handlers
    c.req.raw = new Request(c.req.raw.url, {
      method:  c.req.raw.method,
      headers: c.req.raw.headers,
      body:    JSON.stringify(bodyClone),
    });
  } catch {
    // If body can't be parsed, continue — downstream will handle it
    return next();
  }

  const cost = CREDIT_COSTS[toolName] ?? CREDIT_COSTS.default;

  const { data, error } = await supabase.rpc("deduct_credits", {
    p_user_id:   userId,
    p_action:    toolName,
    p_cost:      cost,
    p_matter_id: matterId ?? undefined,
  });

  if (error) {
    // RPC failure is non-fatal — log and allow through
    console.warn("[credits] deduct_credits RPC failed:", error.message);
    return next();
  }

  const result = data as { ok: boolean; remaining: number; reason: string };

  c.set("creditsRemaining", result.remaining);
  c.set("creditCost", cost);

  if (!result.ok && result.reason === "credit_exhausted") {
    return c.json(
      {
        error:       "credit_exhausted",
        message:     "Monthly credit allowance exhausted. Upgrade your plan to continue.",
        remaining:   result.remaining,
        credit_cost: cost,
        upgrade_url: "/settings/billing",
      },
      429
    );
  }

  await next();

  // Attach credit headers to response
  c.header("X-Credits-Remaining", String(result.remaining));
  c.header("X-Credits-Cost",      String(cost));
  c.header("X-Credits-USD-Value", (cost * CREDIT_TO_USD).toFixed(2));
});

/**
 * logCreditAction — call after non-AI actions (vault upload, etc.)
 * to record them in action_log without blocking the response.
 */
export async function logCreditAction(
  userId: string,
  action: string,
  matterId?: string
): Promise<void> {
  if (!supabase || userId === "anon") return;
  const cost = CREDIT_COSTS[action] ?? 0;
  if (cost === 0) return;

  await supabase.rpc("deduct_credits", {
    p_user_id:   userId,
    p_action:    action,
    p_cost:      cost,
    p_matter_id: matterId,
  }).catch((e: Error) => console.warn("[credits] logCreditAction failed:", e.message));
}
