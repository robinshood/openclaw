import { describe, expect, it } from "vitest";
import { CompanySchema } from "../src/shared/models/company.ts";
import { GapSchema, GapReportSchema, CoverageLevel } from "../src/shared/models/gap.ts";
import { ProcessSchema, calculatePriorityScore } from "../src/shared/models/process.ts";
import { ServiceSchema, ServiceCatalogSchema } from "../src/shared/models/service.ts";
import {
  SprintSchema,
  SprintPlanSchema,
  SprintPhase,
  SprintStatus,
} from "../src/shared/models/sprint.ts";

describe("Company Model", () => {
  it("validates a complete company profile", () => {
    const result = CompanySchema.safeParse({
      orgNumber: "912345678",
      name: "Systemregnskap AS",
      sector: "Accounting",
      revenue: 20000000,
      employeeCount: 7,
      dataSource: "Brønnøysundregistrene",
      lastUpdated: "2026-03-28T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid org number", () => {
    const result = CompanySchema.safeParse({
      orgNumber: "12345",
      name: "Test",
      sector: "Test",
      revenue: 0,
      employeeCount: 0,
      dataSource: "Test",
      lastUpdated: "2026-03-28T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative revenue", () => {
    const result = CompanySchema.safeParse({
      orgNumber: "912345678",
      name: "Test",
      sector: "Test",
      revenue: -100,
      employeeCount: 0,
      dataSource: "Test",
      lastUpdated: "2026-03-28T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("Process Model", () => {
  const validProcess = {
    id: "proc-01",
    name: "Voucher handling",
    description: "Processing vouchers",
    hoursPerMonth: 120,
    costPerMonth: 80000,
    automationFeasibility: "HIGH",
    errorRate: "MEDIUM",
  };

  it("validates a complete process", () => {
    const result = ProcessSchema.safeParse(validProcess);
    expect(result.success).toBe(true);
  });

  it("calculates priority score correctly", () => {
    const process = ProcessSchema.parse(validProcess);
    const score = calculatePriorityScore(process);
    // hours=120 → 5, cost=80000 → 4, feasibility=HIGH → 5, error=MEDIUM → 3
    // 5*0.4 + 4*0.3 + 5*0.2 + 3*0.1 = 2.0 + 1.2 + 1.0 + 0.3 = 4.5
    expect(score).toBeCloseTo(4.5);
  });

  it("calculates lower score for low-priority process", () => {
    const lowPriority = ProcessSchema.parse({
      ...validProcess,
      hoursPerMonth: 5,
      costPerMonth: 2000,
      automationFeasibility: "LOW",
      errorRate: "LOW",
    });
    const score = calculatePriorityScore(lowPriority);
    // hours=5 → 1, cost=2000 → 1, feasibility=LOW → 1, error=LOW → 1
    // All 1s = 1.0
    expect(score).toBeCloseTo(1.0);
  });
});

describe("Gap Model", () => {
  it("validates a gap report", () => {
    const result = GapReportSchema.safeParse({
      companyId: "912345678",
      companyName: "Test",
      totalProcesses: 12,
      fullyCovered: 4,
      partiallyCovered: 7,
      uncovered: 1,
      gaps: [
        {
          id: "gap-1",
          processId: "proc-01",
          processName: "Test",
          ootbCoverage: [{ tool: "Propell.ai", coverageLevel: CoverageLevel.PARTIAL }],
          overallCoverageLevel: CoverageLevel.PARTIAL,
          gapDescription: "Needs custom automation",
          automationCandidate: true,
        },
      ],
      generatedAt: "2026-03-28T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("Sprint Model", () => {
  it("validates a sprint plan with all phases", () => {
    const result = SprintPlanSchema.safeParse({
      companyId: "912345678",
      companyName: "Test",
      sprints: [
        {
          id: "s1",
          number: 1,
          phase: SprintPhase.WORKSHOP,
          goals: ["Map processes"],
          automations: [],
          goNoGoCriteria: [],
          status: SprintStatus.PLANNED,
        },
        {
          id: "s2",
          number: 2,
          phase: SprintPhase.POC,
          goals: ["Build PoC"],
          automations: [],
          goNoGoCriteria: [{ criterion: "Time reduction", threshold: ">=20%" }],
          status: SprintStatus.PLANNED,
        },
        {
          id: "s3",
          number: 3,
          phase: SprintPhase.MVP,
          goals: ["Deploy MVP"],
          automations: [],
          goNoGoCriteria: [],
          status: SprintStatus.PLANNED,
        },
        {
          id: "s4",
          number: 4,
          phase: SprintPhase.SCALE,
          goals: ["Scale"],
          automations: [],
          goNoGoCriteria: [],
          status: SprintStatus.PLANNED,
        },
      ],
      createdAt: "2026-03-28T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("Service Model", () => {
  it("validates a service catalog", () => {
    const result = ServiceCatalogSchema.safeParse({
      services: [
        {
          id: "svc-1",
          name: "Process Automation",
          description: "Automate manual processes",
          tier: "STANDARD",
          slas: [{ metric: "Uptime", target: "99.5%" }],
          companies: ["912345678"],
          costAllocations: [
            {
              companyId: "912345678",
              companyName: "Test",
              monthlyCost: 10000,
              armsLengthVerified: true,
            },
          ],
        },
      ],
      lastUpdated: "2026-03-28T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("requires arms length verification", () => {
    const result = ServiceCatalogSchema.safeParse({
      services: [
        {
          id: "svc-1",
          name: "Test",
          description: "Test",
          tier: "BASIC",
          slas: [],
          companies: [],
          costAllocations: [{ companyId: "x", companyName: "X", monthlyCost: 5000 }],
        },
      ],
      lastUpdated: "2026-03-28T00:00:00.000Z",
    });
    // armsLengthVerified is required
    expect(result.success).toBe(false);
  });
});
