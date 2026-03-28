/**
 * Portalklar — Report generation engine.
 *
 * Generates monthly client reports from Tripletex financial data.
 * Applies industry templates for relevant KPI presentation.
 */

import type { Confidence, MonthlyReport, ReportDeviation } from "../../shared/types.ts";
import type { KpiSet } from "./kpi-engine.ts";

export interface ReportInput {
  clientOrgNr: string;
  clientName: string;
  periodYear: number;
  periodMonth: number;
  kpis: KpiSet;
  costs: Record<string, number>;
}

/**
 * Generate a MonthlyReport from KPI data.
 */
export function generateMonthlyReport(input: ReportInput): MonthlyReport {
  return {
    clientOrgNr: input.clientOrgNr,
    clientName: input.clientName,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    revenue: input.kpis.revenue,
    revenuePriorYear: input.kpis.revenuePriorYear,
    revenueDeltaPct: input.kpis.revenueDeltaPct,
    costs: input.costs,
    ebitda: input.kpis.ebitda,
    cashPosition: input.kpis.cashPosition,
    overdueReceivables: input.kpis.overdueReceivables,
    deviations: input.kpis.deviations,
    industryKpis: input.kpis.industryKpis,
    confidence: input.kpis.confidence,
  };
}

/**
 * Format a report as a readable text summary for client portal.
 */
export function formatReportText(report: MonthlyReport): string {
  const monthNames = [
    "Januar",
    "Februar",
    "Mars",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthName = monthNames[report.periodMonth - 1] ?? `Måned ${report.periodMonth}`;

  const lines: string[] = [
    `Månedsrapport — ${report.clientName}`,
    `Periode: ${monthName} ${report.periodYear}`,
    ``,
    `--- Nøkkeltall ---`,
    `Omsetning:           ${formatNok(report.revenue)}`,
    `Omsetning i fjor:    ${formatNok(report.revenuePriorYear)}`,
    `Endring:             ${report.revenueDeltaPct > 0 ? "+" : ""}${report.revenueDeltaPct}%`,
    `EBITDA:              ${formatNok(report.ebitda)}`,
    `Kontantbeholdning:   ${formatNok(report.cashPosition)}`,
    `Forfalte fordringer: ${formatNok(report.overdueReceivables)}`,
    ``,
  ];

  // Cost breakdown
  if (Object.keys(report.costs).length > 0) {
    lines.push(`--- Kostnader ---`);
    for (const [category, amount] of Object.entries(report.costs)) {
      lines.push(`${category}: ${formatNok(amount)}`);
    }
    lines.push(``);
  }

  // Deviations
  if (report.deviations.length > 0) {
    lines.push(`--- Avvik ---`);
    for (const dev of report.deviations) {
      const arrow = dev.deltaPct > 0 ? "↑" : "↓";
      const severity = dev.severity === "high" ? "⚠" : dev.severity === "medium" ? "!" : "";
      lines.push(
        `${severity} ${dev.description} (${dev.account}): ${arrow} ${Math.abs(dev.deltaPct)}%`,
      );
    }
    lines.push(``);
  }

  // Industry KPIs
  if (Object.keys(report.industryKpis).length > 0) {
    lines.push(`--- Bransje-KPIer ---`);
    for (const [name, value] of Object.entries(report.industryKpis)) {
      lines.push(`${formatKpiName(name)}: ${value}`);
    }
    lines.push(``);
  }

  lines.push(`Confidence Score: ${report.confidence} | Reasoning: Data completeness assessment`);

  return lines.join("\n");
}

function formatNok(amount: number): string {
  return `kr ${amount.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatKpiName(key: string): string {
  const map: Record<string, string> = {
    grossMargin: "Bruttomargin",
    operatingMargin: "Driftsmargin",
    debtToEquity: "Gjeldsgrad",
    revenuePerEmployee: "Omsetning per ansatt",
    costRatio: "Kostnadsandel",
    currentRatio: "Likviditetsgrad",
  };
  return map[key] ?? key;
}
