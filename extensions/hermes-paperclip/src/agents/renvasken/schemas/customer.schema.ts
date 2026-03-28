import { z } from "zod";

/** Customer/client record schema. */
export const CustomerSchema = z.object({
  orgNr: z.string().regex(/^\d{9}$/, "Org.nr must be exactly 9 digits"),
  companyName: z.string().min(1, "Company name required"),
  address: z.string().optional(),
  postalCode: z
    .string()
    .regex(/^\d{4}$/, "Postal code must be 4 digits")
    .optional(),
  city: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  naceCode: z.string().optional(),
  status: z.enum(["active", "inactive", "dissolved", "bankrupt"]).optional(),
  brregFetchedAt: z.string().datetime().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
