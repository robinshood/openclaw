import { z } from "zod";

// --- Core Decision Types ---

export const TruthSchema = z.object({
  statement: z.string().min(1),
  dataSource: z.string().min(1),
  verified: z.boolean(),
  confidence: z.number().min(0).max(100),
  verifiedAt: z.string().datetime().optional(),
});
export type Truth = z.infer<typeof TruthSchema>;

export const AssumptionSchema = z.object({
  statement: z.string().min(1),
  confidence: z.number().min(0).max(100),
  rationale: z.string().min(1),
  requiresVerification: z.boolean().optional(),
});
export type Assumption = z.infer<typeof AssumptionSchema>;

// --- Failure Modes (Inversion) ---

export const FailureMode = {
  OVERSPEND: "OVERSPEND",
  DISRUPTION: "DISRUPTION",
  KNOWLEDGE_LOSS: "KNOWLEDGE_LOSS",
  DATA_LEAK: "DATA_LEAK",
  PREMATURE_AUTOMATION: "PREMATURE_AUTOMATION",
  DEPENDENCY_CREATION: "DEPENDENCY_CREATION",
  MISSED_STANDARD: "MISSED_STANDARD",
  STALE_DATA: "STALE_DATA",
} as const;
export type FailureMode = (typeof FailureMode)[keyof typeof FailureMode];

export const FAILURE_MODE_DESCRIPTIONS: Record<FailureMode, string> = {
  OVERSPEND: "Paying for software/services no one uses",
  DISRUPTION: "Breaking a working process during integration",
  KNOWLEDGE_LOSS: "Losing tacit knowledge when employees leave",
  DATA_LEAK: "Mixing data between portfolio companies (tenant isolation failure)",
  PREMATURE_AUTOMATION: "Automating a process you don't understand yet",
  DEPENDENCY_CREATION: "Making portfolio company dependent on Ett Capital infrastructure",
  MISSED_STANDARD: "Building custom when Propell.ai/Sanna/TripleTex already covers it",
  STALE_DATA: "Making decisions based on information older than 30 days",
};

export const Severity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const FailureModeCheckSchema = z.object({
  mode: z.enum([
    "OVERSPEND",
    "DISRUPTION",
    "KNOWLEDGE_LOSS",
    "DATA_LEAK",
    "PREMATURE_AUTOMATION",
    "DEPENDENCY_CREATION",
    "MISSED_STANDARD",
    "STALE_DATA",
  ]),
  detected: z.boolean(),
  evidence: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  humanOverride: z.boolean().optional(),
  overrideRationale: z.string().optional(),
});
export type FailureModeCheck = z.infer<typeof FailureModeCheckSchema>;

// --- Decision Matrix ---

export const DecisionType = {
  PROCESS: "process",
  STRATEGIC: "strategic",
} as const;
export type DecisionType = (typeof DecisionType)[keyof typeof DecisionType];

export const DecisionCriterionSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
  score: z.number().min(1).max(5),
});
export type DecisionCriterion = z.infer<typeof DecisionCriterionSchema>;

export const Recommendation = {
  RECOMMEND: "RECOMMEND",
  TIE: "TIE",
  ESCALATE: "ESCALATE",
  ELIMINATED: "ELIMINATED",
} as const;
export type Recommendation = (typeof Recommendation)[keyof typeof Recommendation];

export const DecisionResultSchema = z.object({
  option: z.string(),
  totalScore: z.number(),
  criteria: z.array(DecisionCriterionSchema),
  recommendation: z.enum(["RECOMMEND", "TIE", "ESCALATE", "ELIMINATED"]),
});
export type DecisionResult = z.infer<typeof DecisionResultSchema>;

// --- Decomposition Result ---

export const DecompositionResultSchema = z.object({
  problem: z.string(),
  truths: z.array(TruthSchema),
  assumptions: z.array(AssumptionSchema),
  unverifiedTruths: z.array(TruthSchema),
  lowConfidenceAssumptions: z.array(AssumptionSchema),
  isFullyVerified: z.boolean(),
});
export type DecompositionResult = z.infer<typeof DecompositionResultSchema>;

// --- Inversion Result ---

export const InversionContextSchema = z.object({
  description: z.string(),
  options: z.array(z.string()),
  companyContext: z.string().optional(),
  processContext: z.string().optional(),
});
export type InversionContext = z.infer<typeof InversionContextSchema>;

export const InversionResultSchema = z.object({
  option: z.string(),
  failureModes: z.array(FailureModeCheckSchema),
  eliminated: z.boolean(),
  eliminationReasons: z.array(z.string()),
});
export type InversionResult = z.infer<typeof InversionResultSchema>;

// --- Decision Matrix Result ---

export const DecisionMatrixResultSchema = z.object({
  results: z.array(DecisionResultSchema),
  recommended: z.string().nullable(),
  isTie: z.boolean(),
  requiresEscalation: z.boolean(),
  reasoning: z.string(),
});
export type DecisionMatrixResult = z.infer<typeof DecisionMatrixResultSchema>;

// --- Full Pipeline Result ---

export const PipelineResultSchema = z.object({
  decomposition: DecompositionResultSchema,
  inversions: z.array(InversionResultSchema),
  matrix: DecisionMatrixResultSchema.nullable(),
  survivingOptions: z.array(z.string()),
  timestamp: z.string().datetime(),
});
export type PipelineResult = z.infer<typeof PipelineResultSchema>;

// --- Process Automation Criteria (predefined weights) ---

export const PROCESS_CRITERIA_WEIGHTS: Record<string, number> = {
  timeConsumed: 0.4,
  costImpact: 0.3,
  automationFeasibility: 0.2,
  errorRate: 0.1,
};

// --- Strategic Decision Criteria (predefined weights) ---

export const STRATEGIC_CRITERIA_WEIGHTS: Record<string, number> = {
  evidenceStrength: 0.25,
  riskMitigation: 0.2,
  ebitdaImpact: 0.2,
  implementationSpeed: 0.15,
  reversibility: 0.1,
  scalability: 0.1,
};
