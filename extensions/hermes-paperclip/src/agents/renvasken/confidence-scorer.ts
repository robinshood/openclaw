/**
 * Renvasken per-record confidence scoring.
 *
 * Formula: (schema_pass × 0.3) + (stats_pass × 0.25) + (compliance_pass × 0.3) + (semantic_pass × 0.15)
 *
 * Thresholds:
 *   CLEAN:   >= 0.90 → available to all agents
 *   SUSPECT: 0.60–0.89 → LLM review + human queue
 *   DIRTY:   < 0.60 → BLOCKED from pipeline
 */

import type { DataQualityStatus, ValidationIssue } from "../../shared/types.ts";

export interface LayerResults {
  schemaPassed: boolean;
  statsPassed: boolean;
  compliancePassed: boolean;
  semanticPassed: boolean;
}

/**
 * Calculate per-record confidence from layer results.
 */
export function scoreRecord(layers: LayerResults): number {
  const score =
    (layers.schemaPassed ? 0.3 : 0) +
    (layers.statsPassed ? 0.25 : 0) +
    (layers.compliancePassed ? 0.3 : 0) +
    (layers.semanticPassed ? 0.15 : 0);
  return Math.round(score * 100) / 100;
}

/**
 * Determine data quality status from confidence score.
 */
export function toStatus(score: number): DataQualityStatus {
  if (score >= 0.9) return "clean";
  if (score >= 0.6) return "suspect";
  return "dirty";
}

/**
 * Derive layer pass/fail from validation issues.
 * A layer passes if it has no BLOCK-severity issues.
 */
export function deriveLayerResults(issues: ValidationIssue[]): LayerResults {
  const hasBlock = (layer: number) =>
    issues.some((i) => i.layer === layer && i.severity === "BLOCK");

  return {
    schemaPassed: !hasBlock(1),
    statsPassed: !hasBlock(2),
    compliancePassed: !hasBlock(4),
    semanticPassed: !hasBlock(3), // Layer 3 not yet implemented — defaults to pass
  };
}

/**
 * Check if a dataset meets the minimum quality threshold.
 * 85% of records must be CLEAN before agents can process.
 */
export function datasetQualityCheck(statuses: DataQualityStatus[]): {
  passed: boolean;
  cleanPct: number;
} {
  if (statuses.length === 0) return { passed: false, cleanPct: 0 };
  const cleanCount = statuses.filter((s) => s === "clean").length;
  const cleanPct = Math.round((cleanCount / statuses.length) * 100);
  return { passed: cleanPct >= 85, cleanPct };
}
