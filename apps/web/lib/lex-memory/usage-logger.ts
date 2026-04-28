import { supabase } from "@/lib/supabase";

export interface AiUsageEntry {
  matterId: string;
  tab: string;
  inputTok: number;
  outputTok: number;
  memInjected: number;
  model: string;
  promptVersion?: string | null;        // ARES_PROMPT_VERSION the call ran under
  mode?: string | null;                 // shadow JSON "mode" — LITE | STANDARD | DEEP
  toolCalls?: unknown[] | null;         // shadow JSON "tool_requests"
  criticScore?: number | null;          // v6 evaluator-optimizer rubric score
}

export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  await supabase.from("ai_usage").insert({
    user_id: userId,
    matter_id: entry.matterId,
    tab: entry.tab,
    input_tok: entry.inputTok,
    output_tok: entry.outputTok,
    mem_injected: entry.memInjected,
    model: entry.model,
    prompt_version: entry.promptVersion ?? null,
    mode: entry.mode ?? null,
    tool_calls: entry.toolCalls ?? null,
    critic_score: entry.criticScore ?? null,
  });
}
