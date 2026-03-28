/**
 * Heartbeat scheduler — manages agent dispatch timing.
 *
 * Paperclip heartbeats trigger agent execution on schedule.
 * This module provides the scheduling logic; actual cron execution
 * is handled by the Paperclip server runtime or Node.js cron library.
 */

import { HEARTBEAT_CONFIGS } from "./config.ts";
import type { HeartbeatConfig, DispatchTask, DispatchStatus } from "./types.ts";

/**
 * Check if it's the Nth business day of the month (Mon-Fri, Oslo time).
 * Used by Portalklar's "5th business day" condition.
 */
export function isNthBusinessDay(n: number, date: Date = new Date()): boolean {
  const year = date.getFullYear();
  const month = date.getMonth();
  let businessDays = 0;

  for (let day = 1; day <= date.getDate(); day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      businessDays++;
    }
  }

  return businessDays === n;
}

/**
 * Determine if a heartbeat should fire right now.
 */
export function shouldDispatch(config: HeartbeatConfig, now: Date = new Date()): boolean {
  if (config.scheduleType === "manual" || config.scheduleType === "webhook") {
    return false; // These are externally triggered
  }

  if (config.scheduleType === "on-demand") {
    return false; // Invoked by other agents, not scheduled
  }

  // For cron-scheduled agents, check the condition
  if (config.condition === "is_nth_business_day(5)") {
    return isNthBusinessDay(5, now);
  }

  // Cron matching is handled by the Paperclip server runtime.
  // This function is used for condition evaluation only.
  return true;
}

/**
 * Create a dispatch task for an agent heartbeat.
 * Implements atomic checkout — task is claimed by exactly one executor.
 */
export function createDispatchTask(agentId: string, trigger: string): DispatchTask {
  const config = HEARTBEAT_CONFIGS[agentId];
  return {
    taskId: `task-${agentId}-${Date.now()}`,
    agentId,
    trigger,
    status: "pending",
    retryCount: 0,
    maxRetries: config?.retry?.maxAttempts ?? 1,
  };
}

/**
 * Transition a dispatch task to the next status.
 * Enforces valid state transitions.
 */
export function transitionTask(
  task: DispatchTask,
  newStatus: DispatchStatus,
  result?: Record<string, unknown>,
  error?: string,
): DispatchTask {
  const validTransitions: Record<string, DispatchStatus[]> = {
    pending: ["checked_out", "timed_out"],
    checked_out: ["running", "timed_out"],
    running: ["completed", "failed", "timed_out"],
    failed: ["pending"], // retry
    completed: [],
    timed_out: ["pending"], // retry
  };

  const allowed = validTransitions[task.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid task transition: ${task.status} -> ${newStatus} for task ${task.taskId}`,
    );
  }

  const now = new Date().toISOString();
  return {
    ...task,
    status: newStatus,
    ...(newStatus === "checked_out" ? { checkedOutAt: now } : {}),
    ...(newStatus === "running" ? { startedAt: now } : {}),
    ...(newStatus === "completed" || newStatus === "failed" ? { completedAt: now } : {}),
    ...(result ? { result } : {}),
    ...(error ? { error } : {}),
    ...(newStatus === "pending" ? { retryCount: task.retryCount + 1 } : {}),
  };
}

/**
 * Check if a failed/timed-out task can be retried.
 */
export function canRetry(task: DispatchTask): boolean {
  return (
    (task.status === "failed" || task.status === "timed_out") && task.retryCount < task.maxRetries
  );
}

/**
 * Get all heartbeat configs for agents in a department.
 */
export function getHeartbeatsByDepartment(department: "hermes" | "paperclip"): HeartbeatConfig[] {
  const departmentAgents: Record<string, string[]> = {
    hermes: ["hermes-bilag-01", "hermes-rapport-01"],
    paperclip: ["paperclip-wash-01", "paperclip-onboard-01", "paperclip-tid-01"],
  };

  const agentIds = departmentAgents[department] ?? [];
  return agentIds
    .map((id) => HEARTBEAT_CONFIGS[id])
    .filter((c): c is HeartbeatConfig => c !== undefined);
}
