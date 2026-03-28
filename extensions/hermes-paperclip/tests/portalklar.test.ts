/**
 * Portalklar — Report generation tests.
 */
import { describe, expect, it } from "vitest";
import { calculateKpis } from "../src/agents/portalklar/kpi-engine.ts";
import {
  generateMonthlyReport,
  formatReportText,
} from "../src/agents/portalklar/report-generator.ts";

describe("Portalklar KPI Engine", () => {
  const current = {
    operatingRevenue: 1250000,
    operatingExpenses: 980000,
    costOfGoods: 320000,
    personnelCosts: 450000,
    depreciation: 45000,
    otherOperatingCosts: 165000,
  };

  const priorYear = {
    operatingRevenue: 1100000,
    operatingExpenses: 900000,
    costOfGoods: 280000,
    personnelCosts: 420000,
  };

  const balance = {
    cashAndBank: 520000,
    currentAssets: 890000,
    currentLiabilities: 450000,
    overdueReceivables: 75000,
    totalAssets: 2100000,
    totalEquity: 800000,
    totalLiabilities: 1300000,
  };

  it("calculates revenue delta", () => {
    const kpis = calculateKpis(current, priorYear, balance);
    expect(kpis.revenueDeltaPct).toBeGreaterThan(0);
    expect(kpis.revenue).toBe(1250000);
    expect(kpis.revenuePriorYear).toBe(1100000);
  });

  it("calculates EBITDA", () => {
    const kpis = calculateKpis(current, priorYear, balance);
    // EBITDA = revenue - opex + depreciation
    expect(kpis.ebitda).toBe(1250000 - 980000 + 45000);
  });

  it("calculates current ratio", () => {
    const kpis = calculateKpis(current, priorYear, balance);
    expect(kpis.currentRatio).toBeCloseTo(890000 / 450000, 1);
  });

  it("detects deviations >10%", () => {
    const kpis = calculateKpis(current, priorYear, balance);
    expect(kpis.deviations.length).toBeGreaterThan(0);
  });

  it("calculates SMB industry KPIs by default", () => {
    const kpis = calculateKpis(current, priorYear, balance);
    expect(kpis.industryKpis.grossMargin).toBeDefined();
    expect(kpis.industryKpis.operatingMargin).toBeDefined();
  });

  it("calculates hotel industry KPIs", () => {
    const kpis = calculateKpis(current, priorYear, balance, "hotel");
    expect(kpis.industryKpis.costRatio).toBeDefined();
  });

  it("calculates eiendom industry KPIs", () => {
    const kpis = calculateKpis(current, priorYear, balance, "eiendom");
    expect(kpis.industryKpis.debtToEquity).toBeDefined();
  });

  it("assesses high confidence for complete data", () => {
    const kpis = calculateKpis(current, priorYear, balance);
    expect(kpis.confidence).toBe("H");
  });

  it("assesses lower confidence for sparse data", () => {
    const kpis = calculateKpis({}, {}, {});
    expect(kpis.confidence).toBe("L");
  });
});

describe("Portalklar Report Generator", () => {
  it("generates a monthly report", () => {
    const kpis = calculateKpis(
      { operatingRevenue: 1000000, operatingExpenses: 750000, depreciation: 30000 },
      { operatingRevenue: 900000 },
      { cashAndBank: 400000, overdueReceivables: 50000 },
    );

    const report = generateMonthlyReport({
      clientOrgNr: "123456789",
      clientName: "Test AS",
      periodYear: 2026,
      periodMonth: 3,
      kpis,
      costs: { Lønnskostnad: 450000, Varekostnad: 300000 },
    });

    expect(report.clientOrgNr).toBe("123456789");
    expect(report.revenue).toBe(1000000);
    expect(report.periodMonth).toBe(3);
  });

  it("formats report as Norwegian text", () => {
    const kpis = calculateKpis(
      { operatingRevenue: 500000, operatingExpenses: 350000, depreciation: 20000 },
      { operatingRevenue: 480000 },
      { cashAndBank: 200000, overdueReceivables: 10000 },
    );

    const report = generateMonthlyReport({
      clientOrgNr: "987654321",
      clientName: "Eiendom AS",
      periodYear: 2026,
      periodMonth: 1,
      kpis,
      costs: {},
    });

    const text = formatReportText(report);
    expect(text).toContain("Månedsrapport");
    expect(text).toContain("Eiendom AS");
    expect(text).toContain("Januar");
    expect(text).toContain("Confidence Score");
  });
});
