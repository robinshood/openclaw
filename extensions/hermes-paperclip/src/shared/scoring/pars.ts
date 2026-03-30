import { z } from "zod";

/**
 * PARS — Process Automation Readiness Score
 *
 * 8-dimensional scoring framework for evaluating process automation potential.
 * Each dimension scored 0-100, weighted, and combined into a total score.
 *
 * Tiers:
 * - Tier 1 (≥70): Automate now
 * - Tier 2 (50-69): Plan for automation
 * - Tier 3 (<50): Defer / manual is fine
 */

export const ParsDimension = {
  VOLUME: "volume",
  TIME: "time",
  ERROR: "error",
  STANDARDIZATION: "standardization",
  DIGITIZATION: "digitization",
  COMPLIANCE: "compliance",
  INTEGRATION: "integration",
  ROI: "roi",
} as const;

export type ParsDimension = (typeof ParsDimension)[keyof typeof ParsDimension];

export const ParsTier = {
  TIER_1: "tier_1",
  TIER_2: "tier_2",
  TIER_3: "tier_3",
} as const;

export type ParsTier = (typeof ParsTier)[keyof typeof ParsTier];

/** Score for a single PARS dimension */
export const DimensionScoreSchema = z.object({
  dimension: z.enum([
    "volume",
    "time",
    "error",
    "standardization",
    "digitization",
    "compliance",
    "integration",
    "roi",
  ]),
  score: z.number().min(0).max(100),
  rationale: z.string(),
  dataSource: z.string(),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

/** Weights for the 8 PARS dimensions (must sum to 1.0) */
export const ParsWeightsSchema = z
  .object({
    volume: z.number().min(0).max(1),
    time: z.number().min(0).max(1),
    error: z.number().min(0).max(1),
    standardization: z.number().min(0).max(1),
    digitization: z.number().min(0).max(1),
    compliance: z.number().min(0).max(1),
    integration: z.number().min(0).max(1),
    roi: z.number().min(0).max(1),
  })
  .refine(
    (w) => {
      const sum =
        w.volume +
        w.time +
        w.error +
        w.standardization +
        w.digitization +
        w.compliance +
        w.integration +
        w.roi;
      return Math.abs(sum - 1.0) < 0.01;
    },
    { message: "PARS weights must sum to 1.0" },
  );
export type ParsWeights = z.infer<typeof ParsWeightsSchema>;

/** Complete PARS result for a process */
export const ParsResultSchema = z.object({
  processId: z.string(),
  processName: z.string(),
  scores: z.array(DimensionScoreSchema).length(8),
  weights: ParsWeightsSchema,
  totalScore: z.number().min(0).max(100),
  tier: z.enum(["tier_1", "tier_2", "tier_3"]),
  scoredAt: z.string().datetime(),
  scoredBy: z.string(),
});
export type ParsResult = z.infer<typeof ParsResultSchema>;

/** Default weights — balanced with slight emphasis on ROI and standardization */
export const DEFAULT_PARS_WEIGHTS: ParsWeights = {
  volume: 0.1,
  time: 0.15,
  error: 0.1,
  standardization: 0.15,
  digitization: 0.1,
  compliance: 0.1,
  integration: 0.15,
  roi: 0.15,
};

/**
 * Calculate the total PARS score from dimension scores and weights.
 */
export function calculateParsScore(scores: DimensionScore[], weights: ParsWeights): number {
  ParsWeightsSchema.parse(weights);

  if (scores.length !== 8) {
    throw new Error(`PARS requires exactly 8 dimension scores, got ${scores.length}`);
  }

  let total = 0;
  for (const score of scores) {
    const weight = weights[score.dimension];
    total += score.score * weight;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Classify a PARS score into a tier.
 */
export function classifyTier(totalScore: number): ParsTier {
  if (totalScore >= 70) return ParsTier.TIER_1;
  if (totalScore >= 50) return ParsTier.TIER_2;
  return ParsTier.TIER_3;
}

/**
 * Build a complete PARS result for a process.
 */
export function buildParsResult(params: {
  processId: string;
  processName: string;
  scores: DimensionScore[];
  weights?: ParsWeights;
  scoredBy?: string;
}): ParsResult {
  const weights = params.weights ?? DEFAULT_PARS_WEIGHTS;
  const totalScore = calculateParsScore(params.scores, weights);
  const tier = classifyTier(totalScore);

  return ParsResultSchema.parse({
    processId: params.processId,
    processName: params.processName,
    scores: params.scores,
    weights,
    totalScore,
    tier,
    scoredAt: new Date().toISOString(),
    scoredBy: params.scoredBy ?? "hermes",
  });
}

// --- Volume normalization helpers ---

/**
 * Normalize monthly transaction volume to 0-100 PARS scale.
 * 0 txns = 0, 10 txns = 20, 50 = 40, 200 = 60, 500 = 80, 1000+ = 100
 */
export function normalizeVolume(txnPerMonth: number): number {
  if (txnPerMonth <= 0) return 0;
  if (txnPerMonth >= 1000) return 100;
  // Logarithmic scale: score = 100 * log(1 + txn) / log(1001)
  return Math.round((100 * Math.log(1 + txnPerMonth)) / Math.log(1001));
}

/**
 * Normalize hours per month to 0-100 PARS scale.
 * 0h = 0, 5h = 25, 20h = 50, 60h = 75, 160h+ = 100
 */
export function normalizeTime(hoursPerMonth: number): number {
  if (hoursPerMonth <= 0) return 0;
  if (hoursPerMonth >= 160) return 100;
  return Math.round((100 * Math.log(1 + hoursPerMonth)) / Math.log(161));
}

/**
 * Normalize error rate (0.0 - 1.0) to 0-100 PARS scale.
 * Higher error rate = higher score (more automation value).
 */
export function normalizeErrorRate(errorRate: number): number {
  return Math.round(Math.min(1, Math.max(0, errorRate)) * 100);
}
