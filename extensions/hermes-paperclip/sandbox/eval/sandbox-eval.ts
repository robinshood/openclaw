import type { EvalResult } from "./criteria.ts";

/**
 * Aggregates evaluation results from a sandbox run.
 */
export interface SandboxEvalReport {
  scenarioName: string;
  totalCheckpoints: number;
  passed: number;
  failed: number;
  results: EvalResult[];
  overallPassed: boolean;
  timestamp: string;
}

export function createEvalReport(scenarioName: string, results: EvalResult[]): SandboxEvalReport {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    scenarioName,
    totalCheckpoints: results.length,
    passed,
    failed,
    results,
    overallPassed: failed === 0,
    timestamp: new Date().toISOString(),
  };
}

export function formatEvalReport(report: SandboxEvalReport): string {
  const lines: string[] = [
    `# Sandbox Eval: ${report.scenarioName}`,
    `**Result:** ${report.overallPassed ? "PASS" : "FAIL"}`,
    `**Checkpoints:** ${report.passed}/${report.totalCheckpoints} passed`,
    `**Timestamp:** ${report.timestamp}`,
    "",
    "## Results",
    "",
  ];

  for (const result of report.results) {
    const icon = result.passed ? "[PASS]" : "[FAIL]";
    lines.push(`${icon} **${result.checkpoint}**: ${result.details}`);
  }

  return lines.join("\n");
}
