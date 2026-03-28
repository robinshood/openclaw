/**
 * Paperclip orchestration config — heartbeat schedules and budget limits
 * for all 5 agents.
 *
 * This is the runtime config that the dispatcher uses. It maps directly
 * to the AGENTS.md definitions and company.yaml.
 */

import type { HeartbeatConfig, RetryConfig } from "./types.ts";

// --- Heartbeat Configs ---

export const HEARTBEAT_CONFIGS: Record<string, HeartbeatConfig> = {
  "paperclip-wash-01": {
    agentId: "paperclip-wash-01",
    scheduleType: "on-demand",
    triggerLabel: "pre-pipeline",
    timeoutSeconds: 30,
    maxConcurrent: 10,
  },
  "hermes-bilag-01": {
    agentId: "hermes-bilag-01",
    scheduleType: "webhook",
    triggerLabel: "webhook:bank-statement",
    timeoutSeconds: 120,
    maxConcurrent: 1,
    retry: {
      maxAttempts: 3,
      backoff: "exponential",
      initialDelaySeconds: 5,
    },
  },
  "hermes-rapport-01": {
    agentId: "hermes-rapport-01",
    scheduleType: "cron",
    cronExpression: "0 8 * * *",
    timezone: "Europe/Oslo",
    triggerLabel: "cron:5th-business-day",
    timeoutSeconds: 300,
    maxConcurrent: 5,
    condition: "is_nth_business_day(5)",
  },
  "paperclip-onboard-01": {
    agentId: "paperclip-onboard-01",
    scheduleType: "manual",
    triggerLabel: "manual",
    timeoutSeconds: 60,
    maxConcurrent: 1,
  },
  "paperclip-tid-01": {
    agentId: "paperclip-tid-01",
    scheduleType: "cron",
    cronExpression: "0 6 * * 1-5",
    timezone: "Europe/Oslo",
    triggerLabel: "cron:daily",
    timeoutSeconds: 180,
    maxConcurrent: 1,
    retry: {
      maxAttempts: 2,
      backoff: "exponential",
      initialDelaySeconds: 10,
    },
  },
};

// --- Budget Configs ---

export interface BudgetConfig {
  monthlyLimitNOK: number;
  costPerRun: number;
  alertThresholdPct: number;
}

export const BUDGET_CONFIGS: Record<string, BudgetConfig> = {
  "paperclip-wash-01": {
    monthlyLimitNOK: 5000,
    costPerRun: 0.5,
    alertThresholdPct: 90,
  },
  "hermes-bilag-01": {
    monthlyLimitNOK: 15000,
    costPerRun: 2.0,
    alertThresholdPct: 80,
  },
  "hermes-rapport-01": {
    monthlyLimitNOK: 20000,
    costPerRun: 5.0,
    alertThresholdPct: 80,
  },
  "paperclip-onboard-01": {
    monthlyLimitNOK: 5000,
    costPerRun: 3.0,
    alertThresholdPct: 90,
  },
  "paperclip-tid-01": {
    monthlyLimitNOK: 5000,
    costPerRun: 1.0,
    alertThresholdPct: 90,
  },
};

// --- Department budget limits (from company.yaml) ---

export const DEPARTMENT_BUDGETS: Record<string, number> = {
  hermes: 50000,
  paperclip: 30000,
};
