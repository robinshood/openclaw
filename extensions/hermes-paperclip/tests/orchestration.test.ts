import { describe, it, expect, beforeEach } from "vitest";
import {
  initBudget,
  getBudget,
  recordCost,
  canDispatch,
  getDepartmentBudget,
  resetMonthlyBudgets,
} from "../src/orchestration/budget-tracker.ts";
import { HEARTBEAT_CONFIGS, BUDGET_CONFIGS } from "../src/orchestration/config.ts";
import {
  dispatch,
  completeDispatch,
  getRegisteredAgents,
} from "../src/orchestration/dispatcher.ts";
import {
  getAgentGoal,
  getGoalChain,
  traceGoal,
  updateGoalMetric,
  getDepartmentGoals,
  getAllGoals,
} from "../src/orchestration/goal-alignment.ts";
import {
  isNthBusinessDay,
  shouldDispatch,
  createDispatchTask,
  transitionTask,
  canRetry,
  getHeartbeatsByDepartment,
} from "../src/orchestration/heartbeat.ts";
import {
  computeBudgetStatus,
  BudgetStatus,
  DispatchStatus,
  HeartbeatScheduleType,
} from "../src/orchestration/types.ts";

// --- Budget Status ---

describe("computeBudgetStatus", () => {
  it("returns OK when under alert threshold", () => {
    expect(computeBudgetStatus(500, 10000, 80)).toBe(BudgetStatus.OK);
  });

  it("returns WARNING when at alert threshold", () => {
    expect(computeBudgetStatus(8000, 10000, 80)).toBe(BudgetStatus.WARNING);
  });

  it("returns SOFT_STOP at 95%+", () => {
    expect(computeBudgetStatus(9600, 10000, 80)).toBe(BudgetStatus.SOFT_STOP);
  });

  it("returns HARD_STOP at 100%+", () => {
    expect(computeBudgetStatus(10000, 10000, 80)).toBe(BudgetStatus.HARD_STOP);
  });
});

// --- Heartbeat ---

describe("heartbeat", () => {
  it("isNthBusinessDay detects 1st business day (Monday)", () => {
    // 2026-03-02 is a Monday (1st business day of March 2026)
    const date = new Date(2026, 2, 2);
    expect(isNthBusinessDay(1, date)).toBe(true);
  });

  it("isNthBusinessDay returns false for wrong day", () => {
    const date = new Date(2026, 2, 2);
    expect(isNthBusinessDay(5, date)).toBe(false);
  });

  it("shouldDispatch returns false for manual triggers", () => {
    const config = HEARTBEAT_CONFIGS["paperclip-onboard-01"];
    expect(shouldDispatch(config)).toBe(false);
  });

  it("shouldDispatch returns false for webhook triggers", () => {
    const config = HEARTBEAT_CONFIGS["hermes-bilag-01"];
    expect(shouldDispatch(config)).toBe(false);
  });

  it("shouldDispatch returns false for on-demand triggers", () => {
    const config = HEARTBEAT_CONFIGS["paperclip-wash-01"];
    expect(shouldDispatch(config)).toBe(false);
  });

  it("createDispatchTask creates a pending task", () => {
    const task = createDispatchTask("paperclip-wash-01", "pre-pipeline");
    expect(task.status).toBe("pending");
    expect(task.agentId).toBe("paperclip-wash-01");
    expect(task.retryCount).toBe(0);
  });

  it("transitionTask enforces valid transitions", () => {
    const task = createDispatchTask("paperclip-wash-01", "test");
    const checkedOut = transitionTask(task, "checked_out");
    expect(checkedOut.status).toBe("checked_out");
    expect(checkedOut.checkedOutAt).toBeDefined();

    const running = transitionTask(checkedOut, "running");
    expect(running.status).toBe("running");
    expect(running.startedAt).toBeDefined();
  });

  it("transitionTask rejects invalid transitions", () => {
    const task = createDispatchTask("paperclip-wash-01", "test");
    expect(() => transitionTask(task, "completed")).toThrow("Invalid task transition");
  });

  it("canRetry returns true for failed tasks under max retries", () => {
    const task = createDispatchTask("hermes-bilag-01", "test");
    const checkedOut = transitionTask(task, "checked_out");
    const running = transitionTask(checkedOut, "running");
    const failed = transitionTask(running, "failed", undefined, "network error");
    expect(canRetry(failed)).toBe(true);
  });

  it("getHeartbeatsByDepartment returns correct agents", () => {
    const hermes = getHeartbeatsByDepartment("hermes");
    expect(hermes).toHaveLength(2);
    expect(hermes.map((h) => h.agentId)).toContain("hermes-bilag-01");

    const paperclip = getHeartbeatsByDepartment("paperclip");
    expect(paperclip).toHaveLength(3);
  });
});

// --- Budget Tracker ---

