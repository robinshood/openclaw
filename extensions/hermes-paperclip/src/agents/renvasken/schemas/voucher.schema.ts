import { z } from "zod";

/** Tripletex voucher schema — Bokføringsloven §5 compliance. */
export const VoucherSchema = z.object({
  date: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  description: z.string().min(1, "Description required per Bokføringsloven §5"),
  voucherNumber: z.number().int().positive().optional(),
  postings: z
    .array(
      z.object({
        accountNr: z
          .number()
          .int()
          .min(1000, "Account number must be 4 digits")
          .max(9999, "Account number must be 4 digits"),
        amount: z.number().refine((n) => n !== 0, "Amount cannot be zero"),
        amountCurrency: z.number().optional(),
        description: z.string().optional(),
        mvaCode: z
          .number()
          .refine((n) => [0, 12, 15, 25].includes(n), "MVA rate must be 0, 12, 15, or 25")
          .optional(),
        departmentId: z.number().int().optional(),
      }),
    )
    .min(1, "Voucher must have at least one posting"),
});

export type Voucher = z.infer<typeof VoucherSchema>;
