import { supabase } from "@/lib/supabase";

export interface AiUsageEntry {
  matterId: string;
  tab: string;
  inputTok: number;
  outputTok: number;
  memInjected: number;
  model: string;
}

export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return; // not logged in, skip

  await supabase.from("ai_usage").insert({
    user_id: userId,
    matter_id: entry.matterId,
    tab: entry.tab,
    input_tok: entry.inputTok,
    output_tok: entry.outputTok,
    mem_injected: entry.memInjected,
    model: entry.model,
  });
}
