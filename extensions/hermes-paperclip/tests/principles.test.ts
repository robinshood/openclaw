import { describe, expect, it } from "vitest";
import {
  createAdrFromPipeline,
  formatAdrMarkdown,
  resetAdrCounter,
  AdrCategory,
} from "../src/shared/principles/adr.ts";
import {
  buildCriteria,
  evaluateOptions,
  fullDecisionPipeline,
  scoreOption,
  validateWeights,
} from "../src/shared/principles/decision-matrix.ts";
import { decompose, isSafeToDecide } from "../src/shared/principles/first-principles.ts";
import {
  applyHumanOverride,
  evaluateAllOptions,
  evaluateOption,
  generateFailureModes,
} from "../src/shared/principles/inversion.ts";
import {
  FailureMode,
  Severity,
  PROCESS_CRITERIA_WEIGHTS,
  STRATEGIC_CRITERIA_WEIGHTS,
  type Truth,
  type Assumption,
  type DecisionCriterion,
  type InversionContext,
} from "../src/shared/principles/types.ts";

// --- First Principles Tests ---

describe("First Principles", () => {
  it("decomposes a problem with verified truths", () => {
    const truths: Truth[] = [
      {
        statement: "Revenue is 20M NOK",
        dataSource: "Brønnøysundregistrene",
        verified: true,
        confidence: 95,
      },
      {
        statement: "7 employees",
        dataSource: "Due Diligence docs",
        verified: true,
        confidence: 100,
      },
    ];
    const assumptions: Assumption[] = [
      { statement: "Efficiency can improve 20%", confidence: 70, rationale: "Industry benchmark" },
    ];

    const result = decompose("Evaluate Systemregnskap acquisition", truths, assumptions);

    expect(result.problem).toBe("Evaluate Systemregnskap acquisition");
    expect(result.truths).toHaveLength(2);
    expect(result.unverifiedTruths).toHaveLength(0);
    expect(result.lowConfidenceAssumptions).toHaveLength(1);
    expect(result.lowConfidenceAssumptions[0].requiresVerification).toBe(true);
    expect(result.isFullyVerified).toBe(false);
  });

  it("flags unverified truths", () => {
    const truths: Truth[] = [
      {
        statement: "Revenue growing",
        dataSource: "Verbal estimate",
        verified: false,
        confidence: 60,
      },
    ];

    const result = decompose("Assess growth", truths, []);
    expect(result.unverifiedTruths).toHaveLength(1);
    expect(result.isFullyVerified).toBe(false);
  });

  it("throws when truth has no data source", () => {
    const truths: Truth[] = [
      { statement: "It's good", dataSource: "", verified: true, confidence: 100 },
    ];

    expect(() => decompose("Test", truths, [])).toThrow("missing data sources");
  });

  it("throws on empty problem", () => {
    expect(() => decompose("", [], [])).toThrow("cannot be empty");
  });

  it("marks fully verified when all truths verified and assumptions confident", () => {
    const truths: Truth[] = [
      { statement: "Revenue is 20M", dataSource: "API", verified: true, confidence: 95 },
    ];
    const assumptions: Assumption[] = [
      { statement: "Market stable", confidence: 85, rationale: "Historical data" },
    ];

    const result = decompose("Test", truths, assumptions);
    expect(result.isFullyVerified).toBe(true);
  });

  it("isSafeToDecide returns false with unverified truths", () => {
    const result = decompose(
      "Test",
      [{ statement: "X", dataSource: "Y", verified: false, confidence: 50 }],
      [],
    );
    expect(isSafeToDecide(result)).toBe(false);
  });

  it("isSafeToDecide returns false with very low confidence assumptions", () => {
    const result = decompose(
      "Test",
      [{ statement: "X", dataSource: "Y", verified: true, confidence: 100 }],
      [{ statement: "Guess", confidence: 30, rationale: "No data" }],
    );
    expect(isSafeToDecide(result)).toBe(false);
  });
});

// --- Inversion Tests ---

