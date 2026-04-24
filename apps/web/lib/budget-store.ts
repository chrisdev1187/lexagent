export type BudgetStatus = "ok" | "warning" | "rate_limited" | "exceeded";

export interface BudgetState {
  status: BudgetStatus;
  spent: number;
  budget: number;
  /** Monotonic counter — bumped on every update so hooks can re-run effects. */
  seq: number;
}

const DEFAULT: BudgetState = { status: "ok", spent: 0, budget: 0, seq: 0 };
let _state: BudgetState = { ...DEFAULT };
const _listeners = new Set<() => void>();

export function getBudgetState(): BudgetState {
  return _state;
}

export function setBudgetState(next: Omit<BudgetState, "seq">): void {
  _state = { ...next, seq: _state.seq + 1 };
  _listeners.forEach((fn) => fn());
}

export function subscribeBudget(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
