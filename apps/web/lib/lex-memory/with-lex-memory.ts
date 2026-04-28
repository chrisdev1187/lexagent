import { Matter } from "@/providers/matters-provider";
import { anthropicFetch, AnthropicFetchOptions } from "@/lib/api";
import { ARES_PROMPT_VERSION } from "@/lib/settings";
import { LexMemory, TabId } from "./types";
import { bootstrapMemory } from "./bootstrap";
import { buildContext } from "./build-context";
import { extractDelta, parseAresShadow } from "./extract";
import { mergeMemory } from "./merge";
import { BUDGET_DEFAULT } from "./tokens";
import { logAiUsage } from "./usage-logger";

export interface LexMemoryOpts {
  tab: TabId;
  budget?: number;
}

export type UpdateMatterFn = (updated: Matter | ((prev: Matter) => Matter)) => Promise<void>;

function getOrBootstrap(matter: Matter): LexMemory {
  const stored = matter.lexMemory as LexMemory | undefined;
  if (stored?.version === 1) return stored;
  return bootstrapMemory(matter);
}

function extractText(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const content = j["content"];
  if (Array.isArray(content) && content[0] && typeof (content[0] as Record<string, unknown>)["text"] === "string") {
    return (content[0] as { text: string }).text;
  }
  return null;
}

function extractUsage(json: unknown): { input_tokens: number; output_tokens: number } | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const usage = j["usage"] as Record<string, unknown> | undefined;
  if (usage && typeof usage["input_tokens"] === "number" && typeof usage["output_tokens"] === "number") {
    return { input_tokens: usage["input_tokens"] as number, output_tokens: usage["output_tokens"] as number };
  }
  if (usage && typeof usage["prompt_tokens"] === "number") {
    return {
      input_tokens: usage["prompt_tokens"] as number,
      output_tokens: (usage["completion_tokens"] as number) ?? 0,
    };
  }
  return null;
}

export function withLexMemory(
  matter: Matter,
  updateMatter: UpdateMatterFn,
  opts: LexMemoryOpts
) {
  return async function lexFetch(
    body: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
    options?: AnthropicFetchOptions
  ): Promise<Response> {
    const mem = getOrBootstrap(matter);
    const { text: ctxBlock, tokensUsed: memInjected } = buildContext(mem, {
      budget: opts.budget ?? BUDGET_DEFAULT,
      currentTab: opts.tab,
    });

    const baseBody = ctxBlock
      ? { ...body, system: `${ctxBlock}\n\n${body["system"] ?? ""}`.trim() }
      : { ...body };

    // Phase 12 Slice A — usage attribution. Backend reads these to write
    // usage_events.matter_id and usage_events.tool_name.
    const patchedBody = { ...baseBody, matter_id: matter.id, tool_name: opts.tab };

    const res = await anthropicFetch(patchedBody, extraHeaders, options);

    const clone = res.clone();
    void (async () => {
      try {
        if (!clone.ok) return;
        const json = await clone.json() as unknown;
        const text = extractText(json);
        const shadow = text ? parseAresShadow(text) : null;
        if (text) {
          const delta = extractDelta(text, opts.tab);
          // Functional update: re-reads fresh matter from state, avoids clobbering
          // concurrent writes made between call-time and extraction completion.
          await updateMatter((prev) => {
            if (prev.id !== matter.id) return prev;
            const currentMem = getOrBootstrap(prev);
            const merged = mergeMemory(currentMem, delta);
            return { ...prev, lexMemory: merged };
          });
        }
        const usage = extractUsage(json);
        await logAiUsage({
          matterId: matter.id,
          tab: opts.tab,
          inputTok: usage?.input_tokens ?? 0,
          outputTok: usage?.output_tokens ?? 0,
          memInjected,
          model: (body["model"] as string) ?? "unknown",
          promptVersion: shadow?.prompt_version?.replace(/^ARES-/, "") ?? ARES_PROMPT_VERSION,
          mode: shadow?.mode ?? null,
          toolCalls: shadow?.tool_requests ?? null,
          criticScore: null,
        }).catch(() => {});
      } catch (e) {
        console.warn("[lex-memory] extraction failed:", (e as Error).message);
      }
    })();

    return res;
  };
}
