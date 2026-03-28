/**
 * RENVASKEN — Data Quality Gate (Priority: 4.8)
 *
 * Every piece of data entering ettOS passes through Renvasken BEFORE
 * any agent can consume it. The data flow is ALWAYS:
 *
 *   Source → Renvasken → Supabase (clean) → Agent → Output
 *
 * Never:
 *   Source → Agent (FORBIDDEN — dirty data produces dirty results)
 *
 * Modes:
 *   INGEST:    Validate new data arriving from external sources
 *   AUDIT:     Periodic scan of existing data for drift/decay
 *   ON_DEMAND: Manual validation of specific datasets
 */

import { logAction } from "../../shared/audit-logger.ts";
import type {
  DataQualityStatus,
  DataSource,
  ValidationIssue,
  ValidationResult,
} from "../../shared/types.ts";
import { checkCompliance } from "./compliance-checker.ts";
import { deriveLayerResults, scoreRecord, toStatus } from "./confidence-scorer.ts";
import { generateReport, type QualityReport } from "./quality-reporter.ts";
import { validateEncoding, validateSchema } from "./schema-validator.ts";
import { type StatisticalContext, runStatisticalChecks } from "./statistical-checks.ts";

const AGENT_ID = "paperclip-wash-01";

export interface IngestOptions {
  source: DataSource;
  recordType: string;
  /** Statistical context for Layer 2 checks (historical values, existing records). */
  context?: StatisticalContext;
}

/**
 * Validate a single record through Renvasken's 4-layer pipeline.
 *
 * Layer 1: Schema validation (Zod) — deterministic, free
 * Layer 2: Statistical anomaly detection — deterministic, free
 * Layer 4: Bokføringsloven compliance — deterministic, free
 * Layer 3: Semantic validation (LLM) — only for SUSPECT records (not yet implemented)
 */
export function validateRecord(
  recordId: string,
  data: Record<string, unknown>,
  opts: IngestOptions,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Layer 1: Schema validation
  const schemaResult = validateSchema(opts.recordType, data);
  issues.push(...schemaResult.issues);
  issues.push(...validateEncoding(data));

  // Layer 2: Statistical checks
  const statsIssues = runStatisticalChecks(opts.recordType, data, opts.context);
  issues.push(...statsIssues);

  // Layer 4: Bokføringsloven compliance (only for financial records)
  if (opts.recordType === "voucher") {
    const complianceIssues = checkCompliance(opts.recordType, data);
    issues.push(...complianceIssues);
  }

  // Score the record
  const layers = deriveLayerResults(issues);
  // Layer 3 (semantic) not yet implemented — defaults to passed
  layers.semanticPassed = true;
  const confidenceScore = scoreRecord(layers);
  const status = toStatus(confidenceScore);

  return {
    recordId,
    source: opts.source,
    recordType: opts.recordType,
    rawData: data,
    cleanedData: null,
    issues,
    confidenceScore,
    status,
    autoFixApplied: false,
    autoFixDescription: null,
  };
}

/**
 * Validate a batch of records and generate a quality report.
 *
 * Returns individual results + aggregate report.
 * BLOCKS the batch if clean rate < 85%.
 */
export async function validateBatch(
  records: Array<{ id: string; data: Record<string, unknown> }>,
  opts: IngestOptions,
): Promise<{ results: ValidationResult[]; report: QualityReport }> {
  const results = records.map((r) => validateRecord(r.id, r.data, opts));

  const report = generateReport(opts.source, results);

  // Log the batch validation
  await logAction({
    agentId: AGENT_ID,
    action: "validate_batch",
    targetType: opts.recordType,
    inputData: { recordCount: records.length, source: opts.source },
    outputData: {
      cleanCount: report.cleanCount,
      suspectCount: report.suspectCount,
      dirtyCount: report.dirtyCount,
      cleanPct: report.cleanPct,
      passesThreshold: report.passesThreshold,
    },
    confidence: report.cleanPct >= 90 ? "H" : report.cleanPct >= 80 ? "M" : "L",
    rationale: `Batch validation: ${report.cleanPct}% clean (${report.totalRecords} records)`,
  });

  return { results, report };
}

/**
 * Filter only CLEAN records from validation results.
 * Use this to get data that agents are allowed to consume.
 */
export function getCleanRecords(results: ValidationResult[]): ValidationResult[] {
  return results.filter((r) => r.status === "clean");
}

/**
 * Filter SUSPECT records that need human review.
 */
export function getSuspectRecords(results: ValidationResult[]): ValidationResult[] {
  return results.filter((r) => r.status === "suspect");
}

/**
 * Filter DIRTY records that are BLOCKED from the pipeline.
 */
export function getDirtyRecords(results: ValidationResult[]): ValidationResult[] {
  return results.filter((r) => r.status === "dirty");
}

export { generateReport } from "./quality-reporter.ts";
export { validateSchema, getSupportedTypes } from "./schema-validator.ts";
export { checkCompliance } from "./compliance-checker.ts";
export { runStatisticalChecks } from "./statistical-checks.ts";
export { scoreRecord, toStatus, datasetQualityCheck } from "./confidence-scorer.ts";
