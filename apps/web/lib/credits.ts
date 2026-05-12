/**
 * ARES Economy v6.2
 * 1 credit = $0.05 retail AI compute value
 */
export const CREDIT_TO_USD = 0.05;

// Multipliers per 1k tokens
export const MODEL_MULTIPLIERS: Record<string, { input: number; output: number }> = {
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022":   { input: 0.25, output: 1.25 },
  "gpt-4o":                     { input: 5.0, output: 15.0 },
  "auto":                       { input: 3.0, output: 15.0 }, // default to sonnet
  "default":                    { input: 1.0, output: 5.0 },
};

export const FEATURE_BOOST: Record<string, number> = {
  "deep-research": 1.5, // 50% surcharge for multi-source coordination
  "citations":     1.2,
  "default":       1.0,
};

export interface PredictedCost {
  credits: number;
  usd: number;
}

/**
 * Estimates cost in credits based on predicted token usage.
 */
export function calculatePredictedCost(
  model: string,
  feature: string,
  inputChars: number,
  expectedOutputChars = 2000
): PredictedCost {
  const mult = MODEL_MULTIPLIERS[model] || MODEL_MULTIPLIERS.default;
  const boost = FEATURE_BOOST[feature] || FEATURE_BOOST.default;

  const inTok = Math.ceil(inputChars / 4);
  const outTok = Math.ceil(expectedOutputChars / 4);

  const usd = ((inTok / 1000) * mult.input + (outTok / 1000) * mult.output) * boost;
  const credits = Math.ceil(usd / CREDIT_TO_USD);

  return { credits, usd };
}