describe("budget-tracker", () => {
  beforeEach(() => {
    resetMonthlyBudgets();
  });

  it("initBudget creates budget with zero spent", () => {
    const budget = initBudget("paperclip-wash-01");
    expect(budget.spentThisMonthNOK).toBe(0);
    expect(budget.status).toBe(BudgetStatus.OK);
    expect(budget.monthlyLimitNOK).toBe(5000);
  });

  it("recordCost updates spent amount and status", () => {
    initBudget("paperclip-wash-01");
    const updated = recordCost("paperclip-wash-01", 4600);
    expect(updated.spentThisMonthNOK).toBe(4600);
    expect(updated.status).toBe(BudgetStatus.WARNING);
  });

  it("canDispatch blocks on HARD_STOP", () => {
    initBudget("paperclip-wash-01");
    recordCost("paperclip-wash-01", 5000); // 100%
    const result = canDispatch("paperclip-wash-01");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("exhausted");
  });

  it("canDispatch allows on OK", () => {
    initBudget("paperclip-wash-01");
    const result = canDispatch("paperclip-wash-01");
    expect(result.allowed).toBe(true);
  });

  it("getDepartmentBudget aggregates agent budgets", () => {
    initBudget("paperclip-wash-01");
    initBudget("paperclip-onboard-01");
    initBudget("paperclip-tid-01");
    recordCost("paperclip-wash-01", 1000);

    const dept = getDepartmentBudget("paperclip");
    expect(dept.totalSpentNOK).toBe(1000);
    expect(dept.totalLimitNOK).toBe(15000);
    expect(dept.agents).toHaveLength(3);
  });

  it("resetMonthlyBudgets clears all spent amounts", () => {
    initBudget("paperclip-wash-01");
    recordCost("paperclip-wash-01", 3000);
    resetMonthlyBudgets();
    const budget = getBudget("paperclip-wash-01");
    expect(budget.spentThisMonthNOK).toBe(0);
  });
});

// --- Goal Alignment ---

describe("goal-alignment", () => {
  it("getAgentGoal returns correct goal for Renvasken", () => {
    const goal = getAgentGoal("paperclip-wash-01");
    expect(goal).toBeDefined();
    expect(goal!.id).toBe("renvasken-quality");
  });

  it("getGoalChain returns agent → department → company", () => {
    const chain = getGoalChain("hermes-bilag-01");
    expect(chain).toHaveLength(3);
    expect(chain[0].id).toBe("bilagsansen-automation");
    expect(chain[1].id).toBe("hermes-delivery");
    expect(chain[2].id).toBe("company-mission");
  });

  it("traceGoal creates a goal trace", () => {
    const trace = traceGoal("paperclip-wash-01", "validate-batch", "Validated 50 records");
    expect(trace).not.toBeNull();
    expect(trace!.goalId).toBe("renvasken-quality");
    expect(trace!.contribution).toBe("Validated 50 records");
  });

  it("updateGoalMetric updates current value", () => {
    const metric = updateGoalMetric("renvasken-quality", "clean_rate", 92);
    expect(metric).not.toBeNull();
    expect(metric!.current).toBe(92);
  });

  it("getDepartmentGoals includes department + company goals", () => {
    const goals = getDepartmentGoals("hermes");
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.some((g) => g.department === "company")).toBe(true);
    expect(goals.some((g) => g.department === "hermes")).toBe(true);
  });

  it("getAllGoals returns all goals", () => {
    const goals = getAllGoals();
    expect(goals.length).toBeGreaterThanOrEqual(8);
  });
});

// --- Dispatcher ---

describe("dispatcher", () => {
  beforeEach(() => {
    resetMonthlyBudgets();
  });

  it("dispatch creates a running task", () => {
    const result = dispatch("paperclip-wash-01", "pre-pipeline");
    expect(result.blocked).toBe(false);
    expect(result.task.status).toBe("running");
    expect(result.run.status).toBe("running");
  });

  it("dispatch blocks when budget exhausted", () => {
    initBudget("paperclip-wash-01");
    recordCost("paperclip-wash-01", 5000);
    const result = dispatch("paperclip-wash-01", "pre-pipeline");
    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain("exhausted");
  });

  it("completeDispatch transitions to completed", () => {
    const result = dispatch("paperclip-wash-01", "pre-pipeline");
    const completed = completeDispatch(result, 50, "Validated 50 records");
    expect(completed.task.status).toBe("completed");
    expect(completed.run.status).toBe("completed");
    expect(completed.run.itemsProcessed).toBe(50);
    expect(completed.goalTrace).not.toBeNull();
  });

  it("completeDispatch with error transitions to failed", () => {
    const result = dispatch("hermes-bilag-01", "webhook");
    const failed = completeDispatch(result, 0, "", "Tripletex API timeout");
    // Bilagsansen has retry config, so failed task gets retried → pending
    expect(failed.task.status).toBe("pending");
    expect(failed.run.status).toBe("failed");
    expect(failed.run.error).toBe("Tripletex API timeout");
  });

  it("getRegisteredAgents returns all 5 agents", () => {
    const agents = getRegisteredAgents();
    expect(agents).toHaveLength(5);
    expect(agents).toContain("paperclip-wash-01");
    expect(agents).toContain("hermes-bilag-01");
  });
});

// --- Config ---

describe("config", () => {
  it("all 5 agents have heartbeat configs", () => {
    expect(Object.keys(HEARTBEAT_CONFIGS)).toHaveLength(5);
  });

  it("all 5 agents have budget configs", () => {
    expect(Object.keys(BUDGET_CONFIGS)).toHaveLength(5);
  });

  it("Bilagsansen has webhook schedule with retry", () => {
    const config = HEARTBEAT_CONFIGS["hermes-bilag-01"];
    expect(config.scheduleType).toBe("webhook");
    expect(config.retry).toBeDefined();
    expect(config.retry!.maxAttempts).toBe(3);
  });

  it("Portalklar has cron with business day condition", () => {
    const config = HEARTBEAT_CONFIGS["hermes-rapport-01"];
    expect(config.scheduleType).toBe("cron");
    expect(config.condition).toBe("is_nth_business_day(5)");
    expect(config.timezone).toBe("Europe/Oslo");
  });

  it("Tidsvokter runs Mon-Fri at 06:00", () => {
    const config = HEARTBEAT_CONFIGS["paperclip-tid-01"];
    expect(config.cronExpression).toBe("0 6 * * 1-5");
    expect(config.timezone).toBe("Europe/Oslo");
  });
});
