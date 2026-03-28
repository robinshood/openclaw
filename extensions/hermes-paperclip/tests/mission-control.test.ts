import { describe, expect, it } from "vitest";
import {
  buildCompanyCards,
  buildDashboard,
  computePortfolioKpis,
  detectAlerts,
} from "../src/mission-control/dashboard.ts";
import type { CompanyCard, SprintCard } from "../src/mission-control/types.ts";
import { renderCompanyOverview } from "../src/mission-control/widgets/company-overview.ts";
import { renderGapTracker } from "../src/mission-control/widgets/gap-tracker.ts";
import { renderProcessHealth } from "../src/mission-control/widgets/process-health.ts";
import { renderSprintStatus } from "../src/mission-control/widgets/sprint-status.ts";
import { createMockTransport, NotionClient } from "../src/shared/notion/client.ts";

describe("Mission Control Dashboard", () => {
  it("builds dashboard from Notion pages", async () => {
    const transport = createMockTransport();
    const client = new NotionClient(transport);

    // Create mock pages
    await client.createPage({
      databaseId: "db-1",
      title: "Systemregnskap AS",
      pageType: "Research",
      properties: {
        OrgNumber: "912345678",
        ProcessCount: 12,
        ProcessesMapped: 8,
        Risks: ["CRITICAL: Generational cliff"],
      },
    });

    const state = await buildDashboard(client, "db-1");

    expect(state.companies).toHaveLength(1);
    expect(state.portfolioKpis.length).toBeGreaterThan(0);
    expect(state.lastUpdated).toBeTruthy();
  });

  it("computes portfolio KPIs", () => {
    const companies: CompanyCard[] = [
      {
        companyId: "1",
        companyName: "A",
        status: "Active",
        processesTotal: 12,
        processesMapped: 10,
        gapsIdentified: 8,
        gapsClosed: 5,
        kpis: [],
        risks: [],
      },
      {
        companyId: "2",
        companyName: "B",
        status: "Active",
        processesTotal: 8,
        processesMapped: 8,
        gapsIdentified: 4,
        gapsClosed: 4,
        kpis: [],
        risks: [],
      },
    ];

    const kpis = computePortfolioKpis(companies);

    expect(kpis.find((k) => k.metric === "Portfolio Companies")?.value).toBe(2);
    expect(kpis.find((k) => k.metric === "Process Mapping Rate")?.value).toBe(90); // 18/20
    expect(kpis.find((k) => k.metric === "Gap Closure Rate")?.value).toBe(75); // 9/12
  });

  it("detects alerts for risks and open gaps", () => {
    const companies: CompanyCard[] = [
      {
        companyId: "1",
        companyName: "Risk Co",
        status: "Active",
        processesTotal: 10,
        processesMapped: 0,
        gapsIdentified: 10,
        gapsClosed: 2,
        kpis: [],
        risks: ["retirement risk for key person"],
      },
    ];

    const alerts = detectAlerts(companies);

    // Should detect: unmapped processes, open gaps > 5, retirement risk
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(alerts.some((a) => a.severity === "CRITICAL")).toBe(true);
  });
});

describe("Mission Control Widgets", () => {
  const mockCompany: CompanyCard = {
    companyId: "912345678",
    companyName: "Systemregnskap AS",
    status: "Active",
    processesTotal: 12,
    processesMapped: 8,
    gapsIdentified: 8,
    gapsClosed: 3,
    activeSprintPhase: "WORKSHOP",
    kpis: [
      { metric: "Revenue/Employee", value: 2.86, unit: "MNOK", trend: "STABLE", status: "WARNING" },
    ],
    risks: ["Generational cliff"],
  };

  it("renders company overview", () => {
    const output = renderCompanyOverview(mockCompany);
    expect(output).toContain("Systemregnskap AS");
    expect(output).toContain("8 / 12");
    expect(output).toContain("Generational cliff");
  });

  it("renders process health", () => {
    const output = renderProcessHealth([mockCompany]);
    expect(output).toContain("Process Health");
    expect(output).toContain("12 processes");
  });

  it("renders gap tracker", () => {
    const output = renderGapTracker([mockCompany]);
    expect(output).toContain("Gap Tracker");
    expect(output).toContain("5 open");
  });

  it("renders sprint status", () => {
    const sprints: SprintCard[] = [
      {
        companyId: "1",
        sprintNumber: 1,
        phase: "WORKSHOP",
        status: "IN_PROGRESS",
        automationsPlanned: 3,
        automationsCompleted: 1,
        blockers: ["Missing data"],
      },
    ];
    const output = renderSprintStatus(sprints);
    expect(output).toContain("Sprint 1");
    expect(output).toContain("Missing data");
  });

  it("handles empty sprint list", () => {
    const output = renderSprintStatus([]);
    expect(output).toContain("No active sprints");
  });
});
