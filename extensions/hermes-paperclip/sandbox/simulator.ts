import { createLogger } from "../src/shared/utils/logger.ts";
import type { EvalResult } from "./eval/criteria.ts";
import { createEvalReport, formatEvalReport, type SandboxEvalReport } from "./eval/sandbox-eval.ts";

export interface ScenarioStep {
  name: string;
  description: string;
  execute: () => Promise<EvalResult>;
}

export interface Scenario {
  name: string;
  description: string;
  steps: ScenarioStep[];
}

/**
 * Runs a full acquisition simulation scenario.
 * Each step is executed sequentially, evaluated, and logged.
 */
export async function runScenario(scenario: Scenario): Promise<SandboxEvalReport> {
  const logger = createLogger("mission-control");
  logger.info(`Starting scenario: ${scenario.name}`, { description: scenario.description });

  const results: EvalResult[] = [];

  for (const step of scenario.steps) {
    logger.info(`Executing step: ${step.name}`, { description: step.description });

    const result = await step.execute();
    results.push(result);

    if (result.passed) {
      logger.info(`Step passed: ${step.name}`, { details: result.details });
    } else {
      logger.warn(`Step failed: ${step.name}`, { details: result.details });
    }
  }

  const report = createEvalReport(scenario.name, results);

  logger.info("Scenario complete", {
    passed: report.passed,
    failed: report.failed,
    overallPassed: report.overallPassed,
  });

  return report;
}

/**
 * Pretty-prints a scenario evaluation report.
 */
export { formatEvalReport };
