import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDashboard } from "../../src/mission-control/dashboard.ts";
import { CompanySchema, type Company } from "../../src/shared/models/company.ts";
import { CoverageLevel, type GapReport } from "../../src/shared/models/gap.ts";
import {
  type Process,
  ProcessSchema,
  calculatePriorityScore,
} from "../../src/shared/models/process.ts";
import { SprintPhase, SprintStatus, type SprintPlan } from "../../src/shared/models/sprint.ts";
import { createMockTransport, NotionClient } from "../../src/shared/notion/client.ts";
import {
  evalCompanyProfile,
  evalProcessMap,
  evalGapAnalysis,
  evalSprintPlan,
  evalDashboard,
} from "../eval/criteria.ts";
import type { Scenario } from "../simulator.ts";

const MOCK_DATA_DIR = resolve(import.meta.dirname, "../mock-data/systemregnskap");

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(MOCK_DATA_DIR, filename), "utf-8")) as T;
}

/**
 * Systemregnskap acquisition scenario.
 *
 * Simulates the full pipeline:
 * 1. Hermes profiles company
 * 2. Hermes maps infrastructure
 * 3. Hermes analyzes processes (scores and ranks)
 * 4. Paperclip runs gap analysis
 * 5. Paperclip plans sprints
 * 6. Mission Control generates dashboard
 */
