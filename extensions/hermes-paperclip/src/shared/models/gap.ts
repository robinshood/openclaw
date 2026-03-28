import { z } from "zod";

export const CoverageLevel = {
  FULL: "full",
  PARTIAL: "partial",
  NONE: "none",
} as const;

export const OotbCoverageSchema = z.object({
  tool: z.string(),
  coverageLevel: z.enum(["full", "partial", "none"]),
  coverageDetails: z.string().optional(),
  coveragePercent: z.number().min(0).max(100).optional(),
});
export type OotbCoverage = z.infer<typeof OotbCoverageSchema>;

export const GapSchema = z.object({
  id: z.string(),
  processId: z.string(),
  processName: z.string(),
  ootbCoverage: z.array(OotbCoverageSchema),
  overallCoverageLevel: z.enum(["full", "partial", "none"]),
  gapDescription: z.string(),
  automationCandidate: z.boolean(),
  estimatedEffort: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
  sprintAssignment: z.number().optional(),
});
export type Gap = z.infer<typeof GapSchema>;

export const GapReportSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  totalProcesses: z.number(),
  fullyCovered: z.number(),
  partiallyCovered: z.number(),
  uncovered: z.number(),
  gaps: z.array(GapSchema),
  generatedAt: z.string().datetime(),
});
export type GapReport = z.infer<typeof GapReportSchema>;