describe("Inversion", () => {
  it("detects failure modes from context keywords", () => {
    const context: InversionContext = {
      description: "Replace existing system with custom build from scratch",
      options: ["Build custom CRM"],
    };

    const modes = generateFailureModes(context);
    const disruption = modes.find((m) => m.mode === FailureMode.DISRUPTION);
    const missedStandard = modes.find((m) => m.mode === FailureMode.MISSED_STANDARD);

    expect(disruption?.detected).toBe(true);
    expect(missedStandard?.detected).toBe(true);
  });

  it("detects KNOWLEDGE_LOSS for retirement context", () => {
    const context: InversionContext = {
      description: "Employee retiring next year with key person risk",
      options: ["Wait and see"],
    };

    const modes = generateFailureModes(context);
    const knowledgeLoss = modes.find((m) => m.mode === FailureMode.KNOWLEDGE_LOSS);

    expect(knowledgeLoss?.detected).toBe(true);
    expect(knowledgeLoss?.severity).toBe(Severity.CRITICAL);
  });

  it("eliminates option with detected failure mode", () => {
    const modes = [
      {
        mode: FailureMode.DATA_LEAK as const,
        detected: true,
        evidence: "Shared DB",
        severity: Severity.CRITICAL as const,
      },
    ];

    const result = evaluateOption("Share database", modes);
    expect(result.eliminated).toBe(true);
    expect(result.eliminationReasons).toHaveLength(1);
  });

  it("does not eliminate option when failure mode has human override", () => {
    const modes = [
      {
        mode: FailureMode.DISRUPTION as const,
        detected: true,
        evidence: "Migration",
        severity: Severity.HIGH as const,
        humanOverride: true,
        overrideRationale: "Risk accepted by CTO",
      },
    ];

    const result = evaluateOption("Migrate system", modes);
    expect(result.eliminated).toBe(false);
  });

  it("applyHumanOverride requires rationale", () => {
    const check = {
      mode: FailureMode.OVERSPEND as const,
      detected: true,
      evidence: "Unused licenses",
      severity: Severity.HIGH as const,
    };

    expect(() => applyHumanOverride(check, "")).toThrow("rationale");
    const overridden = applyHumanOverride(check, "Budget approved by board");
    expect(overridden.humanOverride).toBe(true);
  });

  it("evaluateAllOptions checks each option independently", () => {
    const context: InversionContext = {
      description: "Evaluate payroll solutions",
      options: ["Build custom from scratch", "Use Sanna"],
    };

    const results = evaluateAllOptions(context);
    expect(results).toHaveLength(2);

    const custom = results.find((r) => r.option === "Build custom from scratch");
    expect(custom?.eliminated).toBe(true);
  });
});

// --- Decision Matrix Tests ---

