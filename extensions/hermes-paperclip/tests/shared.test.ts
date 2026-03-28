/**
 * Shared utilities tests — priority scorer, confidence, G4 gate.
 */
import { describe, expect, it } from "vitest";
import { AGENTS } from "../src/config/agents.config.ts";
import { getTripletexBase, ENDPOINTS } from "../src/config/tripletex.config.ts";
import { calculatePriority } from "../src/lib/priority-scorer.ts";
import { confidenceFooter } from "../src/shared/audit-logger.ts";

describe("Priority Scorer", () => {
  it("calculates priority = (T×0.4)+(C×0.3)+(F×0.2)+(E×0.1)", () => {
    const score = calculatePriority({
      hoursPerMonth: 40,
      costPerMonth: 50000,
      feasibility: 4,
      errorRate: 3,
    });
    // T=4, C=4, F=4, E=3 → 4*0.4 + 4*0.3 + 4*0.2 + 3*0.1 = 1.6+1.2+0.8+0.3 = 3.9
    expect(score).toBe(3.9);
  });

  it("clamps feasibility and error rate to 1-5", () => {
    const score = calculatePriority({
      hoursPerMonth: 1,
      costPerMonth: 1000,
      feasibility: 10,
      errorRate: -1,
    });
    // T=1, C=1, F=5(clamped), E=1(clamped) → 0.4+0.3+1.0+0.1 = 1.8
    expect(score).toBe(1.8);
  });

  it("handles high-priority processes", () => {
    const score = calculatePriority({
      hoursPerMonth: 100,
      costPerMonth: 100000,
      feasibility: 5,
      errorRate: 5,
    });
    expect(score).toBe(5.0);
  });
});

describe("Agent Config", () => {
  it("has all 5 agents defined", () => {
    expect(Object.keys(AGENTS)).toHaveLength(5);
  });

  it("Renvasken has highest priority", () => {
    const priorities = Object.values(AGENTS).map((a) => a.priorityScore);
    const max = Math.max(...priorities);
    expect(AGENTS.renvasken.priorityScore).toBe(max);
    expect(AGENTS.renvasken.priorityScore).toBe(4.8);
  });

  it("agents have correct parents", () => {
    expect(AGENTS.renvasken.parent).toBe("paperclip");
    expect(AGENTS.bilagsansen.parent).toBe("hermes");
    expect(AGENTS.portalklar.parent).toBe("hermes");
    expect(AGENTS.velkomst.parent).toBe("paperclip");
    expect(AGENTS.tidsvokter.parent).toBe("paperclip");
  });
});

describe("Tripletex Config", () => {
  it("defaults to test environment", () => {
    const original = process.env.TRIPLETEX_ENV;
    delete process.env.TRIPLETEX_ENV;
    expect(getTripletexBase()).toContain("api-test.tripletex.tech");
    process.env.TRIPLETEX_ENV = original;
  });

  it("blocks production without PROD_CONFIRM", () => {
    const originalEnv = process.env.TRIPLETEX_ENV;
    const originalConfirm = process.env.PROD_CONFIRM;
    process.env.TRIPLETEX_ENV = "prod";
    delete process.env.PROD_CONFIRM;
    expect(() => getTripletexBase()).toThrow("PROD_CONFIRM");
    process.env.TRIPLETEX_ENV = originalEnv;
    process.env.PROD_CONFIRM = originalConfirm;
  });

  it("has all required endpoints", () => {
    expect(ENDPOINTS.createVoucher).toBe("POST /ledger/voucher");
    expect(ENDPOINTS.timesheetEntry).toBe("GET /timesheet/entry");
    expect(ENDPOINTS.resultReport).toBe("GET /resultReport");
  });
});

describe("Confidence Footer", () => {
  it("formats H confidence", () => {
    const footer = confidenceFooter("H", "All data validated");
    expect(footer).toBe("Confidence Score: H | Reasoning: All data validated");
  });

  it("formats L confidence", () => {
    const footer = confidenceFooter("L", "Missing data");
    expect(footer).toContain("L");
  });
});
