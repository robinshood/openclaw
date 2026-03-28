import { z } from "zod";

/** Employee record schema. */
export const EmployeeSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  departmentId: z.number().int().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  startDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date")
    .optional(),
  active: z.boolean().default(true),
});

export type Employee = z.infer<typeof EmployeeSchema>;
