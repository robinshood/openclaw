import { z } from "zod";

export const AlertSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const AlertSource = {
  HERMES: "hermes",
  PAPERCLIP: "paperclip",
  MISSION_CONTROL: "mission-control",
} as const;
export type AlertSource = (typeof AlertSource)[keyof typeof AlertSource];

export const AlertSchema = z.object({
  id: z.string(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  source: z.enum(["hermes", "paperclip", "mission-control"]),
  message: z.string(),
  timestamp: z.string().datetime(),
  acknowledged: z.boolean().default(false),
  companyId: z.string().optional(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const KpiCardSchema = z.object({
  metric: z.string(),
  value: z.number(),
  unit: z.string(),
  trend: z.enum(["UP", "DOWN", "STABLE"]),
  threshold: z.number().optional(),
  status: z.enum(["OK", "WARNING", "CRITICAL"]),
});
export type KpiCard = z.infer<typeof KpiCardSchema>;

export const CompanyCardSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  status: z.string(),
  processesTotal: z.number(),
  processesMapped: z.number(),
  gapsIdentified: z.number(),
  gapsClosed: z.number(),
  activeSprintPhase: z.string().optional(),
  kpis: z.array(KpiCardSchema),
  risks: z.array(z.string()),
});
export type CompanyCard = z.infer<typeof CompanyCardSchema>;

export const SprintCardSchema = z.object({
  companyId: z.string(),
  sprintNumber: z.number(),
  phase: z.string(),
  status: z.string(),
  automationsPlanned: z.number(),
  automationsCompleted: z.number(),
  blockers: z.array(z.string()),
});
export type SprintCard = z.infer<typeof SprintCardSchema>;

export const DashboardStateSchema = z.object({
  companies: z.array(CompanyCardSchema),
  alerts: z.array(AlertSchema),
  sprints: z.array(SprintCardSchema),
  portfolioKpis: z.array(KpiCardSchema),
  lastUpdated: z.string().datetime(),
});
export type DashboardState = z.infer<typeof DashboardStateSchema>;
