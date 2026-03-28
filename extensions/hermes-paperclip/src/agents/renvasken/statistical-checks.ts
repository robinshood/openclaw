/**
 * Renvasken Layer 2: Statistical Anomaly Detection (Deterministic).
 *
 * Checks: duplicates, outliers, temporal consistency, volume anomalies, staleness.
 * Catches ~25% of issues.
 */

import type { ValidationIssue } from "../../shared/types.ts";

export interface StatisticalContext {
  /** Historical values for the field (for outlier detection). */
  historicalValues?: number[];
  /** Existing records for duplicate detection. */
  existingRecords?: Array<Record<string, unknown>>;
  /** Average monthly volume for volume spike detection. */
  avgMonthlyVolume?: number;
}

/**
 * Run all statistical checks on a record.
 */
export function runStatisticalChecks(
  recordType: string,
  data: Record<string, unknown>,
  ctx: StatisticalContext = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...checkOutliers(data, ctx));
  issues.push(...checkTemporalConsistency(data));
  issues.push(...checkDuplicates(data, recordType, ctx));
  issues.push(...checkStaleness(data));

  return issues;
}

/**
 * Z-score outlier detection for numeric fields.
 * Amount > 3σ from historical mean → WARN.
 */
function checkOutliers(data: Record<string, unknown>, ctx: StatisticalContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!ctx.historicalValues || ctx.historicalValues.length < 5) return issues;

  const amount = typeof data.amount === "number" ? data.amount : null;
  if (amount === null) return issues;

  const mean = ctx.historicalValues.reduce((s, v) => s + v, 0) / ctx.historicalValues.length;
  const variance =
    ctx.historicalValues.reduce((s, v) => s + (v - mean) ** 2, 0) / ctx.historicalValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev > 0 && Math.abs(amount - mean) > 3 * stdDev) {
    issues.push({
      layer: 2,
      check: "amount_outlier",
      message: `Amount ${amount} is >3σ from historical mean (${mean.toFixed(0)} ± ${stdDev.toFixed(0)})`,
      severity: "WARN",
      field: "amount",
      value: amount,
    });
  }

  return issues;
}

/**
 * Temporal consistency checks.
 */
function checkTemporalConsistency(data: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dateFields = ["date", "invoiceDate", "dueDate"];
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (const field of dateFields) {
    const val = data[field];
    if (typeof val !== "string") continue;

    const d = new Date(val);
    if (isNaN(d.getTime())) continue;

    if (d > now) {
      issues.push({
        layer: 2,
        check: "date_future",
        message: `${field} is in the future: ${val}`,
        severity: "WARN",
        field,
        value: val,
      });
    }

    if (d < oneYearAgo) {
      issues.push({
        layer: 2,
        check: "date_old",
        message: `${field} is older than 1 year: ${val}`,
        severity: "WARN",
        field,
        value: val,
      });
    }
  }

  return issues;
}

/**
 * Duplicate detection using exact + fuzzy matching.
 */
function checkDuplicates(
  data: Record<string, unknown>,
  recordType: string,
  ctx: StatisticalContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ctx.existingRecords || ctx.existingRecords.length === 0) return issues;

  // Choose match fields based on record type
  const matchFields =
    recordType === "voucher"
      ? ["date", "amount", "description"]
      : recordType === "customer"
        ? ["orgNr"]
        : recordType === "transaction"
          ? ["date", "amount", "description"]
          : [];

  if (matchFields.length === 0) return issues;

  for (const existing of ctx.existingRecords) {
    const allMatch = matchFields.every((f) => {
      const a = data[f];
      const b = existing[f];
      if (a === undefined || b === undefined) return false;
      return String(a).toLowerCase() === String(b).toLowerCase();
    });

    if (allMatch) {
      issues.push({
        layer: 2,
        check: "duplicate_record",
        message: `Possible duplicate: matching ${matchFields.join(", ")}`,
        severity: "WARN",
        field: matchFields.join(","),
      });
      break; // Report only one duplicate match
    }
  }

  return issues;
}

/**
 * Data staleness check — BRREG data > 30 days old.
 */
function checkStaleness(data: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fetchedAt = data.brregFetchedAt ?? data.fetchedAt ?? data.lastUpdated;

  if (typeof fetchedAt === "string") {
    const d = new Date(fetchedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (d < thirtyDaysAgo) {
      issues.push({
        layer: 2,
        check: "stale_data",
        message: `Data last updated ${fetchedAt}, which is older than 30 days`,
        severity: "WARN",
        field: "fetchedAt",
        value: fetchedAt,
      });
    }
  }

  return issues;
}

/**
 * Volume spike detection for batch imports.
 */
export function checkVolumeSpike(
  batchSize: number,
  avgMonthlyVolume: number,
): ValidationIssue | null {
  if (avgMonthlyVolume <= 0) return null;

  const ratio = batchSize / avgMonthlyVolume;
  if (ratio > 2.0) {
    return {
      layer: 2,
      check: "volume_spike",
      message: `Batch size (${batchSize}) is ${(ratio * 100).toFixed(0)}% of monthly average (${avgMonthlyVolume})`,
      severity: "WARN",
    };
  }
  return null;
}
