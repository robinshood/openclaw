/**
 * Portalklar — KPI calculation engine.
 *
 * Computes industry-relevant KPIs from Tripletex financial data.
 * Each KPI tagged with confidence score based on data completeness.
 */

import type { Confidence, MonthlyReport, ReportDeviation } from "../../shared/types.ts";

export interface KpiSet {
  revenue: number;
  revenuePriorYear: number;
  revenueDeltaPct: number;
  ebitda: number;
  ebitdaMarginPct: number;
  cashPosition: number;
  overdueReceivables: number;
  currentRatio: number;
  deviations: ReportDeviation[];
  industryKpis: Record<string, number>;
  confidence: Confidence;
}

interface ResultReportData {
  operatingRevenue?: number;
  operatingExpenses?: number;
  financialIncome?: number;
  financialExpenses?: number;
  costOfGoods?: number;
  personnelCosts?: number;
  depreciation?: number;
  otherOperatingCosts?: number;
}

interface BalanceSheetData {
  cashAndBank?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  accountsReceivable?: number;
  overdueReceivables?: number;
  totalAssets?: number;
  totalEquity?: number;
  totalLiabilities?: number;
}

/**
 * Calculate KPIs from Tripletex result report and balance sheet data.
 */
export function calculateKpis(
  current: ResultReportData,
  priorYear: ResultReportData,
  balance: BalanceSheetData,
  industryTemplate?: string,
): KpiSet {
  const revenue = current.operatingRevenue ?? 0;
  const revenuePriorYear = priorYear.operatingRevenue ?? 0;
  const revenueDeltaPct =
    revenuePriorYear !== 0
      ? Math.round(((revenue - revenuePriorYear) / Math.abs(revenuePriorYear)) * 1000) / 10
      : 0;

  const operatingExpenses = current.operatingExpenses ?? 0;
  const ebitda = revenue - operatingExpenses + (current.depreciation ?? 0);
  const ebitdaMarginPct = revenue !== 0 ? Math.round((ebitda / revenue) * 1000) / 10 : 0;

  const cashPosition = balance.cashAndBank ?? 0;
  const overdueReceivables = balance.overdueReceivables ?? 0;
  const currentRatio =
    (balance.currentLiabilities ?? 0) !== 0
      ? Math.round(((balance.currentAssets ?? 0) / balance.currentLiabilities!) * 100) / 100
      : 0;

  // Detect deviations (>10% change from prior year or industry norms)
  const deviations = detectDeviations(current, priorYear);

  // Industry-specific KPIs
  const industryKpis = calculateIndustryKpis(current, balance, industryTemplate);

  // Confidence based on data completeness
  const confidence = assessConfidence(current, balance);

  return {
    revenue,
    revenuePriorYear,
    revenueDeltaPct,
    ebitda,
    ebitdaMarginPct,
    cashPosition,
    overdueReceivables,
    currentRatio,
    deviations,
    industryKpis,
    confidence,
  };
}

/**
 * Detect deviations between current and prior year figures.
 * Flags accounts with >10% change.
 */
function detectDeviations(
  current: ResultReportData,
  priorYear: ResultReportData,
): ReportDeviation[] {
  const deviations: ReportDeviation[] = [];

  const checks: Array<{
    account: string;
    description: string;
    currentVal: number;
    priorVal: number;
  }> = [
    {
      account: "3000",
      description: "Salgsinntekter",
      currentVal: current.operatingRevenue ?? 0,
      priorVal: priorYear.operatingRevenue ?? 0,
    },
    {
      account: "4000",
      description: "Varekostnad",
      currentVal: current.costOfGoods ?? 0,
      priorVal: priorYear.costOfGoods ?? 0,
    },
    {
      account: "5000",
      description: "Lønnskostnad",
      currentVal: current.personnelCosts ?? 0,
      priorVal: priorYear.personnelCosts ?? 0,
    },
    {
      account: "6000-7000",
      description: "Andre driftskostnader",
      currentVal: current.otherOperatingCosts ?? 0,
      priorVal: priorYear.otherOperatingCosts ?? 0,
    },
  ];

  for (const check of checks) {
    if (check.priorVal === 0) continue;
    const deltaPct =
      Math.round(((check.currentVal - check.priorVal) / Math.abs(check.priorVal)) * 1000) / 10;
    if (Math.abs(deltaPct) > 10) {
      deviations.push({
        account: check.account,
        description: check.description,
        actual: check.currentVal,
        comparator: check.priorVal,
        deltaPct,
        severity: Math.abs(deltaPct) > 25 ? "high" : Math.abs(deltaPct) > 15 ? "medium" : "low",
      });
    }
  }

  return deviations;
}

/**
 * Calculate industry-specific KPIs based on template.
 */
function calculateIndustryKpis(
  current: ResultReportData,
  balance: BalanceSheetData,
  template?: string,
): Record<string, number> {
  const kpis: Record<string, number> = {};
  const revenue = current.operatingRevenue ?? 0;

  switch (template) {
    case "hotel":
      // RevPAR approximation, occupancy proxy
      kpis.revenuePerEmployee = revenue; // Needs employee count for real calc
      kpis.costRatio =
        revenue !== 0 ? Math.round(((current.operatingExpenses ?? 0) / revenue) * 100) / 100 : 0;
      break;

    case "eiendom":
      // Real estate: yield, vacancy rate proxy
      kpis.operatingMargin =
        revenue !== 0
          ? Math.round(((revenue - (current.operatingExpenses ?? 0)) / revenue) * 1000) / 10
          : 0;
      kpis.debtToEquity =
        (balance.totalEquity ?? 0) !== 0
          ? Math.round(((balance.totalLiabilities ?? 0) / balance.totalEquity!) * 100) / 100
          : 0;
      break;

    default:
      // SMB standard
      kpis.grossMargin =
        revenue !== 0
          ? Math.round(((revenue - (current.costOfGoods ?? 0)) / revenue) * 1000) / 10
          : 0;
      kpis.operatingMargin =
        revenue !== 0
          ? Math.round(((revenue - (current.operatingExpenses ?? 0)) / revenue) * 1000) / 10
          : 0;
      break;
  }

  return kpis;
}

/**
 * Assess confidence based on data completeness.
 */
function assessConfidence(current: ResultReportData, balance: BalanceSheetData): Confidence {
  let filledFields = 0;
  let totalFields = 0;

  for (const val of Object.values(current)) {
    totalFields++;
    if (val !== undefined && val !== null) filledFields++;
  }
  for (const val of Object.values(balance)) {
    totalFields++;
    if (val !== undefined && val !== null) filledFields++;
  }

  const completeness = totalFields > 0 ? filledFields / totalFields : 0;

  if (completeness >= 0.8) return "H";
  if (completeness >= 0.5) return "M";
  return "L";
}
