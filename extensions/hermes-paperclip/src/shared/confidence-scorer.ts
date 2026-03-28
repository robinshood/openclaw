/**
 * Confidence scorer — unified scoring for all agent outputs.
 *
 * H (High): >90% confidence, all data sources verified, no flags
 * M (Medium): 60-90%, some flags or unverified assumptions
 * L (Low): <60%, missing data, guesses, or known issues
 */

import type { Confidence, ValidationIssue, ValidationSeverity } from "./types.ts";

export interface ConfidenceInput {
  /** Percentage of required fields present (0-1) */
  completeness: number;
  /** Percentage of fields passing validation (0-1) */
  accuracy: number;
  /** Whether data source was verified within 30 days */
  freshness: boolean;
  /** Number of BLOCK-level issues */
  blockIssues: number;
  /** Number of WARN-level issues */
  warnIssues: number;
}

/**
 * Calculate confidence score (0-1) from input factors.
 */
export function calculateConfidence(input: ConfidenceInput): number {
  // Block issues immediately cap confidence
  if (input.blockIssues > 0) {
    return Math.min(0.3, input.completeness * 0.3);
  }

  let score = 0;
  score += input.completeness * 0.3;
  score += input.accuracy * 0.3;
  score += (input.freshness ? 1 : 0.5) * 0.25;
  score += Math.max(0, 1 - input.warnIssues * 0.1) * 0.15;

  return Math.round(score * 100) / 100;
}

/**
 * Convert numeric confidence (0-1) to H/M/L label.
 */
export function toConfidenceLabel(score: number): Confidence {
  if (score >= 0.9) return "H";
  if (score >= 0.6) return "M";
  return "L";
}

/**
 * Calculate Renvasken per-record confidence from validation issues.
 * Formula: (schema_pass * 0.3) + (stats_pass * 0.25) + (compliance_pass * 0.3) + (semantic_pass * 0.15)
 */
export function renvaskenConfidence(
  issues: ValidationIssue[],
  layers: { schema: boolean; stats: boolean; compliance: boolean; semantic: boolean },
): number {
  const score =
    (layers.schema ? 0.3 : 0) +
    (layers.stats ? 0.25 : 0) +
    (layers.compliance ? 0.3 : 0) +
    (layers.semantic ? 0.15 : 0);
  return Math.round(score * 100) / 100;
}

/**
 * Determine data quality status from confidence score.
 */
export function toDataQualityStatus(score: number): "clean" | "suspect" | "dirty" {
  if (score >= 0.9) return "clean";
  if (score >= 0.6) return "suspect";
  return "dirty";
}

/**
 * Count issues by severity level.
 */
export function countBySeverity(issues: ValidationIssue[]): Record<ValidationSeverity, number> {
  const counts = { BLOCK: 0, WARN: 0, INFO: 0 };
  for (const issue of issues) {
    counts[issue.severity]++;
  }
  return counts;
}
