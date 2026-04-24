"use client";

import { useState, useEffect } from "react";
import { getBudgetState, subscribeBudget, BudgetState } from "@/lib/budget-store";

export function useBudgetStatus(): BudgetState {
  const [state, setState] = useState<BudgetState>(getBudgetState);

  useEffect(() => {
    return subscribeBudget(() => setState(getBudgetState()));
  }, []);

  return state;
}
