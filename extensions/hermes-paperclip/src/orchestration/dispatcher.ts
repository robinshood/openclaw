/**
 * Dispatcher — orchestrates agent execution with atomic task checkout.
 *
 * Combines heartbeat scheduling, budget enforcement, goal alignment,
 * and the existing G4 gate into a unified dispatch pipeline.
 *
 * Dispatch flow:
 *   1. Heartbeat fires (cron/webhook/manual)
 *   2. Check budget → block if HARD_STOP/SOFT_STOP
 *   3. Create dispatch task (atomic checkout)
 *   4. Execute agent pipeline
 *   5. Record cost, trace goal, log audit
 *   6. Transition task to completed/failed
 */

import { canDispatch, recordCost, getBudget } from "./budget-tracker.ts";
import { HEARTBEAT_CONFIGS } from "./config.ts";
import { traceGoal } from "./goal-alignment.ts";
import { createDispatchTask, transitionTask, canRetry } from "./heartbeat.ts";
import type { DispatchTask, AgentRun, GoalTrace } from "./types.ts";

export interface DispatchResult {
  task: DispatchTask;
  run: AgentRun;
  goalTrace: GoalTrace | null;
  blocked: boolean;
  blockReason?: string;
}

/**
 * Dispatch an agent for execution.
 *
 * This is the main entry point for the Paperclip orchestrator.
 * It checks budget, creates a task, and returns a dispatch result
 * that the caller uses to execute the actual agent pipeline.
 */
export function dispatch(agentId: string, trigger: string): DispatchResult {
  // 1. Check budget
  const budgetCheck = canDispatch(agentId);
  if (!budgetCheck.allowed) {
    const task = createDispatchTask(agentId, trigger);
    return {
      task: { ...task, status: "failed", error: budgetCheck.reason },
      run: createRun(agentId, task.taskId, 0),
      goalTrace: null,
      blocked: true,
      blockReason: budgetCheck.reason,
    };
  }

  // 2. Create dispatch task (atomic checkout)
  const task = createDispatchTask(agentId, trigger);
  const checkedOut = transitionTask(task, "checked_out");
  const running = transitionTask(checkedOut, "running");

  // 3. Get cost for this run
  const budget = getBudget(agentId);
  const costNOK = budget.costPerRun;

  // 4. Create run record
  const run = createRun(agentId, running.taskId, costNOK);

  return {
    task: running,
    run,
    goalTrace: null,
    blocked: false,
  };
}

/**
 * Complete a dispatch after the agent pipeline finishes.
 */
export function completeDispatch(
  result: DispatchResult,
  itemsProcessed: number,
  contribution: string,
  error?: string,
): DispatchResult {
  const now = new Date().toISOString();

  if (error) {
    const failedTask = transitionTask(result.task, "failed", undefined, error);

    // Check if we can retry
    if (canRetry(failedTask)) {
      const retryTask = transitionTask(failedTask, "pending");
      return {
        ...result,
        task: retryTask,
        run: { ...result.run, status: "failed", error, completedAt: now },
      };
    }

    return {
      ...result,
      task: failedTask,
      run: { ...result.run, status: "failed", error, completedAt: now },
    };
  }

  // Success path
  const completedTask = transitionTask(result.task, "completed", {
    itemsProcessed,
  });

  // Record cost against budget
  recordCost(result.run.agentId, result.run.budgetCostNOK);

  // Trace goal
  const goalTrace = traceGoal(result.run.agentId, result.task.trigger, contribution);

  return {
    ...result,
    task: completedTask,
    run: {
      ...result.run,
      status: "completed",
      completedAt: now,
      itemsProcessed,
      goalTraces: goalTrace ? [goalTrace] : [],
    },
    goalTrace,
  };
}

/**
 * Get all registered agent IDs that have heartbeat configs.
 */
export function getRegisteredAgents(): string[] {
  return Object.keys(HEARTBEAT_CONFIGS);
}

// --- Internal helpers ---

function createRun(agentId: string, taskId: string, costNOK: number): AgentRun {
  return {
    runId: `run-${agentId}-${Date.now()}`,
    agentId,
    taskId,
    startedAt: new Date().toISOString(),
    status: "running",
    budgetCostNOK: costNOK,
    itemsProcessed: 0,
    goalTraces: [],
  };
}
