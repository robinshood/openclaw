import type { NotionClient } from "../shared/notion/client.ts";
import { NotionPageType } from "../shared/notion/client.ts";
import type { Alert, DashboardState } from "./types.ts";

/**
 * Generates and writes reports to Notion based on dashboard state.
 */

/**
 * Generates a weekly status report and writes it to Notion.
 */
export async function generateWeeklyReport(
  client: NotionClient,
  databaseId: string,
  state: DashboardState,
): Promise<string> {
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const title = `Weekly Report — Week ${weekNumber}, ${now.getFullYear()}`;

  const summary = buildWeeklyReportSummary(state);

  const page = await client.createPage({
    databaseId,
    title,
    pageType: NotionPageType.SERVICE_REPORT,
    properties: {
      Period: `Week ${weekNumber}`,
      Summary: summary,
      CompanyCount: state.companies.length,
      OpenAlerts: state.alerts.filter((a) => !a.acknowledged).length,
      CriticalAlerts: state.alerts.filter((a) => a.severity === "CRITICAL").length,
      PortfolioKpis: state.portfolioKpis,
      GeneratedAt: now.toISOString(),
    },
  });

  return page.id;
}

/**
 * Generates an incident report for a CRITICAL alert and writes to Notion.
 */
export async function generateIncidentReport(
  client: NotionClient,
  databaseId: string,
  alert: Alert,
): Promise<string> {
  const title = `Incident: ${alert.message}`;

  const page = await client.createPage({
    databaseId,
    title,
    pageType: NotionPageType.ALERT_LOG,
    properties: {
      Severity: alert.severity,
      Source: alert.source,
      Message: alert.message,
      Timestamp: alert.timestamp,
      Acknowledged: false,
      CompanyId: alert.companyId,
    },
  });

  return page.id;
}

function buildWeeklyReportSummary(state: DashboardState): string {
  const lines: string[] = [];

  lines.push(`## Portfolio Overview (${state.companies.length} companies)`);
  lines.push("");

  for (const company of state.companies) {
    const gapProgress =
      company.gapsIdentified > 0
        ? `${company.gapsClosed}/${company.gapsIdentified} gaps closed`
        : "No gaps identified yet";
    lines.push(`### ${company.companyName}`);
    lines.push(`- Status: ${company.status}`);
    lines.push(`- Processes: ${company.processesMapped}/${company.processesTotal} mapped`);
    lines.push(`- Gaps: ${gapProgress}`);
    if (company.activeSprintPhase) {
      lines.push(`- Active Sprint: ${company.activeSprintPhase}`);
    }
    lines.push("");
  }

  const openAlerts = state.alerts.filter((a) => !a.acknowledged);
  if (openAlerts.length > 0) {
    lines.push(`## Open Alerts (${openAlerts.length})`);
    lines.push("");
    for (const alert of openAlerts) {
      lines.push(`- [${alert.severity}] ${alert.message}`);
    }
  }

  lines.push("");
  lines.push("## Portfolio KPIs");
  lines.push("");
  for (const kpi of state.portfolioKpis) {
    lines.push(
      `- ${kpi.metric}: ${kpi.value}${kpi.unit === "percent" ? "%" : ` ${kpi.unit}`} (${kpi.status})`,
    );
  }

  return lines.join("\n");
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
