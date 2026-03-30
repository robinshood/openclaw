import { describe, it, expect } from "vitest";
import {
  calculateParsScore,
  classifyTier,
  buildParsResult,
  normalizeVolume,
  normalizeTime,
  normalizeErrorRate,
  DEFAULT_PARS_WEIGHTS,
  ParsTier,
} from "../src/shared/scoring/pars.ts";
import type { DimensionScore, ParsWeights } from "../src/shared/scoring/pars.ts";
import {
  calculateWsjf,
  calculateCostOfDelay,
  rankByWsjf,
  quickWsjf,
} from "../src/shared/scoring/wsjf.ts";
import type { WsjfItem } from "../src/shared/scoring/wsjf.ts";

describe("PARS Scoring", () => {
  const makeScores = (values: number[]): DimensionScore[] => {
    const dims = [
      "volume",
      "time",
      "error",
      "standardization",
      "digitization",
      "compliance",
      "integration",
      "roi",
    ] as const;
    return dims.map((dim, i) => ({
      dimension: dim,
      score: values[i],
      rationale: `Test ${dim}`,
      dataSource: "test",
    }));
  };

  it("calculates weighted score with default weights", () => {
    const scores = makeScores([80, 70, 60, 90, 50, 80, 75, 85]);
    const total = calculateParsScore(scores, DEFAULT_PARS_WEIGHTS);
    // Manual: 80*.10 + 70*.15 + 60*.10 + 90*.15 + 50*.10 + 80*.10 + 75*.15 + 85*.15
    // = 8 + 10.5 + 6 + 13.5 + 5 + 8 + 11.25 + 12.75 = 75
    expect(total).toBe(75);
  });

  it("classifies tier 1 (≥70)", () => {
    expect(classifyTier(70)).toBe(ParsTier.TIER_1);
    expect(classifyTier(100)).toBe(ParsTier.TIER_1);
  });

  it("classifies tier 2 (50-69)", () => {
    expect(classifyTier(50)).toBe(ParsTier.TIER_2);
    expect(classifyTier(69)).toBe(ParsTier.TIER_2);
  });

  it("classifies tier 3 (<50)", () => {
    expect(classifyTier(49)).toBe(ParsTier.TIER_3);
    expect(classifyTier(0)).toBe(ParsTier.TIER_3);
  });

  it("rejects weights that don't sum to 1.0", () => {
    const badWeights = { ...DEFAULT_PARS_WEIGHTS, volume: 0.5 };
    const scores = makeScores([50, 50, 50, 50, 50, 50, 50, 50]);
    expect(() => calculateParsScore(scores, badWeights)).toThrow("weights must sum to 1.0");
  });

  it("rejects wrong number of dimensions", () => {
    const partialScores = makeScores([50, 50, 50, 50, 50, 50, 50, 50]).slice(0, 5);
    expect(() => calculateParsScore(partialScores, DEFAULT_PARS_WEIGHTS)).toThrow("exactly 8");
  });

  it("builds complete PARS result", () => {
    const scores = makeScores([80, 70, 60, 90, 50, 80, 75, 85]);
    const result = buildParsResult({
      processId: "proc-1",
      processName: "Bilagshåndtering",
      scores,
    });
    expect(result.totalScore).toBe(75);
    expect(result.tier).toBe("tier_1");
    expect(result.processId).toBe("proc-1");
    expect(result.scoredBy).toBe("hermes");
  });

  describe("normalization", () => {
    it("normalizes volume logarithmically", () => {
      expect(normalizeVolume(0)).toBe(0);
      expect(normalizeVolume(1000)).toBe(100);
      const mid = normalizeVolume(100);
      expect(mid).toBeGreaterThan(30);
      expect(mid).toBeLessThan(80);
    });

    it("normalizes time logarithmically", () => {
      expect(normalizeTime(0)).toBe(0);
      expect(normalizeTime(160)).toBe(100);
      expect(normalizeTime(20)).toBeGreaterThan(30);
    });

    it("normalizes error rate linearly", () => {
      expect(normalizeErrorRate(0)).toBe(0);
      expect(normalizeErrorRate(0.5)).toBe(50);
      expect(normalizeErrorRate(1.0)).toBe(100);
      expect(normalizeErrorRate(1.5)).toBe(100); // Clamped
    });
  });
});

describe("WSJF", () => {
  it("calculates cost of delay", () => {
    expect(calculateCostOfDelay({ businessValue: 8, timeCriticality: 5, riskReduction: 3 })).toBe(
      16,
    );
  });

  it("calculates WSJF score", () => {
    const item: WsjfItem = {
      id: "1",
      name: "Bilagsansen",
      costOfDelay: { businessValue: 8, timeCriticality: 5, riskReduction: 3 },
      jobSize: 5,
    };
    expect(calculateWsjf(item)).toBe(3.2); // 16 / 5
  });

  it("ranks items by WSJF (highest first)", () => {
    const items: WsjfItem[] = [
      {
        id: "low",
        name: "Low priority",
        costOfDelay: { businessValue: 2, timeCriticality: 1, riskReduction: 1 },
        jobSize: 8,
      },
      {
        id: "high",
        name: "High priority",
        costOfDelay: { businessValue: 13, timeCriticality: 8, riskReduction: 5 },
        jobSize: 3,
      },
      {
        id: "mid",
        name: "Mid priority",
        costOfDelay: { businessValue: 5, timeCriticality: 3, riskReduction: 2 },
        jobSize: 5,
      },
    ];
    const ranked = rankByWsjf(items);
    expect(ranked[0].id).toBe("high");
    expect(ranked[ranked.length - 1].id).toBe("low");
  });

  it("quickWsjf matches full calculation", () => {
    expect(quickWsjf(8, 5, 3, 5)).toBe(3.2);
  });
});
