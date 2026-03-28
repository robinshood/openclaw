/**
 * Renvasken quality reporter — generates data quality reports.
 */

import type { DataQualityStatus, ValidationIssue, ValidationResult } from "../../shared/types.ts";

export interface QualityReport {
  source: string;
  timestamp: string;
  totalRecords: number;
  cleanCount: number;
  suspectCount: number;
  dirtyCount: number;
  cleanPct: number;
  suspectPct: number;
  dirtyPct: number;
  topIssues: Array<{ check: string; count: number; layer: number }>;
  passesThreshold: boolean;
  summary: string;
}

/**
 * Generate a quality report from validation results.
 */
export function generateReport(source: string, results: ValidationResult[]): QualityReport {
  const total = results.length;
  const clean = results.filter((r) => r.status === "clean").length;
  const suspect = results.filter((r) => r.status === "suspect").length;
  const dirty = results.filter((r) => r.status === "dirty").length;

  const cleanPct = total > 0 ? Math.round((clean / total) * 1000) / 10 : 0;
  const suspectPct = total > 0 ? Math.round((suspect / total) * 1000) / 10 : 0;
  const dirtyPct = total > 0 ? Math.round((dirty / total) * 1000) / 10 : 0;

  const topIssues = countTopIssues(results);
  const passesThreshold = cleanPct >= 85;

  const summary = formatSummary({
    source,
    total,
    clean,
    suspect,
    dirty,
    cleanPct,
    topIssues,
    passesThreshold,
  });

  return {
    source,
    timestamp: new Date().toISOString(),
    totalRecords: total,
    cleanCount: clean,
    suspectCount: suspect,
    dirtyCount: dirty,
    cleanPct,
    suspectPct,
    dirtyPct,
    topIssues,
    passesThreshold,
    summary,
  };
}

function countTopIssues(
  results: ValidationResult[],
): Array<{ check: string; count: number; layer: number }> {
  const counts = new Map<string, { count: number; layer: number }>();

  for (const result of results) {
    for (const issue of result.issues) {
      const key = issue.check;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { count: 1, layer: issue.layer });
      }
    }
  }

  return Array.from(counts.entries())
    .map(([check, { count, layer }]) => ({ check, count, layer }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function formatSummary(data: {
  source: string;
  total: number;
  clean: number;
  suspect: number;
  dirty: number;
  cleanPct: number;
  topIssues: Array<{ check: string; count: number; layer: number }>;
  passesThreshold: boolean;
}): string {
  const lines = [
    `Data Quality Report — ${new Date().toISOString().split("T")[0]}`,
    `Source: ${data.source} (${data.total} records)`,
    ``,
    `Summary:`,
    `  CLEAN:   ${data.clean} records (${data.cleanPct}%)`,
    `  SUSPECT: ${data.suspect} records`,
    `  DIRTY:   ${data.dirty} records — BLOCKED`,
    ``,
  ];

  if (data.topIssues.length > 0) {
    lines.push(`Top Issues:`);
    for (const issue of data.topIssues) {
      lines.push(`  [Layer ${issue.layer}] ${issue.count}x ${issue.check}`);
    }
    lines.push(``);
  }

  const status = data.passesThreshold ? "PASS" : "FAIL";
  const confidence = data.cleanPct >= 90 ? "H" : data.cleanPct >= 80 ? "M" : "L";
  lines.push(`Dataset Quality: ${status} (${data.cleanPct}% clean, threshold: 85%)`);
  lines.push(`Confidence Score: ${confidence} | Reasoning: ${data.cleanPct}% clean rate`);

  return lines.join("\n");
}
