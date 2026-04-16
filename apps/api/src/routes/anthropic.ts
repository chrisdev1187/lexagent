import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/ratelimit.js";

const anthropicRpm = Number(process.env.ANTHROPIC_RPM ?? 60);
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ── Provider waterfall ────────────────────────────────────────────────────────
// Tried in order. Skipped if key not set. 429 → skip to next. Other errors → log + skip.
// All use OpenAI-compatible chat completions format.

interface Provider {
  name: string;
  key: string | undefined;
  url: string;
  model: (requestedModel: string) => string;
  extraHeaders?: Record<string, string>;
}

const PROVIDERS: Provider[] = [
  {
    name: "groq",
    key: process.env.GROQ_API_KEY,
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: (m) => m.includes("haiku") ? "llama3-8b-8192" : "llama-3.3-70b-versatile",
  },
  {
    name: "cerebras",
    key: process.env.CEREBRAS_API_KEY,
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: (m) => m.includes("haiku") ? "llama3.1-8b" : "llama-3.3-70b",
  },
  {
    name: "sambanova",
    key: process.env.SAMBANOVA_API_KEY,
    url: "https://api.sambanova.ai/v1/chat/completions",
    model: () => "Meta-Llama-3.3-70B-Instruct",
  },
  {
    name: "openrouter",
    key: process.env.OPENROUTER_API_KEY,
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: () => "meta-llama/llama-3.3-70b-instruct:free",
    extraHeaders: {
      "HTTP-Referer": "https://lexagent.app",
      "X-Title": "LexAgent",
    },
  },
  {
    name: "nvidia",
    key: process.env.NVIDIA_API_KEY,
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: () => "meta/llama-3.3-70b-instruct",
  },
  {
    name: "xai",
    key: process.env.XAI_API_KEY,
    url: "https://api.x.ai/v1/chat/completions",
    model: () => "grok-3-mini-beta",
  },
  {
    name: "mistral",
    key: process.env.MISTRAL_API_KEY,
    url: "https://api.mistral.ai/v1/chat/completions",
    model: () => "mistral-small-latest",
  },
  {
    // Gemini via OpenAI-compatible endpoint (no format translation needed)
    name: "gemini",
    key: process.env.GEMINI_API_KEY,
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: () => "gemini-2.0-flash",
  },
  {
    // Second Gemini account (rotates when first hits rate limit)
    name: "gemini-2",
    key: process.env.GEMINI_API_KEY_2,
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: () => "gemini-2.0-flash",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Flatten Anthropic content blocks to plain string for OpenAI-compat APIs.
 *  - text blocks → preserved as-is
 *  - document blocks → replaced with a notice (free providers don't accept base64 files)
 *  - tool_use / tool_result / image blocks → stripped silently
 */
function flattenContent(content: string | Array<{ type: string; text?: string; source?: { type?: string; media_type?: string }; name?: string }>): string {
  if (typeof content === "string") return content;

  const parts: string[] = [];
  let docCount = 0;

  for (const b of content) {
    if (b.type === "text") {
      if (b.text) parts.push(b.text);
    } else if (b.type === "document") {
      docCount++;
      const mediaType = b.source?.media_type ?? "document";
      parts.push(`[Document ${docCount}: ${mediaType} — content not available with current provider. Respond based on the text query only.]`);
    }
    // image, tool_use, tool_result → silently omitted (not supported by free providers)
  }

  return parts.join("\n");
}

interface ProviderResult {
  text: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
}

/** Try each provider in order, skip on missing key or rate-limit, return first success */
async function tryProviders(
  messages: Array<{ role: string; content: string | Array<any> }>,
  system: string | undefined,
  maxTokens: number,
  requestedModel: string
): Promise<ProviderResult> {
  // Build OpenAI message array (system as first message if present)
  const oaiMessages: Array<{ role: string; content: string }> = [];
  if (system) oaiMessages.push({ role: "system", content: system });
  for (const m of messages) {
    oaiMessages.push({ role: m.role, content: flattenContent(m.content) });
  }

  const errors: string[] = [];

  for (const provider of PROVIDERS) {
    if (!provider.key) continue;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.key}`,
      ...provider.extraHeaders,
    };

    let res: Response;
    try {
      res = await fetch(provider.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: provider.model(requestedModel),
          max_tokens: maxTokens,
          messages: oaiMessages,
        }),
      });
    } catch (err) {
      errors.push(`${provider.name}: network error — ${err}`);
      continue;
    }

    if (res.status === 429) {
      errors.push(`${provider.name}: rate limited`);
      console.warn(`[llm-router] ${provider.name} rate limited — trying next provider`);
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      errors.push(`${provider.name}: ${res.status} — ${errText.slice(0, 120)}`);
      console.warn(`[llm-router] ${provider.name} error ${res.status} — trying next provider`);
      continue;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    console.log(`[llm-router] served by ${provider.name} (in:${inputTokens} out:${outputTokens})`);

    return { text, provider: provider.name, inputTokens, outputTokens };
  }

  throw new Error(`All providers exhausted.\n${errors.join("\n")}`);
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

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

// ── Router ────────────────────────────────────────────────────────────────────

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

    const { model, max_tokens, messages, system } = parsed.data;

    // ── Free provider waterfall ───────────────────────────────────────────
    const hasAnyFreeKey = PROVIDERS.some((p) => !!p.key);

    if (hasAnyFreeKey) {
      try {
        const result = await tryProviders(messages, system, max_tokens, model);

        // Return in Anthropic response format so the frontend never needs to change
        return c.json({
          id: `msg_${Date.now()}`,
          type: "message",
          role: "assistant",
          model,
          content: [{ type: "text", text: result.text }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: result.inputTokens,
            output_tokens: result.outputTokens,
          },
          // Expose which provider served this response (visible in dev tools)
          _provider: result.provider,
        });
      } catch (err) {
        return c.json(
          { type: "error", error: { type: "provider_error", message: String(err) } },
          502
        );
      }
    }

    // ── Paid Anthropic fallback ───────────────────────────────────────────
    if (!ANTHROPIC_KEY) {
      return c.json(
        {
          type: "error",
          error: {
            type: "configuration_error",
            message:
              "No LLM configured. Add GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or another provider key to apps/api/.env",
          },
        },
        503
      );
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(parsed.data),
    });

    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }
);
