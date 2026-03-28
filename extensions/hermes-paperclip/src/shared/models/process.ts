import { z } from "zod";

export const AutomationFeasibility = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export const ProcessSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  norwegianName: z.string().optional(),
  description: z.string(),
  hoursPerMonth: z.number().nonnegative(),
  costPerMonth: z.number().nonnegative(),
  automationFeasibility: z.enum(["LOW", "MEDIUM", "HIGH"]),
  errorRate: z.enum(["LOW", "MEDIUM", "HIGH"]),
  priorityScore: z.number().optional(),
  currentTools: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  owner: z.string().optional(),
  notes: z.string().optional(),
});
export type Process = z.infer<typeof ProcessSchema>;

/**
 * Calculates the priority score for a process using the standard formula:
 * Priority = (Time × 0.4) + (Cost × 0.3) + (Feasibility × 0.2) + (Error × 0.1)
 *
 * All inputs are normalized to 1-5 scale before weighting.
 */
export function calculatePriorityScore(process: Process): number {
  const timeScore = normalizeHours(process.hoursPerMonth);
  const costScore = normalizeCost(process.costPerMonth);
  const feasibilityScore = feasibilityToScore(process.automationFeasibility);
  const errorScore = errorRateToScore(process.errorRate);

  return timeScore * 0.4 + costScore * 0.3 + feasibilityScore * 0.2 + errorScore * 0.1;
}

/** Normalize hours to 1-5 scale (0-10h=1, 10-30=2, 30-60=3, 60-100=4, 100+=5) */
function normalizeHours(hours: number): number {
  if (hours >= 100) return 5;
  if (hours >= 60) return 4;
  if (hours >= 30) return 3;
  if (hours >= 10) return 2;
  return 1;
}

/** Normalize cost to 1-5 scale based on monthly NOK */
function normalizeCost(cost: number): number {
  if (cost >= 100_000) return 5;
  if (cost >= 50_000) return 4;
  if (cost >= 20_000) return 3;
  if (cost >= 5_000) return 2;
  return 1;
}

function feasibilityToScore(f: string): number {
  switch (f) {
    case "HIGH":
      return 5;
    case "MEDIUM":
      return 3;
    case "LOW":
      return 1;
    default:
      return 1;
  }
}

function errorRateToScore(e: string): number {
  switch (e) {
    case "HIGH":
      return 5;
    case "MEDIUM":
      return 3;
    case "LOW":
      return 1;
    default:
      return 1;
  }
}
