// V1.2.3 — AI grader for Intelligence Audit
// Calls the LexAgent LLM waterfall to grade each AI feature output.

import { GRADING_RUBRIC } from "./fixture";

const API_BASE =
  process.env.E2E_API_URL ?? "https://lexagent-0o5u.onrender.com";

export interface GradeResult {
  total: number;
  legal_accuracy: number;
  citation_quality: number;
  strategic_depth: number;
  output_format: number;
  jurisdictional_correctness: number;
  motivation: string;
  issues: string[];
  raw?: string;
}

const FALLBACK_GRADE: GradeResult = {
  total: 0,
  legal_accuracy: 0,
  citation_quality: 0,
  strategic_depth: 0,
  output_format: 0,
  jurisdictional_correctness: 0,
  motivation: "Grading call failed — see raw field for details.",
  issues: ["Grader API error"],
};

export async function gradeOutput(
  feature: string,
  output: string,
  authToken: string
): Promise<GradeResult> {
  const prompt = `Feature under audit: ${feature}\n\nAI-generated output to grade:\n\n${output.slice(0, 4000)}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/anthropic/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: GRADING_RUBRIC,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    return { ...FALLBACK_GRADE, raw: String(e) };
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ...FALLBACK_GRADE, raw: `HTTP ${res.status}: ${txt}` };
  }

  let body: { content?: { text?: string }[] };
  try {
    body = await res.json();
  } catch {
    return { ...FALLBACK_GRADE, raw: "JSON parse error" };
  }

  const text = body?.content?.[0]?.text ?? "";
  // Extract JSON from response — providers sometimes wrap in prose
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { ...FALLBACK_GRADE, raw: text };
  }

  try {
    const parsed = JSON.parse(match[0]) as GradeResult;
    parsed.raw = text;
    return parsed;
  } catch {
    return { ...FALLBACK_GRADE, raw: text };
  }
}
