/**
 * Paperclip Orchestration — unified agent dispatch, budget, and goal tracking.
 */

// Types
export type {
  AgentBudget,
  AgentRun,
  CompanyConfig,
  DispatchTask,
  Goal,
  GoalMetric,
  GoalTrace,
  HeartbeatConfig,
  RetryConfig,
} from "./types.ts";
export {
  BudgetStatus,
  computeBudgetStatus,
  DispatchStatus,
  HeartbeatScheduleType,
  CompanyConfigSchema,
} from "./types.ts";

// Dispatcher
export { dispatch, completeDispatch, getRegisteredAgents } from "./dispatcher.ts";
export type { DispatchResult } from "./dispatcher.ts";

// Heartbeat
export {
  isNthBusinessDay,
  shouldDispatch,
  createDispatchTask,
  transitionTask,
  canRetry,
  getHeartbeatsByDepartment,
} from "./heartbeat.ts";

// Budget
export {
  initBudget,
  getBudget,
  recordCost,
  canDispatch as canDispatchBudget,
  getDepartmentBudget,
  resetMonthlyBudgets,
} from "./budget-tracker.ts";

// Goals
export {
  getAgentGoal,
  getGoalChain,
  traceGoal,
  updateGoalMetric,
  getDepartmentGoals,
  getAllGoals,
} from "./goal-alignment.ts";

// Config
export { HEARTBEAT_CONFIGS, BUDGET_CONFIGS, DEPARTMENT_BUDGETS } from "./config.ts";