export function createSystemregnskapScenario(): Scenario {
  const mockTransport = createMockTransport();
  const notionClient = new NotionClient(mockTransport);
  const databaseId = "mock-db-systemregnskap";

  // Shared state across steps
  let company: Company;
  let processes: Process[];
  let gapReport: GapReport;
  let sprintPlan: SprintPlan;

  return {
    name: "Systemregnskap AS Acquisition",
    description:
      "Full acquisition simulation: intelligence → gap analysis → sprint planning → dashboard",
    steps: [
      {
        name: "Step 1: Company Profiling (Hermes)",
        description: "Profile Systemregnskap using mock Brønnøysundregistrene data",
        async execute() {
          const rawProfile = loadJson<Record<string, unknown>>("company-profile.json");
          company = CompanySchema.parse(rawProfile);

          // Write to mock Notion
          await notionClient.createPage({
            databaseId,
            title: `Company Profile: ${company.name}`,
            pageType: "Research",
            properties: {
              OrgNumber: company.orgNumber,
              Name: company.name,
              Revenue: company.revenue,
              EmployeeCount: company.employeeCount,
              CustomerCount: company.customerCount,
              Risks: company.risks?.map((r) => `${r.severity}: ${r.description}`) ?? [],
              ProcessCount: 12,
              ProcessesMapped: 0,
            },
          });

          return evalCompanyProfile(company);
        },
      },
      {
        name: "Step 2: Infrastructure Mapping (Hermes)",
        description: "Map software stack and integrations",
        async execute() {
          const stack = loadJson<Record<string, unknown>>("software-stack.json");

          await notionClient.createPage({
            databaseId,
            title: `Infrastructure Map: ${company.name}`,
            pageType: "Blueprint",
            properties: {
              CompanyId: company.orgNumber,
              Systems: stack.systems,
              Integrations: stack.integrations,
              Gaps: stack.architectureGaps,
            },
          });

          const systems = stack.systems as Array<Record<string, unknown>>;
          const gaps = stack.architectureGaps as string[];

          return {
            passed: systems.length >= 5 && gaps.length >= 3,
            checkpoint: "Infrastructure Map",
            details: `${systems.length} systems mapped. ${gaps.length} architecture gaps identified.`,
          };
        },
      },
      {
        name: "Step 3: Process Analysis (Hermes)",
        description: "Score and rank all business processes",
        async execute() {
          const rawProcesses = loadJson<{ processes: Record<string, unknown>[] }>("processes.json");
          processes = rawProcesses.processes.map((p) => {
            const parsed = ProcessSchema.parse(p);
            return { ...parsed, priorityScore: calculatePriorityScore(parsed) };
          });

          // Sort by priority score descending
          processes.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));

          await notionClient.createPage({
            databaseId,
            title: `Process Map: ${company.name}`,
            pageType: "Blueprint",
            properties: {
              CompanyId: company.orgNumber,
              Processes: processes.map((p) => ({
                name: p.name,
                score: p.priorityScore,
                feasibility: p.automationFeasibility,
              })),
              TopCandidates: processes.slice(0, 3).map((p) => p.name),
              TotalHoursPerMonth: processes.reduce((s, p) => s + p.hoursPerMonth, 0),
              Status: "Ready for Gap Analysis",
            },
          });

          return evalProcessMap(processes);
        },
      },
      {
        name: "Step 4: Gap Analysis (Paperclip)",
        description: "Analyze gaps between processes and OOTB tool coverage",
        async execute() {
          const coverage = loadJson<{
            coverageMatrix: Array<Record<string, unknown>>;
            summary: Record<string, unknown>;
          }>("../platform-coverage.json");

          const gaps = coverage.coverageMatrix
            .filter((c) => c.overallCoverage !== "full")
            .map((c) => ({
              id: `gap-${c.processId}`,
              processId: c.processId as string,
              processName: c.processName as string,
              ootbCoverage: (c.platforms as Array<Record<string, unknown>>).map((p) => ({
                tool: p.tool as string,
                coverageLevel:
                  (p.coverageLevel as string) === "full"
                    ? CoverageLevel.FULL
                    : (p.coverageLevel as string) === "partial"
                      ? CoverageLevel.PARTIAL
                      : CoverageLevel.NONE,
                coverageDetails: p.notes as string | undefined,
              })),
              overallCoverageLevel:
                (c.overallCoverage as string) === "partial"
                  ? CoverageLevel.PARTIAL
                  : CoverageLevel.NONE,
              gapDescription: (c.gap as string) ?? "No OOTB coverage",
              automationCandidate: true,
            }));

          gapReport = {
            companyId: company.orgNumber,
            companyName: company.name,
            totalProcesses: coverage.coverageMatrix.length,
            fullyCovered: coverage.coverageMatrix.filter((c) => c.overallCoverage === "full")
              .length,
            partiallyCovered: coverage.coverageMatrix.filter((c) => c.overallCoverage === "partial")
              .length,
            uncovered: coverage.coverageMatrix.filter((c) => c.overallCoverage === "none").length,
            gaps,
            generatedAt: new Date().toISOString(),
          };

          await notionClient.createPage({
            databaseId,
            title: `Gap Analysis: ${company.name}`,
            pageType: "Insight",
            properties: {
              CompanyId: company.orgNumber,
              TotalProcesses: gapReport.totalProcesses,
              FullyCovered: gapReport.fullyCovered,
              PartiallyCovered: gapReport.partiallyCovered,
              Uncovered: gapReport.uncovered,
              Gaps: gaps.map((g) => g.processName),
              Status: "Ready for Sprint Planning",
            },
          });

          return evalGapAnalysis(gapReport);
        },
      },
      {
        name: "Step 5: Sprint Planning (Paperclip)",
        description: "Create Agile AI Framework sprint plan from gap report",
        async execute() {
          sprintPlan = {
            companyId: company.orgNumber,
            companyName: company.name,
            sprints: [
              {
                id: "sprint-1",
                number: 1,
                phase: SprintPhase.WORKSHOP,
                durationWeeks: 2,
                goals: [
                  "Map all processes in detail with process owners",
                  "Define KPIs and success criteria",
                  "Prioritize automation candidates",
                ],
                automations: [],
                goNoGoCriteria: [],
                status: SprintStatus.PLANNED,
              },
              {
                id: "sprint-2",
                number: 2,
                phase: SprintPhase.POC,
                durationWeeks: 2,
                goals: [
                  "Build PoC for top automation candidate",
                  "Validate with real data in sandbox",
                  "Measure time savings vs manual process",
                ],
                automations: [
                  {
                    gapId: gapReport.gaps[0]?.id ?? "gap-unknown",
                    description: "Automated MVA report generation and submission",
                    approach: "TripleTex API → generate MVA-melding → Altinn submission",
                  },
                ],
                goNoGoCriteria: [
                  {
                    criterion: "Measurable time reduction",
                    threshold: ">= 20% reduction in process time",
                  },
                  { criterion: "Data accuracy", threshold: ">= 95% accuracy vs manual process" },
                  { criterion: "Stakeholder approval", threshold: "Process owner signs off" },
                ],
                status: SprintStatus.PLANNED,
              },
              {
                id: "sprint-3",
                number: 3,
                phase: SprintPhase.MVP,
                durationWeeks: 2,
                goals: [
                  "Deploy working automation to sandbox environment",
                  "Establish data pipeline for continuous processing",
                  "Train users on new workflow",
                ],
                automations: [],
                goNoGoCriteria: [],
                status: SprintStatus.PLANNED,
              },
              {
                id: "sprint-4",
                number: 4,
                phase: SprintPhase.SCALE,
                durationWeeks: 2,
                goals: [
                  "Production deployment after human approval",
                  "Set up governance and monitoring",
                  "Measure ROI vs baseline",
                  "Identify next automation use case",
                ],
                automations: [],
                goNoGoCriteria: [],
                status: SprintStatus.PLANNED,
              },
            ],
            maxIterationsPerAutomation: 3,
            createdAt: new Date().toISOString(),
          };

          await notionClient.createPage({
            databaseId,
            title: `Sprint Plan: ${company.name}`,
            pageType: "Solution Canvas",
            properties: {
              CompanyId: company.orgNumber,
              Sprints: sprintPlan.sprints.map((s) => ({
                number: s.number,
                phase: s.phase,
                status: s.status,
              })),
              MaxIterations: sprintPlan.maxIterationsPerAutomation,
              Phase: "WORKSHOP",
              SprintNumber: 1,
              AutomationsPlanned: 1,
              AutomationsCompleted: 0,
              Blockers: [],
              Status: "In Progress",
            },
          });

          return evalSprintPlan(sprintPlan);
        },
      },
      {
        name: "Step 6: Mission Control Dashboard",
        description: "Generate initial HQ dashboard from all findings",
        async execute() {
          // Update company profile with mapped process count
          const pages = Array.from(mockTransport.pages.values());
          const profilePage = pages.find((p) => p.title.startsWith("Company Profile:"));
          if (profilePage) {
            await notionClient.updatePage({
              pageId: profilePage.id,
              properties: { ProcessesMapped: 12 },
            });
          }

          const dashboardState = await buildDashboard(notionClient, databaseId);
          return evalDashboard(dashboardState);
        },
      },
    ],
  };
}
