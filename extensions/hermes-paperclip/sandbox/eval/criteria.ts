import type { DashboardState } from "../../src/mission-control/types.ts";
import type { Company } from "../../src/shared/models/company.ts";
import type { GapReport } from "../../src/shared/models/gap.ts";
import type { Process } from "../../src/shared/models/process.ts";
import type { SprintPlan } from "../../src/shared/models/sprint.ts";

/**
 * Sandbox evaluation criteria.
 * Each function returns { passed, details } for a specific eval checkpoint.
 */

export interface EvalResult {
  passed: boolean;
  checkpoint: string;
  details: string;
}

/**
 * Validates a company profile has all required fields and identified risks.
 */
export function evalCompanyProfile(company: Company): EvalResult {
  const requiredFields = ["orgNumber", "name", "sector", "revenue", "employeeCount", "dataSource"];
  const missing = requiredFields.filter(
    (f) => !(f in company) || company[f as keyof Company] === undefined,
  );

  const hasRisks = (company.risks?.length ?? 0) > 0;
  const hasBoard = (company.board?.length ?? 0) > 0;

  const passed = missing.length === 0 && hasRisks && hasBoard;
  return {
    passed,
    checkpoint: "Company Profile",
    details: passed
      ? `All fields present. ${company.risks?.length} risks identified.`
      : `Missing fields: ${missing.join(", ")}. Risks: ${hasRisks}. Board: ${hasBoard}.`,
  };
}

/**
 * Validates process map scores and ranks processes correctly.
 */
export function evalProcessMap(processes: Process[]): EvalResult {
  const allScored = processes.every((p) => p.priorityScore !== undefined && p.priorityScore > 0);
  const hasSufficientProcesses = processes.length >= 7;

  // Check top 3 are reasonable candidates (high feasibility + high hours)
  const sorted = [...processes]
    .filter((p) => p.priorityScore !== undefined)
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));

  const top3 = sorted.slice(0, 3);
  const top3HaveHighFeasibility = top3.every(
    (p) => p.automationFeasibility === "HIGH" || p.hoursPerMonth >= 40,
  );

  const passed = allScored && hasSufficientProcesses && top3HaveHighFeasibility;
  return {
    passed,
    checkpoint: "Process Map",
    details: passed
      ? `${processes.length} processes scored. Top 3: ${top3.map((p) => p.name).join(", ")}`
      : `Scored: ${allScored}. Count: ${processes.length}. Top3 feasible: ${top3HaveHighFeasibility}`,
  };
}

/**
 * Validates gap analysis correctly maps OOTB coverage.
 */
export function evalGapAnalysis(report: GapReport): EvalResult {
  const hasGaps = report.gaps.length > 0;
  const noGapsForFullyCovered = report.gaps.every((g) => g.overallCoverageLevel !== "full");

  const passed = hasGaps && noGapsForFullyCovered && report.totalProcesses >= 7;
  return {
    passed,
    checkpoint: "Gap Analysis",
    details: passed
      ? `${report.gaps.length} gaps found. ${report.fullyCovered} fully covered. No false gaps.`
      : `Gaps: ${report.gaps.length}. False gaps in covered: ${!noGapsForFullyCovered}. Processes: ${report.totalProcesses}`,
  };
}

/**
 * Validates sprint plan follows Agile AI Framework structure.
 */
export function evalSprintPlan(plan: SprintPlan): EvalResult {
  const phases = plan.sprints.map((s) => s.phase);
  const expectedPhases = ["WORKSHOP", "POC", "MVP", "SCALE"];

  const hasAllPhases = expectedPhases.every((p) => phases.includes(p));
  const hasGoNoGo = plan.sprints.some((s) => s.phase === "POC" && s.goNoGoCriteria.length > 0);

  const passed = hasAllPhases && hasGoNoGo;
  return {
    passed,
    checkpoint: "Sprint Plan",
    details: passed
      ? `All 4 phases present. Go/No-Go criteria defined for POC sprint.`
      : `Phases: ${phases.join(", ")}. Go/No-Go on POC: ${hasGoNoGo}`,
  };
}

/**
 * Validates Mission Control dashboard is populated correctly.
 */
export function evalDashboard(state: DashboardState): EvalResult {
  const hasCompanies = state.companies.length > 0;
  const hasKpis = state.portfolioKpis.length > 0;
  const notStale = isRecent(state.lastUpdated);

  const passed = hasCompanies && hasKpis && notStale;
  return {
    passed,
    checkpoint: "Mission Control Dashboard",
    details: passed
      ? `${state.companies.length} companies, ${state.portfolioKpis.length} KPIs, ${state.alerts.length} alerts.`
      : `Companies: ${hasCompanies}. KPIs: ${hasKpis}. Fresh: ${notStale}.`,
  };
}

function isRecent(dateStr: string, maxAgeMs = 3600000): boolean {
  return Date.now() - new Date(dateStr).getTime() < maxAgeMs;
}
