import { z } from "zod";

/**
 * Paperclip orchestration layer.
 *
 * Follows patterns from the Paperclip platform (github.com/robinshood/paperclip):
 * - Company-level org chart with agents as "employees"
 * - Budget tracking (API costs, LLM token usage)
 * - Goal alignment (agent goals tied to business outcomes)
 * - Heartbeat scheduling for autonomous agent execution
 * - Audit trail (every decision logged with reasoning chain)
 */

// --- Agent Roles (Org Chart) ---

export const AgentRole = {
  OPERATIONS_MANAGER: "operations-manager",
  INTELLIGENCE: "intelligence", // Hermes
  INTEGRATION: "integration", // Paperclip
  DASHBOARD: "dashboard", // Mission Control
} as const;
export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];

export const AgentStatusEnum = {
  ACTIVE: "active",
  PAUSED: "paused",
  BUDGET_BLOCKED: "budget-blocked",
  ARCHIVED: "archived",
} as const;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["operations-manager", "intelligence", "integration", "dashboard"]),
  status: z.string().default("active"),
  reportsTo: z.string().nullable(),
  companyId: z.string(),
  goalId: z.string().optional(),
  budgetMonthlyCents: z.number().int().nonnegative().optional(),
  spentMonthlyCents: z.number().int().nonnegative().default(0),
  heartbeatCron: z.string().optional(),
  instructions: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Agent = z.infer<typeof AgentSchema>;

// --- Company Org Chart ---

export const OrgChartSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  description: z.string().optional(),
  agents: z.array(AgentSchema),
  budgetMonthlyCents: z.number().int().nonnegative(),
  spentMonthlyCents: z.number().int().nonnegative().default(0),
  status: z.string().default("active"),
  createdAt: z.string().datetime(),
});
export type OrgChart = z.infer<typeof OrgChartSchema>;

/**
 * Creates the default Ett Capital org chart with Hermes + Paperclip agents.
 */
export function createDefaultOrgChart(companyId: string, companyName: string): OrgChart {
  const now = new Date().toISOString();
  return {
    companyId,
    companyName,
    description: `Ett Capital portfolio company: ${companyName}`,
    budgetMonthlyCents: 50000, // $500/month default budget
    spentMonthlyCents: 0,
    status: "active",
    createdAt: now,
    agents: [
      {
        id: `${companyId}-hermes`,
        name: "Hermes",
        role: AgentRole.INTELLIGENCE,
        status: "active",
        reportsTo: null, // Reports to Operations Manager (human)
        companyId,
        heartbeatCron: "0 6 * * 1", // Weekly Monday 06:00 UTC
        instructions:
          "Monitor portfolio company KPIs, detect anomalies, generate intelligence reports",
        createdAt: now,
      },
      {
        id: `${companyId}-paperclip`,
        name: "Paperclip",
        role: AgentRole.INTEGRATION,
        status: "active",
        reportsTo: null,
        companyId,
        heartbeatCron: "0 8 * * 1-5", // Weekdays 08:00 UTC
        instructions:
          "Execute gap analysis, run integration sprints, build automations via Karpathy loop",
        createdAt: now,
      },
      {
        id: `${companyId}-mission-control`,
        name: "Mission Control",
        role: AgentRole.DASHBOARD,
        status: "active",
        reportsTo: null,
        companyId,
        heartbeatCron: "0 7 * * 1", // Weekly Monday 07:00 UTC
        instructions:
          "Aggregate findings from Hermes and Paperclip, update dashboard, generate weekly reports",
        createdAt: now,
      },
    ],
  };
}

// --- Budget Tracking ---

export const BudgetStatus = {
  OK: "ok",
  WARNING: "warning", // > 80% spent
  SOFT_STOP: "soft-stop", // > 95% spent
  HARD_STOP: "hard-stop", // >= 100% spent
} as const;

export const CostEventSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  companyId: z.string(),
  costCents: z.number().int().nonnegative(),
  tokenCount: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  description: z.string(),
  occurredAt: z.string().datetime(),
});
export type CostEvent = z.infer<typeof CostEventSchema>;

/**
 * Evaluates budget status based on spending vs limit.
 */
export function evaluateBudgetStatus(spentCents: number, budgetCents: number): string {
  if (budgetCents <= 0) return BudgetStatus.OK;
  const ratio = spentCents / budgetCents;
  if (ratio >= 1.0) return BudgetStatus.HARD_STOP;
  if (ratio >= 0.95) return BudgetStatus.SOFT_STOP;
  if (ratio >= 0.8) return BudgetStatus.WARNING;
  return BudgetStatus.OK;
}

/**
 * Checks if an agent is blocked from executing due to budget constraints.
 */
export function isAgentBlocked(agent: Agent): boolean {
  if (agent.status === AgentStatusEnum.BUDGET_BLOCKED || agent.status === AgentStatusEnum.PAUSED) {
    return true;
  }
  if (agent.budgetMonthlyCents !== undefined && agent.budgetMonthlyCents > 0) {
    const status = evaluateBudgetStatus(agent.spentMonthlyCents, agent.budgetMonthlyCents);
    return status === BudgetStatus.HARD_STOP;
  }
  return false;
}

// --- Goal Alignment ---

export const GoalLevel = {
  COMPANY: "company",
  AGENT: "agent",
  TASK: "task",
} as const;

export const GoalSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  level: z.enum(["company", "agent", "task"]),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "paused"]),
  parentId: z.string().nullable(),
  assignedAgentId: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Goal = z.infer<typeof GoalSchema>;

/**
 * Creates default company-level goals for a portfolio company.
 */
export function createDefaultGoals(companyId: string): Goal[] {
  const now = new Date().toISOString();
  return [
    {
      id: `${companyId}-goal-intelligence`,
      companyId,
      level: GoalLevel.COMPANY,
      title: "Complete company intelligence profile",
      description: "Map all processes, infrastructure, stakeholders, and risks",
      status: "active",
      parentId: null,
      createdAt: now,
    },
    {
      id: `${companyId}-goal-integration`,
      companyId,
      level: GoalLevel.COMPANY,
      title: "Close all automation gaps",
      description: "Identify, plan, and execute automations for uncovered processes",
      status: "active",
      parentId: null,
      createdAt: now,
    },
    {
      id: `${companyId}-goal-monitoring`,
      companyId,
      level: GoalLevel.COMPANY,
      title: "Establish continuous monitoring",
      description: "KPI tracking, anomaly detection, and weekly reporting",
      status: "active",
      parentId: null,
      createdAt: now,
    },
  ];
}

// --- Heartbeat Scheduling ---

export const HeartbeatRunSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  companyId: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  status: z.enum(["running", "completed", "failed", "cancelled"]),
  summary: z.string().optional(),
  costCents: z.number().int().nonnegative().optional(),
  tokenCount: z.number().int().nonnegative().optional(),
});
export type HeartbeatRun = z.infer<typeof HeartbeatRunSchema>;

// --- Activity Log (Audit Trail) ---

export const ActivityLogSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  agentId: z.string().optional(),
  action: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime(),
});
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
