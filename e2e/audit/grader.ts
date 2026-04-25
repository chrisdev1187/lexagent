// V1.3.0 — AI grader: direct Anthropic when E2E_GRADER_KEY set, waterfall fallback
// Fixes circular grading (Groq Haiku grading Groq output = unreliable)

import { GRADING_RUBRIC } from "./fixture";

const API_BASE = process.env.E2E_API_URL ?? "https://lexagent-0o5u.onrender.com";
const GRADER_KEY = process.env.E2E_GRADER_KEY ?? "";
const GRADER_URL = process.env.E2E_GRADER_URL ?? "https://api.anthropic.com/v1/messages";

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

async function callDirect(prompt: string): Promise<Response> {
  return fetch(GRADER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": GRADER_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      temperature: 0,
      system: GRADING_RUBRIC,
      messages: [{ role: "user", content: prompt }],
    }),
  });
}

async function callWaterfall(prompt: string, authToken: string): Promise<Response> {
  return fetch(`${API_BASE}/api/anthropic/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      model: "auto",
      max_tokens: 1200,
      temperature: 0,
      system: GRADING_RUBRIC,
      messages: [{ role: "user", content: prompt }],
    }),
  });
}

export async function gradeOutput(
  feature: string,
  output: string,
  authToken: string
): Promise<GradeResult> {
  const prompt = `Feature under audit: ${feature}\n\nAI-generated output to grade:\n\n${output.slice(0, 4000)}`;

  let res: Response;
  try {
    res = GRADER_KEY
      ? await callDirect(prompt)
      : await callWaterfall(prompt, authToken);
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
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { ...FALLBACK_GRADE, raw: text };

  try {
    const parsed = JSON.parse(match[0]) as GradeResult;
    parsed.raw = text;
    return parsed;
  } catch {
    return { ...FALLBACK_GRADE, raw: text };
  }
}
