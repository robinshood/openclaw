import { z } from "zod";

/**
 * WSJF — Weighted Shortest Job First
 *
 * Prioritization framework: WSJF = Cost of Delay ÷ Job Size
 *
 * Cost of Delay combines:
 * - Business value (user/business impact)
 * - Time criticality (urgency / deadline pressure)
 * - Risk reduction (opportunity enablement / risk mitigation)
 *
 * Job Size: relative effort estimate (1-13 Fibonacci scale)
 *
 * Higher WSJF = do first.
 */

export const CostOfDelaySchema = z.object({
  /** Business value if delivered (1-13 Fibonacci) */
  businessValue: z.number().min(1).max(13),
  /** Urgency / deadline pressure (1-13 Fibonacci) */
  timeCriticality: z.number().min(1).max(13),
  /** Risk reduction or opportunity enablement (1-13 Fibonacci) */
  riskReduction: z.number().min(1).max(13),
});
export type CostOfDelay = z.infer<typeof CostOfDelaySchema>;

export const WsjfItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  costOfDelay: CostOfDelaySchema,
  /** Relative effort estimate (1-13 Fibonacci) */
  jobSize: z.number().min(1).max(13),
  /** Calculated WSJF score */
  wsjfScore: z.number().optional(),
});
export type WsjfItem = z.infer<typeof WsjfItemSchema>;

/**
 * Calculate the total Cost of Delay.
 */
export function calculateCostOfDelay(cod: CostOfDelay): number {
  return cod.businessValue + cod.timeCriticality + cod.riskReduction;
}

/**
 * Calculate the WSJF score for a single item.
 * WSJF = Cost of Delay ÷ Job Size
 */
export function calculateWsjf(item: WsjfItem): number {
  const cod = calculateCostOfDelay(item.costOfDelay);
  return Math.round((cod / item.jobSize) * 100) / 100;
}

/**
 * Rank a list of items by WSJF score (highest first).
 * Returns a new array with wsjfScore populated.
 */
export function rankByWsjf(items: WsjfItem[]): WsjfItem[] {
  return items
    .map((item) => ({
      ...item,
      wsjfScore: calculateWsjf(item),
    }))
    .sort((a, b) => (b.wsjfScore ?? 0) - (a.wsjfScore ?? 0));
}

/**
 * Quick WSJF calculation from raw numbers.
 * Useful in scoring skills and Claude Code prompts.
 */
export function quickWsjf(
  businessValue: number,
  timeCriticality: number,
  riskReduction: number,
  jobSize: number,
): number {
  return Math.round(((businessValue + timeCriticality + riskReduction) / jobSize) * 100) / 100;
}
