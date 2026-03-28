import { describe, expect, it } from "vitest";
import { createSystemregnskapScenario } from "../sandbox/scenarios/systemregnskap.ts";
import { runScenario } from "../sandbox/simulator.ts";

describe("Sandbox: Systemregnskap Scenario", () => {
  it("runs full acquisition simulation and passes all checkpoints", async () => {
    const scenario = createSystemregnskapScenario();
    const report = await runScenario(scenario);

    expect(report.scenarioName).toBe("Systemregnskap AS Acquisition");
    expect(report.totalCheckpoints).toBe(6);

    // Log individual results for debugging
    for (const result of report.results) {
      if (!result.passed) {
        console.log(`FAILED: ${result.checkpoint} — ${result.details}`);
      }
    }

    expect(report.overallPassed).toBe(true);
    expect(report.failed).toBe(0);
  });
});
