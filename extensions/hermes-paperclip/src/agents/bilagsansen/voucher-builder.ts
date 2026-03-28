/**
 * Bilagsansen — Build Tripletex voucher payloads from classified transactions.
 */

import type { TripletexVoucher } from "../../shared/types.ts";
import type { Classification } from "./classifier.ts";

export interface ClassifiedTransaction {
  id: string;
  date: string;
  merchantName: string;
  amount: number;
  classification: Classification;
  employeeId?: number;
  departmentId?: number;
}

/**
 * Build a Tripletex voucher from a classified transaction.
 */
export function buildVoucher(tx: ClassifiedTransaction): TripletexVoucher {
  return {
    date: tx.date,
    description: `${tx.merchantName} — ${tx.classification.description}`,
    postings: [
      {
        accountId: tx.classification.accountNr,
        amount: Math.abs(tx.amount),
        amountCurrency: Math.abs(tx.amount),
        description: tx.merchantName,
        vatCode: tx.classification.mvaRate,
        departmentId: tx.departmentId,
      },
      // Counter-posting to credit card liability account
      {
        accountId: 2900, // Annen kortsiktig gjeld (credit card)
        amount: -Math.abs(tx.amount),
        amountCurrency: -Math.abs(tx.amount),
        description: tx.merchantName,
      },
    ],
  };
}

/**
 * Build vouchers for a batch of classified transactions.
 * Separates into auto-approve (GREEN) and manual-review (YELLOW/RED) queues.
 */
export function buildVoucherBatch(transactions: ClassifiedTransaction[]): {
  autoApprove: Array<{ transaction: ClassifiedTransaction; voucher: TripletexVoucher }>;
  manualReview: Array<{ transaction: ClassifiedTransaction; voucher: TripletexVoucher }>;
  escalate: ClassifiedTransaction[];
} {
  const autoApprove: Array<{ transaction: ClassifiedTransaction; voucher: TripletexVoucher }> = [];
  const manualReview: Array<{ transaction: ClassifiedTransaction; voucher: TripletexVoucher }> = [];
  const escalate: ClassifiedTransaction[] = [];

  for (const tx of transactions) {
    if (tx.classification.confidence === "RED") {
      escalate.push(tx);
      continue;
    }

    const voucher = buildVoucher(tx);

    if (tx.classification.confidence === "GREEN") {
      autoApprove.push({ transaction: tx, voucher });
    } else {
      manualReview.push({ transaction: tx, voucher });
    }
  }

  return { autoApprove, manualReview, escalate };
}