describe("Decision Matrix", () => {
  it("computes weighted score correctly", () => {
    const criteria: DecisionCriterion[] = [
      { name: "time", weight: 0.4, score: 5 },
      { name: "cost", weight: 0.3, score: 4 },
      { name: "feasibility", weight: 0.2, score: 3 },
      { name: "error", weight: 0.1, score: 2 },
    ];

    const score = scoreOption(criteria);
    // 0.4*5 + 0.3*4 + 0.2*3 + 0.1*2 = 2.0 + 1.2 + 0.6 + 0.2 = 4.0
    expect(score).toBeCloseTo(4.0);
  });

  it("throws when weights don't sum to 1.0", () => {
    const criteria: DecisionCriterion[] = [
      { name: "a", weight: 0.5, score: 3 },
      { name: "b", weight: 0.3, score: 3 },
    ];

    expect(() => scoreOption(criteria)).toThrow("sum to 1.0");
  });

  it("validates weights correctly", () => {
    const good: DecisionCriterion[] = [
      { name: "a", weight: 0.6, score: 3 },
      { name: "b", weight: 0.4, score: 3 },
    ];
    expect(validateWeights(good)).toBe(true);

    const bad: DecisionCriterion[] = [
      { name: "a", weight: 0.5, score: 3 },
      { name: "b", weight: 0.3, score: 3 },
    ];
    expect(validateWeights(bad)).toBe(false);
  });

  it("recommends option above threshold with sufficient lead", () => {
    const result = evaluateOptions([
      { name: "Option A", criteria: buildCriteria({ x: 0.5, y: 0.5 }, { x: 4, y: 5 }) },
      { name: "Option B", criteria: buildCriteria({ x: 0.5, y: 0.5 }, { x: 2, y: 3 }) },
    ]);

    expect(result.recommended).toBe("Option A");
    expect(result.isTie).toBe(false);
    expect(result.requiresEscalation).toBe(false);
  });

  it("detects tie when top-2 are within margin", () => {
    const result = evaluateOptions([
      { name: "A", criteria: buildCriteria({ x: 0.5, y: 0.5 }, { x: 4, y: 4 }) },
      { name: "B", criteria: buildCriteria({ x: 0.5, y: 0.5 }, { x: 4, y: 4 }) },
    ]);

    expect(result.isTie).toBe(true);
  });

  it("escalates when no option above threshold", () => {
    const result = evaluateOptions([
      { name: "A", criteria: buildCriteria({ x: 0.5, y: 0.5 }, { x: 2, y: 2 }) },
      { name: "B", criteria: buildCriteria({ x: 0.5, y: 0.5 }, { x: 1, y: 3 }) },
    ]);

    expect(result.requiresEscalation).toBe(true);
    expect(result.recommended).toBeNull();
  });

  it("returns escalation for empty options", () => {
    const result = evaluateOptions([]);
    expect(result.requiresEscalation).toBe(true);
  });

  it("buildCriteria throws on missing score", () => {
    expect(() => buildCriteria({ x: 1.0 }, {})).toThrow("Missing score");
  });

  it("buildCriteria throws on invalid score", () => {
    expect(() => buildCriteria({ x: 1.0 }, { x: 6 })).toThrow("must be 1-5");
  });

  it("process criteria weights sum to 1.0", () => {
    const sum = Object.values(PROCESS_CRITERIA_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it("strategic criteria weights sum to 1.0", () => {
    const sum = Object.values(STRATEGIC_CRITERIA_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });
});

// --- Full Pipeline Tests ---

describe("Full Decision Pipeline", () => {
  it("runs decompose → invert → score in sequence", () => {
    const result = fullDecisionPipeline({
      problem: "Choose payroll system for Systemregnskap",
      truths: [
        {
          statement: "Currently using Excel for payroll",
          dataSource: "DD docs",
          verified: true,
          confidence: 100,
        },
        {
          statement: "7 employees process payroll",
          dataSource: "Interview",
          verified: true,
          confidence: 90,
        },
      ],
      assumptions: [
        {
          statement: "Sanna integrates with TripleTex",
          confidence: 85,
          rationale: "Vendor documentation",
        },
      ],
      options: [
        {
          name: "Use Sanna",
          criteria: buildCriteria(PROCESS_CRITERIA_WEIGHTS, {
            timeConsumed: 4,
            costImpact: 4,
            automationFeasibility: 5,
            errorRate: 3,
          }),
        },
        {
          name: "Build custom from scratch payroll",
          criteria: buildCriteria(PROCESS_CRITERIA_WEIGHTS, {
            timeConsumed: 5,
            costImpact: 2,
            automationFeasibility: 2,
            errorRate: 4,
          }),
        },
      ],
      inversionContext: {
        description: "Choose payroll system",
        options: ["Use Sanna", "Build custom from scratch payroll"],
      },
    });

    expect(result.decomposition.isFullyVerified).toBe(true);
    expect(result.inversions).toHaveLength(2);

    // "Build custom from scratch" should be eliminated by MISSED_STANDARD
    const customOption = result.inversions.find(
      (i) => i.option === "Build custom from scratch payroll",
    );
    expect(customOption?.eliminated).toBe(true);

    // Pipeline should still produce matrix for surviving options
    expect(result.survivingOptions).toContain("Use Sanna");
    expect(result.matrix).not.toBeNull();
    expect(result.timestamp).toBeTruthy();
  });

  it("escalates when decomposition has unverified truths", () => {
    const result = fullDecisionPipeline({
      problem: "Test",
      truths: [
        { statement: "Unverified claim", dataSource: "Rumor", verified: false, confidence: 50 },
      ],
      assumptions: [],
      options: [{ name: "A", criteria: buildCriteria({ x: 1.0 }, { x: 5 }) }],
      inversionContext: { description: "Test", options: ["A"] },
    });

    expect(result.matrix?.requiresEscalation).toBe(true);
  });
});

// --- ADR Tests ---

describe("Architecture Decision Records", () => {
  it("creates ADR from pipeline result", () => {
    resetAdrCounter();

    const pipelineResult = fullDecisionPipeline({
      problem: "Choose accounting automation",
      truths: [
        {
          statement: "Manual voucher handling takes 120h/month",
          dataSource: "Process audit",
          verified: true,
          confidence: 95,
        },
      ],
      assumptions: [],
      options: [
        {
          name: "Use Propell.ai",
          criteria: buildCriteria(PROCESS_CRITERIA_WEIGHTS, {
            timeConsumed: 5,
            costImpact: 4,
            automationFeasibility: 5,
            errorRate: 3,
          }),
        },
      ],
      inversionContext: { description: "Choose automation tool", options: ["Use Propell.ai"] },
    });

    const adr = createAdrFromPipeline({
      title: "Use Propell.ai for voucher automation",
      category: AdrCategory.TOOLING,
      context: "Systemregnskap spends 120h/month on manual voucher handling",
      problem: "How to reduce manual voucher processing time",
      pipelineResult,
      decision: "Adopt Propell.ai for voucher automation",
      rationale: "Propell.ai provides 23-40% no-touch rate, purpose-built for Norwegian accounting",
      consequences: {
        positive: ["Reduce manual work by 23-40%", "Industry-standard tooling"],
        negative: ["Monthly license cost", "Training required"],
        risks: ["Partial coverage only — still need manual review for 60-77%"],
      },
      decisionMaker: "Hermes Agent",
      stakeholders: ["Ole Ramstad", "Bjørg Hansen"],
    });

    expect(adr.id).toBe("ADR-0001");
    expect(adr.status).toBe("PROPOSED");
    expect(adr.optionsConsidered.length).toBeGreaterThan(0);

    const markdown = formatAdrMarkdown(adr);
    expect(markdown).toContain("ADR-0001");
    expect(markdown).toContain("Propell.ai");
    expect(markdown).toContain("## Context");
    expect(markdown).toContain("## Consequences");
  });
});
