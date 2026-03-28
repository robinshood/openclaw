/**
 * Renvasken — Data Quality Gate tests.
 */
import { describe, expect, it } from "vitest";
import { checkCompliance } from "../src/agents/renvasken/compliance-checker.ts";
import {
  scoreRecord,
  toStatus,
  deriveLayerResults,
  datasetQualityCheck,
} from "../src/agents/renvasken/confidence-scorer.ts";
import { validateRecord } from "../src/agents/renvasken/index.ts";
import { generateReport } from "../src/agents/renvasken/quality-reporter.ts";
import { validateSchema, validateEncoding } from "../src/agents/renvasken/schema-validator.ts";
import { runStatisticalChecks } from "../src/agents/renvasken/statistical-checks.ts";
import cleanData from "./fixtures/mock-clean-data.json";
import dirtyData from "./fixtures/mock-dirty-data.json";

// --- Layer 1: Schema Validation ---

describe("Renvasken Layer 1: Schema Validation", () => {
  it("validates a clean voucher", () => {
    const result = validateSchema("voucher", cleanData.voucher);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects a voucher missing required fields", () => {
    const result = validateSchema("voucher", dirtyData.voucher_missing_fields);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].layer).toBe(1);
  });

  it("validates a clean customer", () => {
    const result = validateSchema("customer", cleanData.customer);
    expect(result.passed).toBe(true);
  });

  it("rejects customer with invalid org number", () => {
    const result = validateSchema("customer", dirtyData.customer_invalid_org);
    expect(result.passed).toBe(false);
  });

  it("validates a clean transaction", () => {
    const result = validateSchema("transaction", cleanData.transaction);
    expect(result.passed).toBe(true);
  });

  it("validates a clean employee", () => {
    const result = validateSchema("employee", cleanData.employee);
    expect(result.passed).toBe(true);
  });

  it("detects Norwegian character encoding issues", () => {
    const issues = validateEncoding({ name: "Bl\u00e5b\u00e6r Caf\u00e9" });
    expect(issues).toHaveLength(0);

    const badIssues = validateEncoding({ name: "BlÃ¥bÃ¦r" });
    expect(badIssues.length).toBeGreaterThan(0);
  });

  it("returns block issue for unknown record type", () => {
    const result = validateSchema("unknown_type", { foo: "bar" });
    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].check).toBe("schema_exists");
  });
});

// --- Layer 2: Statistical Checks ---

describe("Renvasken Layer 2: Statistical Checks", () => {
  it("detects future dates", () => {
    const issues = runStatisticalChecks("transaction", {
      date: "2030-01-01",
      amount: -500,
    });
    const futureIssue = issues.find((i) => i.check === "date_future");
    expect(futureIssue).toBeDefined();
  });

  it("passes for normal data", () => {
    const issues = runStatisticalChecks("transaction", cleanData.transaction);
    const blockingIssues = issues.filter((i) => i.severity === "BLOCK");
    expect(blockingIssues).toHaveLength(0);
  });

  it("detects statistical outliers with context", () => {
    const issues = runStatisticalChecks(
      "transaction",
      { amount: -999999 },
      {
        historicalValues: [-100, -150, -120, -130, -110],
      },
    );
    const outlier = issues.find((i) => i.check === "amount_outlier");
    expect(outlier).toBeDefined();
  });
});

// --- Layer 4: Compliance ---

describe("Renvasken Layer 4: Compliance", () => {
  it("passes a compliant voucher", () => {
    const issues = checkCompliance("voucher", cleanData.voucher);
    expect(issues).toHaveLength(0);
  });

  it("detects invalid MVA rate", () => {
    const issues = checkCompliance("voucher", dirtyData.voucher_invalid_mva);
    const mvaIssue = issues.find((i) => i.check === "mva_rate_invalid");
    expect(mvaIssue).toBeDefined();
  });

  it("skips compliance for non-voucher types", () => {
    const issues = checkCompliance("customer", cleanData.customer);
    expect(issues).toHaveLength(0);
  });
});

// --- Confidence Scoring ---

describe("Renvasken Confidence Scoring", () => {
  it("scores a clean record highly", () => {
    const layers = deriveLayerResults([]);
    layers.semanticPassed = true;
    const score = scoreRecord(layers);
    expect(score).toBeGreaterThanOrEqual(0.9);
    expect(toStatus(score)).toBe("clean");
  });

  it("scores a record with warnings as suspect or clean", () => {
    const layers = deriveLayerResults([
      { layer: 2, check: "test", message: "warning", severity: "WARN" },
      { layer: 2, check: "test2", message: "warning2", severity: "WARN" },
    ]);
    layers.semanticPassed = true;
    const score = scoreRecord(layers);
    // WARN doesn't cause BLOCK, so all layers pass → clean
    expect(toStatus(score)).toBe("clean");
  });

  it("scores a record with blocking issues as dirty", () => {
    const layers = deriveLayerResults([
      { layer: 1, check: "schema", message: "missing field", severity: "BLOCK" },
    ]);
    layers.semanticPassed = true;
    const score = scoreRecord(layers);
    expect(score).toBeLessThan(0.9);
  });

  it("checks dataset quality threshold", () => {
    const passing = datasetQualityCheck([
      "clean",
      "clean",
      "clean",
      "clean",
      "clean",
      "clean",
      "clean",
      "clean",
      "clean",
      "suspect",
    ]);
    expect(passing.passed).toBe(true);

    const failing = datasetQualityCheck(["dirty", "dirty", "dirty", "clean", "suspect"]);
    expect(failing.passed).toBe(false);
  });
});

// --- Quality Reporter ---

describe("Renvasken Quality Reporter", () => {
  it("generates a report from validation results", () => {
    const results = [
      {
        recordId: "1",
        source: "tripletex" as const,
        recordType: "voucher",
        rawData: {},
        cleanedData: null,
        issues: [],
        confidenceScore: 0.95,
        status: "clean" as const,
        autoFixApplied: false,
        autoFixDescription: null,
      },
      {
        recordId: "2",
        source: "tripletex" as const,
        recordType: "voucher",
        rawData: {},
        cleanedData: null,
        issues: [
          { layer: 1 as const, check: "schema", message: "bad", severity: "BLOCK" as const },
        ],
        confidenceScore: 0.3,
        status: "dirty" as const,
        autoFixApplied: false,
        autoFixDescription: null,
      },
    ];

    const report = generateReport("tripletex", results);
    expect(report.totalRecords).toBe(2);
    expect(report.cleanCount).toBe(1);
    expect(report.dirtyCount).toBe(1);
    expect(report.cleanPct).toBe(50);
    expect(report.passesThreshold).toBe(false);
    expect(report.summary).toContain("FAIL");
  });
});

// --- Integration: validateRecord ---

describe("Renvasken validateRecord (integration)", () => {
  it("validates a clean transaction end-to-end", () => {
    const result = validateRecord("test-1", cleanData.transaction, {
      source: "tripletex",
      recordType: "transaction",
    });
    expect(result.status).toBe("clean");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.6);
  });

  it("marks dirty data correctly", () => {
    const result = validateRecord("test-2", dirtyData.voucher_missing_fields, {
      source: "tripletex",
      recordType: "voucher",
    });
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
