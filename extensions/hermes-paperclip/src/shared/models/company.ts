import { z } from "zod";

export const RiskSchema = z.object({
  type: z.string(),
  description: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  mitigationStrategy: z.string().optional(),
});
export type Risk = z.infer<typeof RiskSchema>;

export const BoardMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  since: z.string().optional(),
});
export type BoardMember = z.infer<typeof BoardMemberSchema>;

export const EmployeeSchema = z.object({
  name: z.string(),
  role: z.string(),
  age: z.number().optional(),
  knowledgeDomains: z.array(z.string()).optional(),
  retirementRisk: z.boolean().optional(),
  keyPerson: z.boolean().optional(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

export const CompanySchema = z.object({
  orgNumber: z.string().regex(/^\d{9}$/, "Norwegian org number must be 9 digits"),
  name: z.string().min(1),
  sector: z.string(),
  revenue: z.number().nonnegative(),
  currency: z.string().default("NOK"),
  employeeCount: z.number().int().nonnegative(),
  customerCount: z.number().int().nonnegative().optional(),
  board: z.array(BoardMemberSchema).optional(),
  employees: z.array(EmployeeSchema).optional(),
  risks: z.array(RiskSchema).optional(),
  revenuePerEmployee: z.number().optional(),
  efficiencyNotes: z.string().optional(),
  dataSource: z.string(),
  lastUpdated: z.string().datetime(),
});
export type Company = z.infer<typeof CompanySchema>;
