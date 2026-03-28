import { z } from "zod";

export const ServiceTier = {
  BASIC: "BASIC",
  STANDARD: "STANDARD",
  PREMIUM: "PREMIUM",
} as const;

export const CostAllocationSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  monthlyCost: z.number().nonnegative(),
  currency: z.string().default("NOK"),
  armsLengthVerified: z.boolean(),
  verificationNote: z.string().optional(),
});
export type CostAllocation = z.infer<typeof CostAllocationSchema>;

export const SlaSchema = z.object({
  metric: z.string(),
  target: z.string(),
  currentValue: z.string().optional(),
  compliant: z.boolean().optional(),
});
export type Sla = z.infer<typeof SlaSchema>;

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  slas: z.array(SlaSchema),
  companies: z.array(z.string()),
  costAllocations: z.array(CostAllocationSchema),
  active: z.boolean().default(true),
});
export type Service = z.infer<typeof ServiceSchema>;

export const ServiceCatalogSchema = z.object({
  services: z.array(ServiceSchema),
  lastUpdated: z.string().datetime(),
});
export type ServiceCatalog = z.infer<typeof ServiceCatalogSchema>;
