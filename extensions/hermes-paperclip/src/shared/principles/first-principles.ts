import type { Assumption, DecompositionResult, Truth } from "./types.ts";

const CONFIDENCE_THRESHOLD = 80;

/**
 * Validates that a truth has a non-empty data source.
 * Every truth in the system MUST be traceable to a data source.
 */
function validateTruth(truth: Truth): boolean {
  return truth.dataSource.trim().length > 0;
}

/**
 * Decomposes a problem into verified truths and flagged assumptions.
 *
 * Rules:
 * - Every truth MUST have a data source (no exceptions)
 * - Truths with verified=false are flagged as unverified
 * - Assumptions with confidence < 80% are flagged as requiring verification
 * - Never present assumptions as facts
 */
export function decompose(
  problem: string,
  truths: Truth[],
  assumptions: Assumption[],
): DecompositionResult {
  if (!problem.trim()) {
    throw new Error("Problem statement cannot be empty");
  }

  // Validate all truths have data sources
  const invalidTruths = truths.filter((t) => !validateTruth(t));
  if (invalidTruths.length > 0) {
    const missing = invalidTruths.map((t) => t.statement).join(", ");
    throw new Error(`Truths missing data sources: ${missing}`);
  }

  const unverifiedTruths = truths.filter((t) => !t.verified);

  // Mark assumptions below threshold as requiring verification
  const processedAssumptions = assumptions.map((a) => ({
    ...a,
    requiresVerification: a.confidence < CONFIDENCE_THRESHOLD,
  }));

  const lowConfidenceAssumptions = processedAssumptions.filter((a) => a.requiresVerification);

  const isFullyVerified = unverifiedTruths.length === 0 && lowConfidenceAssumptions.length === 0;

  return {
    problem,
    truths,
    assumptions: processedAssumptions,
    unverifiedTruths,
    lowConfidenceAssumptions,
    isFullyVerified,
  };
}

/**
 * Checks whether a decomposition is safe to proceed with.
 * Returns false if there are critical gaps in knowledge.
 */
export function isSafeToDecide(result: DecompositionResult): boolean {
  // Cannot decide if any truth is unverified
  if (result.unverifiedTruths.length > 0) {
    return false;
  }
  // Cannot decide if any assumption has very low confidence
  const criticallyLow = result.lowConfidenceAssumptions.filter((a) => a.confidence < 50);
  return criticallyLow.length === 0;
}
