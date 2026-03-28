import type { NotionClient, NotionPage } from "../shared/notion/client.ts";
import type { Alert, CompanyCard, DashboardState, KpiCard, SprintCard } from "./types.ts";
import { AlertSeverity, AlertSource } from "./types.ts";

/**
 * Mission Control Dashboard — aggregates findings from Hermes and Paperclip.
 * Reads all agent output from Notion and produces a unified HQ control view.
 */

export interface DashboardFindings {
  companyProfiles: NotionPage[];
  processMaps: NotionPage[];
  gapAnalyses: NotionPage[];
  sprintPlans: NotionPage[];
  alerts: NotionPage[];
}

/**
 * Fetches all relevant pages from Notion to build the dashboard.
 */
export async function aggregateFindings(
  client: NotionClient,
  databaseId: string,
): Promise<DashboardFindings> {
  const allPages = await client.queryDatabase({ databaseId });

  return {
    companyProfiles: allPages.filter((p) => p.pageType === "Research"),
    processMaps: allPages.filter((p) => p.pageType === "Blueprint"),
    gapAnalyses: allPages.filter((p) => p.pageType === "Insight"),
    sprintPlans: allPages.filter((p) => p.pageType === "Solution Canvas"),
    alerts: allPages.filter((p) => p.pageType === "Notes" && p.properties.Severity),
  };
}

/**
 * Builds company cards from Notion findings.
 */
export function buildCompanyCards(findings: DashboardFindings): CompanyCard[] {
  return findings.companyProfiles.map((profile) => {
    const props = profile.properties;
    const companyId = (props.OrgNumber as string) ?? profile.id;
    const gaps = findings.gapAnalyses.filter((g) => g.properties.CompanyId === companyId);
    const sprints = findings.sprintPlans.filter((s) => s.properties.CompanyId === companyId);

    const gapsIdentified = gaps.length;
    const gapsClosed = gaps.filter((g) => g.status === "Completed").length;

    return {
      companyId,
      companyName: profile.title,
      status: profile.status ?? "Unknown",
      processesTotal: (props.ProcessCount as number) ?? 0,
      processesMapped: (props.ProcessesMapped as number) ?? 0,
      gapsIdentified,
      gapsClosed,
      activeSprintPhase: sprints[0]?.properties.Phase as string | undefined,
      kpis: [],
      risks: (props.Risks as string[]) ?? [],
    };
  });
}

/**
 * Computes portfolio-level KPIs from all company data.
 */
export function computePortfolioKpis(companies: CompanyCard[]): KpiCard[] {
  const totalProcesses = companies.reduce((s, c) => s + c.processesTotal, 0);
  const totalMapped = companies.reduce((s, c) => s + c.processesMapped, 0);
  const totalGaps = companies.reduce((s, c) => s + c.gapsIdentified, 0);
  const totalClosed = companies.reduce((s, c) => s + c.gapsClosed, 0);

  const mappingRate = totalProcesses > 0 ? (totalMapped / totalProcesses) * 100 : 0;
  const closureRate = totalGaps > 0 ? (totalClosed / totalGaps) * 100 : 0;

  return [
    {
      metric: "Portfolio Companies",
      value: companies.length,
      unit: "count",
      trend: "STABLE",
      status: "OK",
    },
    {
      metric: "Process Mapping Rate",
      value: Math.round(mappingRate),
      unit: "percent",
      trend: mappingRate >= 80 ? "UP" : "STABLE",
      threshold: 80,
      status: mappingRate >= 80 ? "OK" : mappingRate >= 50 ? "WARNING" : "CRITICAL",
    },
    {
      metric: "Gap Closure Rate",
      value: Math.round(closureRate),
      unit: "percent",
      trend: closureRate >= 60 ? "UP" : "STABLE",
      threshold: 60,
      status: closureRate >= 60 ? "OK" : closureRate >= 30 ? "WARNING" : "CRITICAL",
    },
    {
      metric: "Total Gaps Open",
      value: totalGaps - totalClosed,
      unit: "count",
      trend: totalGaps - totalClosed <= 5 ? "DOWN" : "STABLE",
      status: totalGaps - totalClosed <= 5 ? "OK" : "WARNING",
    },
  ];
}

/**
 * Detects alerts from current findings — stale data, missing processes, threshold breaches.
 */
export function detectAlerts(companies: CompanyCard[]): Alert[] {
  const alerts: Alert[] = [];
  let alertCounter = 0;

  for (const company of companies) {
    // No processes mapped yet
    if (company.processesMapped === 0 && company.processesTotal > 0) {
      alerts.push({
        id: `alert-${++alertCounter}`,
        severity: AlertSeverity.WARNING,
        source: AlertSource.MISSION_CONTROL,
        message: `${company.companyName}: No processes mapped yet (${company.processesTotal} expected)`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        companyId: company.companyId,
      });
    }

    // High number of open gaps
    const openGaps = company.gapsIdentified - company.gapsClosed;
    if (openGaps > 5) {
      alerts.push({
        id: `alert-${++alertCounter}`,
        severity: AlertSeverity.WARNING,
        source: AlertSource.PAPERCLIP,
        message: `${company.companyName}: ${openGaps} open gaps remaining`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        companyId: company.companyId,
      });
    }

    // Risks present
    for (const risk of company.risks) {
      if (risk.includes("CRITICAL") || risk.includes("retirement") || risk.includes("key person")) {
        alerts.push({
          id: `alert-${++alertCounter}`,
          severity: AlertSeverity.CRITICAL,
          source: AlertSource.HERMES,
          message: `${company.companyName}: ${risk}`,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          companyId: company.companyId,
        });
      }
    }
  }

  return alerts;
}

/**
 * Builds the complete dashboard state from Notion findings.
 */
export async function buildDashboard(
  client: NotionClient,
  databaseId: string,
): Promise<DashboardState> {
  const findings = await aggregateFindings(client, databaseId);
  const companies = buildCompanyCards(findings);
  const portfolioKpis = computePortfolioKpis(companies);
  const alerts = detectAlerts(companies);

  const sprints: SprintCard[] = findings.sprintPlans.map((sp) => ({
    companyId: sp.properties.CompanyId as string,
    sprintNumber: (sp.properties.SprintNumber as number) ?? 1,
    phase: (sp.properties.Phase as string) ?? "WORKSHOP",
    status: sp.status ?? "PLANNED",
    automationsPlanned: (sp.properties.AutomationsPlanned as number) ?? 0,
    automationsCompleted: (sp.properties.AutomationsCompleted as number) ?? 0,
    blockers: (sp.properties.Blockers as string[]) ?? [],
  }));

  return {
    companies,
    alerts,
    sprints,
    portfolioKpis,
    lastUpdated: new Date().toISOString(),
  };
}
