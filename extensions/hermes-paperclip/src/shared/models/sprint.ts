import { z } from "zod";

export const SprintPhase = {
  WORKSHOP: "WORKSHOP",
  POC: "POC",
  MVP: "MVP",
  SCALE: "SCALE",
} as const;

export const SprintStatus = {
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  GO: "GO",
  NO_GO: "NO_GO",
  COMPLETED: "COMPLETED",
} as const;

export const AutomationSchema = z.object({
  gapId: z.string(),
  description: z.string(),
  approach: z.string(),
  iterationsUsed: z.number().int().min(0).max(3).optional(),
  evalPassed: z.boolean().optional(),
});

export const GoNoGoCriteriaSchema = z.object({
  criterion: z.string(),
  threshold: z.string(),
  actualValue: z.string().optional(),
  met: z.boolean().optional(),
});

export const SprintSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  phase: z.enum(["WORKSHOP", "POC", "MVP", "SCALE"]),
  durationWeeks: z.number().default(2),
  goals: z.array(z.string()),
  automations: z.array(AutomationSchema),
  goNoGoCriteria: z.array(GoNoGoCriteriaSchema),
  status: z.enum(["PLANNED", "IN_PROGRESS", "GO", "NO_GO", "COMPLETED"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  retrospectiveNotes: z.string().optional(),
});
export type Sprint = z.infer<typeof SprintSchema>;

export const SprintPlanSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  sprints: z.array(SprintSchema),
  maxIterationsPerAutomation: z.number().default(3),
  createdAt: z.string().datetime(),
});
export type SprintPlan = z.infer<typeof SprintPlanSchema>;
