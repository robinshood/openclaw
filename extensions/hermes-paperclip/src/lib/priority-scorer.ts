/**
 * Priority scorer for process automation candidates.
 * Priority = (T × 0.4) + (C × 0.3) + (F × 0.2) + (E × 0.1)
 *
 * T = Time consumed (hours/month, normalized 1-5)
 * C = Cost impact (NOK/month, normalized 1-5)
 * F = Automation feasibility (1-5)
 * E = Error rate (1-5)
 */

export interface PriorityInput {
  /** Hours per month spent on this process */
  hoursPerMonth: number;
  /** Cost per month in NOK */
  costPerMonth: number;
  /** Feasibility score (1-5) */
  feasibility: number;
  /** Error frequency score (1-5) */
  errorRate: number;
}

const WEIGHTS = {
  time: 0.4,
  cost: 0.3,
  feasibility: 0.2,
  errorRate: 0.1,
} as const;

/** Normalize hours to 1-5 scale. */
function normalizeHours(hours: number): number {
  if (hours <= 2) return 1;
  if (hours <= 10) return 2;
  if (hours <= 30) return 3;
  if (hours <= 80) return 4;
  return 5;
}

/** Normalize cost (NOK) to 1-5 scale. */
function normalizeCost(cost: number): number {
  if (cost <= 5000) return 1;
  if (cost <= 15000) return 2;
  if (cost <= 40000) return 3;
  if (cost <= 80000) return 4;
  return 5;
}

/**
 * Calculate priority score for a process automation candidate.
 * Returns a score from 1.0 to 5.0.
 */
export function calculatePriority(input: PriorityInput): number {
  const t = normalizeHours(input.hoursPerMonth);
  const c = normalizeCost(input.costPerMonth);
  const f = Math.max(1, Math.min(5, input.feasibility));
  const e = Math.max(1, Math.min(5, input.errorRate));

  const score =
    t * WEIGHTS.time + c * WEIGHTS.cost + f * WEIGHTS.feasibility + e * WEIGHTS.errorRate;

  return Math.round(score * 10) / 10;
}
