/**
 * PORTALKLAR — Client Report Automation (Priority: 3.7)
 *
 * Generates monthly client reports from Tripletex financial data.
 * Triggered: 5th business day of each month.
 *
 * Flow:
 *   1. Fetch result report + balance sheet from Tripletex
 *   2. Validate through Renvasken
 *   3. Calculate KPIs (industry-aware)
 *   4. Generate report
 *   5. Cache in Supabase
 *   6. Audit trail
 */

import { cacheReport } from "../../lib/supabase-client.ts";
import { logAction, confidenceFooter } from "../../shared/audit-logger.ts";
import type { Confidence, MonthlyReport } from "../../shared/types.ts";
import { validateRecord } from "../renvasken/index.ts";
import { calculateKpis, type KpiSet } from "./kpi-engine.ts";
import { generateMonthlyReport, formatReportText } from "./report-generator.ts";

const AGENT_ID = "hermes-rapport-01";

export interface PortalklarInput {
  clientOrgNr: string;
  clientName: string;
  periodYear: number;
  periodMonth: number;
  industryTemplate?: string;
  tripletexClient: {
    getResultReport: (
      params: Record<string, string | number | boolean>,
    ) => Promise<{ value: Record<string, unknown> }>;
    getBalanceSheet: (
      params: Record<string, string | number | boolean>,
    ) => Promise<{ value: Record<string, unknown> }>;
  };
}

export interface PortalklarResult {
  report: MonthlyReport;
  formattedText: string;
  cached: boolean;
  confidence: Confidence;
}

/**
 * Generate a monthly report for a single client.
 */
export async function generateClientReport(input: PortalklarInput): Promise<PortalklarResult> {
  await logAction({
    agentId: AGENT_ID,
    action: "report_generation_start",
    targetType: "monthly_report",
    targetId: input.clientOrgNr,
    inputData: {
      period: `${input.periodYear}-${String(input.periodMonth).padStart(2, "0")}`,
      template: input.industryTemplate,
    },
    confidence: "H",
    rationale: `Starting report generation for ${input.clientName} (${input.periodYear}-${input.periodMonth})`,
  });

  // Build date range for Tripletex queries
  const dateFrom = `${input.periodYear}-${String(input.periodMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(input.periodYear, input.periodMonth, 0).getDate();
  const dateTo = `${input.periodYear}-${String(input.periodMonth).padStart(2, "0")}-${lastDay}`;

  // Fetch current period data from Tripletex
  const [currentResult, balanceResult] = await Promise.all([
    input.tripletexClient.getResultReport({ dateFrom, dateTo }),
    input.tripletexClient.getBalanceSheet({ dateFrom, dateTo }),
  ]);

  // Fetch prior year for comparison
  const priorDateFrom = `${input.periodYear - 1}-${String(input.periodMonth).padStart(2, "0")}-01`;
  const priorLastDay = new Date(input.periodYear - 1, input.periodMonth, 0).getDate();
  const priorDateTo = `${input.periodYear - 1}-${String(input.periodMonth).padStart(2, "0")}-${priorLastDay}`;
  const priorResult = await input.tripletexClient.getResultReport({
    dateFrom: priorDateFrom,
    dateTo: priorDateTo,
  });

  // Validate financial data through Renvasken
  const currentValidation = validateRecord(
    `result-${input.clientOrgNr}-${input.periodYear}-${input.periodMonth}`,
    currentResult.value,
    { source: "tripletex", recordType: "voucher" },
  );

  if (currentValidation.status === "dirty") {
    await logAction({
      agentId: AGENT_ID,
      action: "report_generation_blocked",
      targetType: "monthly_report",
      targetId: input.clientOrgNr,
      outputData: { issues: currentValidation.issues },
      confidence: "L",
      rationale: `Report blocked — dirty data from Tripletex: ${currentValidation.issues.length} issues`,
    });
    throw new Error(
      `Report blocked by Renvasken: ${currentValidation.issues.map((i) => i.message).join("; ")}`,
    );
  }

  // Calculate KPIs
  const kpis = calculateKpis(
    currentResult.value as Record<string, number>,
    priorResult.value as Record<string, number>,
    balanceResult.value as Record<string, number>,
    input.industryTemplate,
  );

  // Extract cost breakdown
  const costs: Record<string, number> = {};
  if (currentResult.value.costOfGoods)
    costs["Varekostnad"] = currentResult.value.costOfGoods as number;
  if (currentResult.value.personnelCosts)
    costs["Lønnskostnad"] = currentResult.value.personnelCosts as number;
  if (currentResult.value.depreciation)
    costs["Avskrivning"] = currentResult.value.depreciation as number;
  if (currentResult.value.otherOperatingCosts)
    costs["Andre driftskostnader"] = currentResult.value.otherOperatingCosts as number;

  // Generate report
  const report = generateMonthlyReport({
    clientOrgNr: input.clientOrgNr,
    clientName: input.clientName,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    kpis,
    costs,
  });

  const formattedText = formatReportText(report);

  // Cache report in Supabase
  let cached = false;
  try {
    await cacheReport({
      clientOrgNr: input.clientOrgNr,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      reportType: input.industryTemplate ?? "smb-standard",
      reportData: report,
      confidence: kpis.confidence,
    });
    cached = true;
  } catch {
    // Non-fatal — report still generated
  }

  await logAction({
    agentId: AGENT_ID,
    action: "report_generation_complete",
    targetType: "monthly_report",
    targetId: input.clientOrgNr,
    outputData: {
      revenue: report.revenue,
      ebitda: report.ebitda,
      deviationCount: report.deviations.length,
      cached,
    },
    confidence: kpis.confidence,
    rationale: `Report generated: ${input.clientName} ${input.periodYear}-${input.periodMonth} (${kpis.confidence} confidence)`,
  });

  return { report, formattedText, cached, confidence: kpis.confidence };
}

export { calculateKpis } from "./kpi-engine.ts";
export { generateMonthlyReport, formatReportText } from "./report-generator.ts";
