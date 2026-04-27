/** 1 credit = $0.65 retail AI compute value */
export const CREDIT_TO_USD = 0.65;

export const CREDIT_COSTS: Record<string, number> = {
  research:        10,
  strategy:        10,
  draft:           10,
  "deep-research": 15,
  conflict:         8,
  judge:            8,
  citations:        5,
  vault_upload:     2,
  default:          5,
};
