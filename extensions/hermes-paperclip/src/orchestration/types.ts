import { z } from "zod";

// --- Budget Tracking ---

export const BudgetStatus = {
  OK: "OK",
  WARNING: "WARNING",
  SOFT_STOP: "SOFT_STOP",
  HARD_STOP: "HARD_STOP",
} as const;
export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus];

export interface AgentBudget {
  agentId: string;
  monthlyLimitNOK: number;
  spentThisMonthNOK: number;
  costPerRun: number;
  alertThresholdPct: number;
  status: BudgetStatus;
  lastUpdated: string;
}

export function computeBudgetStatus(spent: number, limit: number, alertPct: number): BudgetStatus {
  const pct = (spent / limit) * 100;
  if (pct >= 100) return BudgetStatus.HARD_STOP;
  if (pct >= 95) return BudgetStatus.SOFT_STOP;
  if (pct >= alertPct) return BudgetStatus.WARNING;
  return BudgetStatus.OK;
}

// --- Heartbeat / Dispatch ---

export const HeartbeatScheduleType = {
  CRON: "cron",
  WEBHOOK: "webhook",
  MANUAL: "manual",
  ON_DEMAND: "on-demand",
} as const;
export type HeartbeatScheduleType =
  (typeof HeartbeatScheduleType)[keyof typeof HeartbeatScheduleType];

export interface HeartbeatConfig {
  agentId: string;
  scheduleType: HeartbeatScheduleType;
  cronExpression?: string;
  timezone?: string;
  triggerLabel: string;
  timeoutSeconds: number;
  maxConcurrent: number;
  condition?: string;
  retry?: RetryConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  backoff: "exponential" | "linear" | "fixed";
  initialDelaySeconds: number;
}

// --- Dispatch (atomic task checkout) ---

export const DispatchStatus = {
  PENDING: "pending",
  CHECKED_OUT: "checked_out",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  TIMED_OUT: "timed_out",
} as const;
export type DispatchStatus = (typeof DispatchStatus)[keyof typeof DispatchStatus];

export interface DispatchTask {
  taskId: string;
  agentId: string;
  trigger: string;
  status: DispatchStatus;
  checkedOutAt?: string;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// --- Goal Alignment ---

export interface Goal {
  id: string;
  description: string;
  department: "hermes" | "paperclip" | "company";
  parentGoalId?: string;
  metrics: GoalMetric[];
}

export interface GoalMetric {
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface GoalTrace {
  agentId: string;
  action: string;
  goalId: string;
  contribution: string;
  timestamp: string;
}

// --- Agent Run Record ---

export interface AgentRun {
  runId: string;
  agentId: string;
  taskId?: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed" | "timed_out";
  budgetCostNOK: number;
  itemsProcessed: number;
  goalTraces: GoalTrace[];
  error?: string;
}

// --- Company Config (parsed from company.yaml) ---

export const CompanyConfigSchema = z.object({
  company: z.object({
    name: z.string(),
    orgNr: z.string(),
    mission: z.string(),
    values: z.array(z.string()),
    departments: z.record(
      z.object({
        name: z.string(),
        description: z.string(),
        head: z.string(),
        budget: z.object({
          monthlyLimitNOK: z.number(),
          alertThresholdPct: z.number(),
        }),
        agents: z.array(z.string()),
      }),
    ),
    governance: z.object({
      g4Gate: z.object({
        enabled: z.boolean(),
        sandboxAutoApprove: z.boolean(),
        productionRequiresHuman: z.boolean(),
        approvalTimeoutMinutes: z.number(),
      }),
      auditTrail: z.object({
        enabled: z.boolean(),
        retentionDays: z.number(),
        storage: z.string(),
      }),
      rollback: z.object({
        enabled: z.boolean(),
        maxRollbackDepth: z.number(),
      }),
    }),
    dataFlow: z.object({
      pipeline: z.string(),
      qualityThreshold: z.number(),
      blockOnDirty: z.boolean(),
    }),
  }),
});
export type CompanyConfig = z.infer<typeof CompanyConfigSchema>;
