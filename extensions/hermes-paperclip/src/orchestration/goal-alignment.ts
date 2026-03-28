/**
 * Goal alignment — traces every agent action back to company goals.
 *
 * Goal hierarchy:
 *   Company Mission
 *     → Department Goal (hermes / paperclip)
 *       → Agent Goal (per-agent KPIs)
 *         → Action (individual runs)
 */

import type { Goal, GoalMetric, GoalTrace } from "./types.ts";

// --- Company Goals ---

const COMPANY_GOALS: Goal[] = [
  {
    id: "company-mission",
    description:
      "Automate Norwegian accounting workflows for SMBs with human-in-the-loop approval and full compliance",
    department: "company",
    metrics: [
      { name: "automation_rate", target: 90, current: 0, unit: "%" },
      { name: "compliance_score", target: 100, current: 0, unit: "%" },
      { name: "client_satisfaction", target: 4.5, current: 0, unit: "/5" },
    ],
  },
  // Hermes department goals
  {
    id: "hermes-delivery",
    description: "Deliver accurate financial reports and automate voucher creation for all clients",
    department: "hermes",
    parentGoalId: "company-mission",
    metrics: [
      { name: "voucher_automation_rate", target: 90, current: 0, unit: "%" },
      { name: "report_delivery_rate", target: 100, current: 0, unit: "%" },
      { name: "posting_error_rate", target: 0, current: 0, unit: "%" },
    ],
  },
  // Paperclip department goals
  {
    id: "paperclip-infrastructure",
    description: "Maintain data quality, onboard clients efficiently, and track profitability",
    department: "paperclip",
    parentGoalId: "company-mission",
    metrics: [
      { name: "data_clean_rate", target: 85, current: 0, unit: "%" },
      { name: "onboarding_time_minutes", target: 5, current: 0, unit: "min" },
      { name: "timesheet_sync_delay_hours", target: 1, current: 0, unit: "h" },
    ],
  },
  // Agent-level goals
  {
    id: "renvasken-quality",
    description: "Maintain 85%+ clean rate, zero BLOCK issues reaching downstream",
    department: "paperclip",
    parentGoalId: "paperclip-infrastructure",
    metrics: [
      { name: "clean_rate", target: 85, current: 0, unit: "%" },
      { name: "block_leakage", target: 0, current: 0, unit: "count" },
    ],
  },
  {
    id: "bilagsansen-automation",
    description: "Automate 90%+ of credit card vouchers with GREEN confidence",
    department: "hermes",
    parentGoalId: "hermes-delivery",
    metrics: [
      { name: "green_rate", target: 90, current: 0, unit: "%" },
      { name: "manual_time_saved_pct", target: 80, current: 0, unit: "%" },
    ],
  },
  {
    id: "portalklar-reports",
    description: "Deliver all client reports by 6th business day",
    department: "hermes",
    parentGoalId: "hermes-delivery",
    metrics: [
      { name: "on_time_delivery_rate", target: 100, current: 0, unit: "%" },
      { name: "deviation_detection_rate", target: 95, current: 0, unit: "%" },
    ],
  },
  {
    id: "velkomst-onboarding",
    description: "Onboard clients in <5 minutes with full BRREG validation",
    department: "paperclip",
    parentGoalId: "paperclip-infrastructure",
    metrics: [
      { name: "onboarding_time_minutes", target: 5, current: 0, unit: "min" },
      { name: "brreg_validation_rate", target: 100, current: 0, unit: "%" },
    ],
  },
  {
    id: "tidsvokter-profitability",
    description: "Daily timesheet sync, flag unprofitable clients within 24h",
    department: "paperclip",
    parentGoalId: "paperclip-infrastructure",
    metrics: [
      { name: "sync_delay_hours", target: 1, current: 0, unit: "h" },
      { name: "flag_delay_hours", target: 24, current: 0, unit: "h" },
    ],
  },
];

/** Agent ID → goal ID mapping */
const AGENT_GOAL_MAP: Record<string, string> = {
  "paperclip-wash-01": "renvasken-quality",
  "hermes-bilag-01": "bilagsansen-automation",
  "hermes-rapport-01": "portalklar-reports",
  "paperclip-onboard-01": "velkomst-onboarding",
  "paperclip-tid-01": "tidsvokter-profitability",
};

/**
 * Get the goal for an agent.
 */
export function getAgentGoal(agentId: string): Goal | undefined {
  const goalId = AGENT_GOAL_MAP[agentId];
  return COMPANY_GOALS.find((g) => g.id === goalId);
}

/**
 * Get full goal chain from agent → department → company.
 */
export function getGoalChain(agentId: string): Goal[] {
  const chain: Goal[] = [];
  const goal = getAgentGoal(agentId);
  if (!goal) return chain;

  let current: Goal | undefined = goal;
  while (current) {
    chain.push(current);
    current = current.parentGoalId
      ? COMPANY_GOALS.find((g) => g.id === current!.parentGoalId)
      : undefined;
  }

  return chain;
}

/**
 * Create a goal trace for an agent action.
 */
export function traceGoal(agentId: string, action: string, contribution: string): GoalTrace | null {
  const goal = getAgentGoal(agentId);
  if (!goal) return null;

  return {
    agentId,
    action,
    goalId: goal.id,
    contribution,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Update a goal metric's current value.
 */
export function updateGoalMetric(
  goalId: string,
  metricName: string,
  value: number,
): GoalMetric | null {
  const goal = COMPANY_GOALS.find((g) => g.id === goalId);
  if (!goal) return null;

  const metric = goal.metrics.find((m) => m.name === metricName);
  if (!metric) return null;

  metric.current = value;
  return metric;
}

/**
 * Get all goals for a department.
 */
export function getDepartmentGoals(department: "hermes" | "paperclip"): Goal[] {
  return COMPANY_GOALS.filter((g) => g.department === department || g.department === "company");
}

/**
 * Get all company goals.
 */
export function getAllGoals(): Goal[] {
  return [...COMPANY_GOALS];
}
