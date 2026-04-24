import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";

const LS_API_KEY       = process.env.LEMON_SQUEEZY_API_KEY ?? "";
const LS_STORE_ID      = process.env.LEMON_SQUEEZY_STORE_ID ?? "";
const LS_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? "";

// JSON mapping plan_id → Lemon Squeezy variant ID
// e.g. LEMON_SQUEEZY_VARIANT_IDS={"starter":"123","professional":"456","firm":"789"}
let LS_VARIANTS: Record<string, string> = {};
try {
  LS_VARIANTS = JSON.parse(process.env.LEMON_SQUEEZY_VARIANT_IDS ?? "{}");
} catch { /* ignore */ }

export const billingRouter = new Hono();

// ── POST /api/billing/checkout ────────────────────────────────────────────────
billingRouter.post("/checkout", requireAuth, async (c) => {
  const userId = c.get("userId");
  const { plan_id, redirect_url } = await c.req.json<{ plan_id: string; redirect_url?: string }>();

  const variantId = LS_VARIANTS[plan_id];
  if (!variantId) {
    return c.json({ error: "Unknown plan" }, 400);
  }

  if (!LS_API_KEY || !LS_STORE_ID) {
    return c.json({ error: "Billing not configured" }, 503);
  }

  // Get user email for pre-fill
  let email = "";
  if (supabase) {
    const { data } = await supabase.auth.admin.getUserById(userId);
    email = data?.user?.email ?? "";
  }

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: { embed: false },
        checkout_data: {
          email,
          custom: { user_id: userId },
        },
        product_options: {
          redirect_url: redirect_url ?? `${process.env.APP_URL ?? "https://lexagent-ochre.vercel.app"}/settings/billing?success=1`,
        },
      },
      relationships: {
        store:   { data: { type: "stores",   id: LS_STORE_ID } },
        variant: { data: { type: "variants",  id: variantId  } },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${LS_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ error: "Checkout creation failed", detail: err }, 502);
  }

  const json = await res.json() as any;
  return c.json({ url: json.data?.attributes?.url });
});

// ── GET /api/billing/portal ───────────────────────────────────────────────────
billingRouter.get("/portal", requireAuth, async (c) => {
  const userId = c.get("userId");

  if (!supabase) return c.json({ error: "Billing not configured" }, 503);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("ls_customer_id, customer_portal_url")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub?.ls_customer_id) {
    return c.json({ error: "No active subscription found" }, 404);
  }

  // Prefer stored portal URL from webhook, fall back to generic orders page
  const portalUrl = sub.customer_portal_url
    ?? `https://app.lemonsqueezy.com/my-orders?customer_id=${sub.ls_customer_id}`;
  return c.json({ url: portalUrl });
});

// ── POST /api/billing/webhook ─────────────────────────────────────────────────
billingRouter.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-signature") ?? "";

  // Verify HMAC-SHA256 signature
  if (LS_WEBHOOK_SECRET) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(LS_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = hexToBytes(signature);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(rawBody));
    if (!valid) return c.json({ error: "Invalid signature" }, 401);
  }

  const event = JSON.parse(rawBody) as any;
  const eventName: string = event.meta?.event_name ?? "";
  const attrs = event.data?.attributes ?? {};
  const userId: string | undefined = event.meta?.custom_data?.user_id;

  if (!supabase || !userId) return c.json({ ok: true });

  // Map plan by variant ID
  const lsVariantId = String(attrs.variant_id ?? "");
  const planId = Object.entries(LS_VARIANTS).find(([, v]) => v === lsVariantId)?.[0] ?? "starter";

  if (eventName === "subscription_created" || eventName === "subscription_updated") {
    await supabase.from("subscriptions").upsert({
      user_id:              userId,
      plan_id:              planId,
      ls_subscription_id:   String(event.data?.id ?? ""),
      ls_customer_id:       String(attrs.customer_id ?? ""),
      ls_order_id:          String(attrs.order_id ?? ""),
      ls_variant_id:        lsVariantId,
      status:               attrs.status ?? "active",
      seats:                1,
      current_period_start: attrs.current_period_start ?? null,
      current_period_end:   attrs.current_period_end   ?? null,
      customer_portal_url:  attrs.urls?.customer_portal ?? null,
    }, { onConflict: "ls_subscription_id" });

    // Sync plan on user_roles
    await supabase
      .from("user_roles")
      .update({ plan_id: planId })
      .eq("user_id", userId);

  } else if (eventName === "subscription_cancelled") {
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("ls_subscription_id", String(event.data?.id ?? ""));

    await supabase
      .from("user_roles")
      .update({ plan_id: "starter" })
      .eq("user_id", userId);

  } else if (eventName === "subscription_payment_success") {
    await supabase
      .from("subscriptions")
      .update({
        status:              "active",
        plan_id:             planId,
        current_period_start: attrs.current_period_start ?? null,
        current_period_end:   attrs.current_period_end   ?? null,
        customer_portal_url:  attrs.urls?.customer_portal ?? null,
      })
      .eq("ls_subscription_id", String(event.data?.id ?? ""));

    await supabase
      .from("user_roles")
      .update({ plan_id: planId })
      .eq("user_id", userId);
  }

  return c.json({ ok: true });
});

// ── POST /api/billing/premium-lead ───────────────────────────────────────────
billingRouter.post("/premium-lead", async (c) => {
  const body = await c.req.json<{ email: string; full_name?: string; firm?: string; message?: string }>();

  if (!body.email) return c.json({ error: "email required" }, 400);

  if (supabase) {
    await supabase.from("premium_leads").insert({
      email:     body.email,
      full_name: body.full_name ?? null,
      firm:      body.firm     ?? null,
      message:   body.message  ?? null,
    });
  }

  return c.json({ ok: true });
});

function hexToBytes(hex: string): ArrayBuffer {
  const buf = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return buf;
}
