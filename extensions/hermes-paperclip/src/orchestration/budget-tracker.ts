/**
 * Budget tracker — enforces per-agent and per-department spending limits.
 *
 * Budget status maps to dispatch behavior:
 *   OK        → Agent dispatches freely
 *   WARNING   → Agent dispatches but alerts are sent
 *   SOFT_STOP → Only pre-approved tasks dispatch
 *   HARD_STOP → All dispatch blocked until budget reset
 */

import { BUDGET_CONFIGS } from "./config.ts";
import type { AgentBudget } from "./types.ts";
import { BudgetStatus, computeBudgetStatus } from "./types.ts";

/** In-memory budget state (production: backed by Supabase agent_runs table) */
const budgetState: Map<string, AgentBudget> = new Map();

/**
 * Initialize budget for an agent from config.
 */
export function initBudget(agentId: string): AgentBudget {
  const config = BUDGET_CONFIGS[agentId];
  if (!config) {
    throw new Error(`No budget config for agent: ${agentId}`);
  }

  const budget: AgentBudget = {
    agentId,
    monthlyLimitNOK: config.monthlyLimitNOK,
    spentThisMonthNOK: 0,
    costPerRun: config.costPerRun,
    alertThresholdPct: config.alertThresholdPct,
    status: BudgetStatus.OK,
    lastUpdated: new Date().toISOString(),
  };

  budgetState.set(agentId, budget);
  return budget;
}

/**
 * Get current budget for an agent.
 */
export function getBudget(agentId: string): AgentBudget {
  const budget = budgetState.get(agentId);
  if (!budget) {
    return initBudget(agentId);
  }
  return budget;
}

/**
 * Record a cost against an agent's budget.
 * Returns updated budget with new status.
 */
export function recordCost(agentId: string, costNOK: number): AgentBudget {
  const budget = getBudget(agentId);
  const newSpent = budget.spentThisMonthNOK + costNOK;
  const newStatus = computeBudgetStatus(newSpent, budget.monthlyLimitNOK, budget.alertThresholdPct);

  const updated: AgentBudget = {
    ...budget,
    spentThisMonthNOK: newSpent,
    status: newStatus,
    lastUpdated: new Date().toISOString(),
  };

  budgetState.set(agentId, updated);
  return updated;
}

/**
 * Check if an agent can dispatch (budget allows it).
 */
export function canDispatch(agentId: string): { allowed: boolean; reason?: string } {
  const budget = getBudget(agentId);

  if (budget.status === BudgetStatus.HARD_STOP) {
    return {
      allowed: false,
      reason: `Budget exhausted: ${budget.spentThisMonthNOK}/${budget.monthlyLimitNOK} NOK`,
    };
  }

  if (budget.status === BudgetStatus.SOFT_STOP) {
    return {
      allowed: false,
      reason: `Budget near limit (95%+): ${budget.spentThisMonthNOK}/${budget.monthlyLimitNOK} NOK — only pre-approved tasks allowed`,
    };
  }

  return { allowed: true };
}

/**
 * Get department budget summary (sum of all agents in department).
 */
export function getDepartmentBudget(department: "hermes" | "paperclip"): {
  totalLimitNOK: number;
  totalSpentNOK: number;
  status: BudgetStatus;
  agents: AgentBudget[];
} {
  const departmentAgents: Record<string, string[]> = {
    hermes: ["hermes-bilag-01", "hermes-rapport-01"],
    paperclip: ["paperclip-wash-01", "paperclip-onboard-01", "paperclip-tid-01"],
  };

  const agentIds = departmentAgents[department] ?? [];
  const agents = agentIds.map((id) => getBudget(id));

  const totalLimitNOK = agents.reduce((sum, a) => sum + a.monthlyLimitNOK, 0);
  const totalSpentNOK = agents.reduce((sum, a) => sum + a.spentThisMonthNOK, 0);

  // Department status = worst agent status
  const statusPriority = [
    BudgetStatus.HARD_STOP,
    BudgetStatus.SOFT_STOP,
    BudgetStatus.WARNING,
    BudgetStatus.OK,
  ];
  const worstStatus =
    statusPriority.find((s) => agents.some((a) => a.status === s)) ?? BudgetStatus.OK;

  return { totalLimitNOK, totalSpentNOK, status: worstStatus, agents };
}

/**
 * Reset all budgets (called at month boundary).
 */
export function resetMonthlyBudgets(): void {
  for (const [agentId] of budgetState) {
    initBudget(agentId);
  }
}
