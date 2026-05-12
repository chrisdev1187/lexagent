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
import { aresCritic, ARES_TOOLS, listTools, toolToAnthropicWire } from "@/lib/ares";
import { parseToolRequests, dispatchTool } from "@/lib/ares/tools/registry";
import type { CiteVerifyOutput } from "@/lib/ares/tools/types";

export type AresStatusEvent =
  | { type: "thinking"; message: string }
  | { type: "tool_start"; tool: string; args: any }
  | { type: "tool_end"; tool: string; output: any }
  | { type: "critic_start" }
  | { type: "critic_end"; score: number; passed: boolean }
  | { type: "correction_start"; reason: string };

export interface LexMemoryOpts {
  tab: TabId;
  budget?: number;
  onStatus?: (event: AresStatusEvent) => void;
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
  const emit = (event: AresStatusEvent) => opts.onStatus?.(event);

  return async function lexFetch(
    body: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
    options?: AnthropicFetchOptions
  ): Promise<Response> {
    const mem = getOrBootstrap(matter);
    const { text: ctxBlock, tokensUsed: memInjected } = buildContext(mem, {
      budget: opts.budget ?? BUDGET_DEFAULT,
      currentTab: opts.tab,
      matterJurisdiction: matter.jurisdiction,
    });

    const baseBody = ctxBlock
      ? { ...body, system: `${ctxBlock}\n\n${body["system"] ?? ""}`.trim() }
      : { ...body };

    // Phase 12 Slice A — usage attribution. Backend reads these to write
    // usage_events.matter_id and usage_events.tool_name.
    emit({ type: "thinking", message: `ARES is initializing (${opts.tab})...` });
    const tools = listTools().map(toolToAnthropicWire);
    const initialBody = {
      ...baseBody,
      matter_id: matter.id,
      tool_name: opts.tab,
      tools,
    };

    let res = await anthropicFetch(initialBody, extraHeaders, options);
    emit({ type: "thinking", message: "Turn 1 complete. Analyzing response..." });

    // --- AGENTIC LOOP: Recursive Tool Handling ---
    const MAX_TURNS = 5;
    let turn = 1;
    let currentRes = res;
    let currentBody = { ...initialBody } as Record<string, unknown>;

    while (turn < MAX_TURNS) {
      const clone = currentRes.clone();
      const json = await clone.json() as any;
      const text = extractText(json);

      // Check for tool requests (v5 syntax or v6 native tools)
      const toolReqs = parseToolRequests(text ?? "");
      if (toolReqs.length === 0) break;

      turn++;
      emit({ type: "thinking", message: `Executing recursive tools (Turn ${turn})...` });

      const toolResults = await Promise.all(
        toolReqs.map(async (r) => {
          emit({ type: "tool_start", tool: r.name, args: r.args });
          const out = await dispatchTool(r.name, r.args);
          emit({ type: "tool_end", tool: r.name, output: out });
          return `TOOL_RESULT: ${r.name}\n${JSON.stringify(out)}`;
        })
      );

      currentBody = {
        ...currentBody,
        messages: [
          ...(currentBody.messages as any[]),
          { role: "assistant", content: text },
          { role: "user", content: toolResults.join("\n\n") }
        ]
      };

      currentRes = await anthropicFetch(currentBody, extraHeaders);
    }

    res = currentRes;

    // --- PHASE 14: Agentic Loop (Turn 2 — Correction & Refinement) ---
    const finalClone = res.clone();
    const finalJson = await finalClone.json() as any;
    let text = extractText(finalJson);
    let shadow = text ? parseAresShadow(text) : null;
    let json = finalJson;

    if (text) {
      // 1. Check for Cite Verification failures
      const toolReqs = parseToolRequests(text).filter((r) => r.name === "cite_verify");
      let citeFailed = false;
      if (toolReqs.length > 0) {
        emit({ type: "thinking", message: `Verifying ${toolReqs.length} citations...` });
        const results = await Promise.allSettled(
          toolReqs.map((r) => {
            emit({ type: "tool_start", tool: "cite_verify", args: r.args });
            return dispatchTool<Record<string, unknown>, CiteVerifyOutput>("cite_verify", { ...r.args })
              .then(out => {
                emit({ type: "tool_end", tool: "cite_verify", output: out });
                return out;
              });
          })
        );
        citeFailed = results.some(r => r.status === "fulfilled" && !r.value.ok);
      }

      // 2. Neuro-symbolic Statutory Alignment
      const statutes = mem.theme?.statuteRefs || [];
      let statuteMissing = false;
      if (statutes.length > 0) {
        emit({ type: "thinking", message: `Checking alignment with ${statutes.length} primary statutes...` });
        statuteMissing = !statutes.some(s => text?.includes(s));
      }

      // 3. Accuracy Critic
      emit({ type: "critic_start" });
      const criticOut = await aresCritic({
        draft: text,
        shadow,
        mode: shadow?.mode ?? null,
        posture: shadow?.posture ?? null,
        matterId: matter.id,
      }).catch(() => null);

      const lowScore = criticOut && criticOut.persisted_score !== null && criticOut.persisted_score < 0.7;
      emit({ type: "critic_end", score: criticOut?.persisted_score ?? 1, passed: !citeFailed && !statuteMissing && !lowScore });

      // TRIGGER CORRECTION TURN
      if (lowScore || citeFailed || statuteMissing) {
        const feedback = citeFailed ? "One or more of your citations could not be verified. " : "";
        const statuteFeedback = statuteMissing ? `Your response failed to reference primary matter statutes: ${statutes.join(", ")}. ` : "";
        const criticNotes = criticOut?.score?.notes?.join(" | ") ?? "General accuracy review required.";

        emit({ type: "correction_start", reason: `${feedback}${statuteFeedback}${criticNotes}` });

        const correctionPrompt = `CRITIC FEEDBACK: ${feedback}${statuteFeedback}${criticNotes}\n\nPlease revise your previous response. Ensure all primary statutes are addressed. Maintain structured shadow JSON.`;

        const correctionBody = {
          ...currentBody,
          messages: [
            ...((currentBody.messages as any[]) || []),
            { role: "assistant", content: text },
            { role: "user", content: correctionPrompt }
          ]
        } as Record<string, unknown>;

        const correctionRes = await anthropicFetch(correctionBody, extraHeaders);
        if (correctionRes.ok) {
          const corrJson = await correctionRes.json();
          const corrText = extractText(corrJson);
          if (corrText) {
            text = corrText;
            json = corrJson;
            shadow = parseAresShadow(corrText);
            // Replace the response returned to the user with the corrected version
            res = new Response(JSON.stringify(corrJson), {
              status: correctionRes.status,
              headers: correctionRes.headers,
            });
          }
        }
      }
    }

    // --- BACKGROUND: Memory Extraction & Usage Logging ---
    void (async () => {
      try {
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
        let criticScore: number | null = null;
        if (text) {
          const criticOut = await aresCritic({
            draft: text,
            shadow,
            mode: shadow?.mode ?? null,
            posture: shadow?.posture ?? null,
            matterId: matter.id,
          }).catch(() => null);
          criticScore = criticOut?.persisted_score ?? null;
        }

        // Execute cite_verify tool requests from ARES response.
        // Passes matter.facts as context for local subsequent-history detection.
        if (text) {
          const toolReqs = parseToolRequests(text).filter((r) => r.name === "cite_verify");
          if (toolReqs.length > 0) {
            const factsContext = matter.facts ? matter.facts.substring(0, 2000) : undefined;
            const results = await Promise.allSettled(
              toolReqs.map((r) =>
                dispatchTool<Record<string, unknown>, CiteVerifyOutput>("cite_verify", {
                  ...r.args,
                  context: factsContext,
                })
              )
            );
            const citeResults = results
              .map((r, i) => ({
                raw: toolReqs[i].args["raw"] as string,
                ...(r.status === "fulfilled" ? r.value : { ok: false, confidence: 0, subsequent_history: "unknown" as const }),
              }));
            await updateMatter((prev) => {
              if (prev.id !== matter.id) return prev;
              const meta = (prev.metadata ?? {}) as Record<string, unknown>;
              const existing = (meta["cite_results"] as typeof citeResults | undefined) ?? [];
              return {
                ...prev,
                metadata: { ...meta, cite_results: [...citeResults, ...existing].slice(0, 50) },
              };
            }).catch(() => {});
          }
        }

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
          criticScore,
        }).catch(() => {});
      } catch (e) {
        console.warn("[lex-memory] extraction failed:", (e as Error).message);
      }
    })();

    return res;
  };
}
