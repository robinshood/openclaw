import { z } from "zod";

/** Bank/credit card transaction schema. */
export const TransactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  amount: z.number().refine((n) => n !== 0, "Transaction amount cannot be zero"),
  description: z.string().min(1, "Transaction description required"),
  merchantName: z.string().optional(),
  accountNumber: z.string().optional(),
  currency: z.string().default("NOK"),
  reconciled: z.boolean().default(false),
});

export type Transaction = z.infer<typeof TransactionSchema>;
