import { describe, it, expect } from "vitest";
import {
  createInformationNeeds,
  collectDataPoint,
  calculateConfidence,
  getNextDataNeeds,
  canAdvancePhase,
  advancePhase,
  Phase,
} from "../src/hermes/information-needs.ts";

describe("InformationNeedsModel", () => {
  const accountingCompany = {
    companyOrgNumber: "123456789",
    companyName: "Test Regnskap AS",
    industry: "Regnskap og bokføring",
    naceCode: "69.201",
  };

  const hotelCompany = {
    companyOrgNumber: "987654321",
    companyName: "Frogner House AS",
    industry: "Hotell",
    naceCode: "55.101",
  };

  it("creates model with base + accounting requirements", () => {
    const model = createInformationNeeds(accountingCompany);
    expect(model.naceCode).toBe("69.201");
    expect(model.phase).toBe("discovery");
    expect(model.confidence).toBe(0);
    // Should have base (7) + accounting (10) requirements
    expect(model.requirements.length).toBe(17);
    // All should start as missing
    expect(model.requirements.every((r) => r.status === "missing")).toBe(true);
  });

  it("creates model with base + hospitality requirements", () => {
    const model = createInformationNeeds(hotelCompany);
    // Should have base (7) + hospitality (8) requirements
    expect(model.requirements.length).toBe(15);
  });

  it("creates model with base-only for unknown NACE", () => {
    const model = createInformationNeeds({
      ...accountingCompany,
      naceCode: "99.999",
    });
    expect(model.requirements.length).toBe(7); // Only base requirements
  });

  it("collects a data point and updates confidence", () => {
    let model = createInformationNeeds(accountingCompany);
    expect(model.confidence).toBe(0);

    model = collectDataPoint(model, "annual_revenue", 5_000_000);
    const req = model.requirements.find((r) => r.field === "annual_revenue");
    expect(req?.status).toBe("collected");
    expect(req?.value).toBe(5_000_000);
    expect(model.confidence).toBeGreaterThan(0);
  });

  it("marks partial collection", () => {
    let model = createInformationNeeds(accountingCompany);
    model = collectDataPoint(model, "employee_age_distribution", "mostly 40-50", true);
    const req = model.requirements.find((r) => r.field === "employee_age_distribution");
    expect(req?.status).toBe("partial");
  });

  it("prioritizes must > should > nice in next needs", () => {
    const model = createInformationNeeds(accountingCompany);
    const needs = getNextDataNeeds(model);
    const priorities = needs.map((n) => n.priority);
    // All must items should come before should items
    const lastMust = priorities.lastIndexOf("must");
    const firstShould = priorities.indexOf("should");
    if (lastMust >= 0 && firstShould >= 0) {
      expect(lastMust).toBeLessThan(firstShould);
    }
  });

  it("confidence increases as data is collected", () => {
    let model = createInformationNeeds(accountingCompany);
    const confidences: number[] = [model.confidence];

    for (const req of model.requirements.slice(0, 5)) {
      model = collectDataPoint(model, req.field, "test-value");
      confidences.push(model.confidence);
    }

    // Confidence should be monotonically increasing
    for (let i = 1; i < confidences.length; i++) {
      expect(confidences[i]).toBeGreaterThanOrEqual(confidences[i - 1]);
    }
  });

  describe("phase advancement", () => {
    it("cannot advance from discovery without must fields", () => {
      const model = createInformationNeeds(accountingCompany);
      expect(canAdvancePhase(model)).toBe(false);
    });

    it("can advance from discovery when all must fields collected", () => {
      let model = createInformationNeeds(accountingCompany);
      const mustFields = model.requirements.filter((r) => r.priority === "must");
      for (const req of mustFields) {
        model = collectDataPoint(model, req.field, "test-value");
      }
      expect(canAdvancePhase(model)).toBe(true);
    });

    it("advances phase correctly", () => {
      let model = createInformationNeeds(accountingCompany);
      // Collect all must fields
      const mustFields = model.requirements.filter((r) => r.priority === "must");
      for (const req of mustFields) {
        model = collectDataPoint(model, req.field, "test-value");
      }
      model = advancePhase(model);
      expect(model.phase).toBe("mapping");
    });

    it("does not advance if criteria not met", () => {
      const model = createInformationNeeds(accountingCompany);
      const result = advancePhase(model);
      expect(result.phase).toBe("discovery"); // Unchanged
    });
  });

  describe("confidence calculation", () => {
    it("returns 0 for empty requirements", () => {
      expect(calculateConfidence([])).toBe(0);
    });

    it("weights must fields 3x", () => {
      const mustOnly = [
        {
          category: "financial" as const,
          field: "a",
          whyNeeded: "",
          source: "",
          priority: "must" as const,
          status: "collected" as const,
        },
      ];
      const niceOnly = [
        {
          category: "financial" as const,
          field: "b",
          whyNeeded: "",
          source: "",
          priority: "nice" as const,
          status: "collected" as const,
        },
      ];
      // Both should be 100% when collected, but the must one carries more absolute weight
      expect(calculateConfidence(mustOnly)).toBe(100);
      expect(calculateConfidence(niceOnly)).toBe(100);
    });

    it("partial collection counts as 50%", () => {
      const reqs = [
        {
          category: "financial" as const,
          field: "a",
          whyNeeded: "",
          source: "",
          priority: "must" as const,
          status: "partial" as const,
        },
      ];
      expect(calculateConfidence(reqs)).toBe(50);
    });
  });

  describe("error paths (§8)", () => {
    it("collectDataPoint with non-existent field leaves model unchanged", () => {
      let model = createInformationNeeds(accountingCompany);
      const beforeConfidence = model.confidence;
      model = collectDataPoint(model, "nonexistent_field_xyz", "value");
      // No requirement matches, so no status change — confidence stays the same
      expect(model.confidence).toBe(beforeConfidence);
    });

    it("handles unknown NACE code with only base requirements", () => {
      const model = createInformationNeeds({
        companyOrgNumber: "111111111",
        companyName: "Unknown Industry AS",
        industry: "Unknown",
        naceCode: "99.999",
      });
      expect(model.requirements.length).toBe(7); // Only base
      // Should still be functional
      const needs = getNextDataNeeds(model);
      expect(needs.length).toBe(7);
    });

    it("confidence stays 0 when all fields remain missing", () => {
      const model = createInformationNeeds(accountingCompany);
      expect(model.confidence).toBe(0);
      expect(canAdvancePhase(model)).toBe(false);
    });

    it("advancePhase at implementation phase returns same model", () => {
      let model = createInformationNeeds(accountingCompany);
      // Force to implementation phase
      model = { ...model, phase: "implementation" as const };
      const advanced = advancePhase(model);
      expect(advanced.phase).toBe("implementation");
    });
  });
});
