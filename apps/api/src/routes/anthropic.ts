import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const anthropicRpm = Number(process.env.ANTHROPIC_RPM ?? 60);
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(z.any())]),
});

const BodySchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().positive().max(32000),
  messages: z.array(MessageSchema).min(1),
  system: z.string().optional(),
  tools: z.array(z.any()).optional(),
  stream: z.boolean().optional(),
});

export const anthropicRouter = new Hono();

anthropicRouter.post(
  "/messages",
  requireAuth,
  rateLimit("anthropic", anthropicRpm),
  async (c) => {
    const parsed = BodySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-05-14",
      },
      body: JSON.stringify(parsed.data),
    });

    // Pass status and body straight through — preserves error shapes the frontend expects
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }
);
