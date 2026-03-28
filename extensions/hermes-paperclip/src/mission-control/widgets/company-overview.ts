import type { CompanyCard } from "../types.ts";

/**
 * Company overview widget — portfolio company summary with risk flags.
 */
export function renderCompanyOverview(company: CompanyCard): string {
  const lines: string[] = [
    `## ${company.companyName}`,
    `**Status:** ${company.status}`,
    `**Company ID:** ${company.companyId}`,
    "",
    "### Progress",
    `- Processes mapped: ${company.processesMapped} / ${company.processesTotal}`,
    `- Gaps identified: ${company.gapsIdentified}`,
    `- Gaps closed: ${company.gapsClosed}`,
  ];

  if (company.activeSprintPhase) {
    lines.push(`- Active sprint phase: ${company.activeSprintPhase}`);
  }

  if (company.risks.length > 0) {
    lines.push("", "### Risk Flags");
    for (const risk of company.risks) {
      lines.push(`- ${risk}`);
    }
  }

  if (company.kpis.length > 0) {
    lines.push("", "### KPIs");
    for (const kpi of company.kpis) {
      const unit = kpi.unit === "percent" ? "%" : ` ${kpi.unit}`;
      lines.push(`- ${kpi.metric}: ${kpi.value}${unit} (${kpi.trend}, ${kpi.status})`);
    }
  }

  return lines.join("\n");
}
