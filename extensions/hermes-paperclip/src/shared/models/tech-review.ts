import { z } from "zod";

// --- Compliance Levels ---

export const ComplianceLevel = {
  COMPLIANT: "compliant",
  PARTIAL: "partial",
  NON_COMPLIANT: "non-compliant",
  NOT_APPLICABLE: "not-applicable",
} as const;
export type ComplianceLevel = (typeof ComplianceLevel)[keyof typeof ComplianceLevel];

// --- Technical Review Check Result ---

export const TechReviewCheckResultSchema = z.object({
  checkId: z.string(),
  checkName: z.string(),
  category: z.string(),
  compliance: z.enum(["compliant", "partial", "non-compliant", "not-applicable"]),
  failureMode: z.enum([
    "OVERSPEND",
    "DISRUPTION",
    "KNOWLEDGE_LOSS",
    "DATA_LEAK",
    "PREMATURE_AUTOMATION",
    "DEPENDENCY_CREATION",
    "MISSED_STANDARD",
    "STALE_DATA",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  evidence: z.string().optional(),
  recommendation: z.string().optional(),
  reviewedAt: z.string().datetime(),
});
export type TechReviewCheckResult = z.infer<typeof TechReviewCheckResultSchema>;

// --- Technical Review Report ---

export const TechReviewReportSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  reviewedBy: z.string(), // "hermes" or human reviewer
  results: z.array(TechReviewCheckResultSchema),
  summary: z.object({
    totalChecks: z.number().int().nonnegative(),
    compliant: z.number().int().nonnegative(),
    partial: z.number().int().nonnegative(),
    nonCompliant: z.number().int().nonnegative(),
    notApplicable: z.number().int().nonnegative(),
    criticalFindings: z.number().int().nonnegative(),
    complianceScore: z.number().min(0).max(100),
  }),
  failureModeBreakdown: z.record(z.string(), z.number().int().nonnegative()),
  generatedAt: z.string().datetime(),
});
export type TechReviewReport = z.infer<typeof TechReviewReportSchema>;

/**
 * Computes compliance score from check results.
 * Compliant = 100%, Partial = 50%, Non-compliant = 0%, N/A excluded.
 */
export function computeComplianceScore(results: TechReviewCheckResult[]): number {
  const applicable = results.filter((r) => r.compliance !== "not-applicable");
  if (applicable.length === 0) return 100;

  const score = applicable.reduce((sum, r) => {
    if (r.compliance === "compliant") return sum + 100;
    if (r.compliance === "partial") return sum + 50;
    return sum;
  }, 0);

  return Math.round(score / applicable.length);
}

/**
 * Counts findings grouped by failure mode.
 */
export function countByFailureMode(results: TechReviewCheckResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of results) {
    if (r.compliance === "non-compliant" || r.compliance === "partial") {
      counts[r.failureMode] = (counts[r.failureMode] ?? 0) + 1;
    }
  }
  return counts;
}
